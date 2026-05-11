import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { studyApi } from '@/shared/api/api-legacy';
import type { CardItem, DeckItem } from '@/shared/api/types';
import { useSpeech } from '@/shared/hooks/useSpeech';
import { useApiQuery } from '@/shared/lib/query';

interface ModeResult {
  cardId: number;
  correct: boolean;
}

interface ModeProps {
  cards: CardItem[];
  deck: DeckItem;
  sessionId: number | null;
  onComplete: (results: ModeResult[]) => void;
}

const navArrowClasses = tw`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-text transition-colors duration-200 hover:not-disabled:border-brand hover:not-disabled:text-brand-light disabled:cursor-not-allowed disabled:opacity-30`;
const sceneClasses = tw`relative w-full cursor-pointer [perspective:1500px]`;
const innerClasses = tw`relative h-[420px] w-full transition-transform duration-700 [transform-style:preserve-3d]`;
const innerFlipped = tw`[transform:rotateY(180deg)]`;
const faceClasses = tw`absolute inset-0 flex flex-col items-center justify-center rounded-[24px] border border-border p-8 [backface-visibility:hidden]`;
const faceFront = tw`bg-surface text-text`;
const faceBack = tw`bg-gradient-to-br from-brand to-accent text-white [transform:rotateY(180deg)]`;
const choiceBtnBase = tw`cursor-pointer rounded-[14px] border border-border px-5 py-4 text-left text-[15px] transition-colors duration-200`;

function sendAnswer(
  sessionId: number | null,
  cardId: number,
  correct: boolean,
  rating?: number,
) {
  if (!sessionId) return;
  const r = rating ?? (correct ? 4 : 1);
  studyApi
    .recordAnswer(sessionId, { cardId, correct, rating: r })
    .catch(() => {});
}

interface ProgressRowProps {
  idx: number;
  total: number;
  withPct?: boolean;
  className?: string;
}
function ProgressRow({ idx, total, withPct, className }: ProgressRowProps) {
  const progress = (idx / total) * 100;
  return (
    <div className={cn('mb-5 flex items-center gap-3', className)}>
      <span className='text-text2 min-w-[64px] text-sm font-semibold'>
        {idx + 1} / {total}
      </span>
      <div className='progress-bar flex-1'>
        <div className='progress-fill' style={{ width: `${progress}%` }} />
      </div>
      {withPct && (
        <span className='text-text2 min-w-[48px] text-right text-sm font-semibold'>
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}

function FlashcardMode({ cards, deck, sessionId, onComplete }: ModeProps) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<ModeResult[]>([]);
  const { speak } = useSpeech();
  const card = cards[idx];

  const answer = (correct: boolean, srsRating?: number) => {
    const rating = srsRating ?? (correct ? 4 : 1);
    sendAnswer(sessionId, card.id, correct, rating);
    const next = [
      ...results.filter((r) => r.cardId !== card.id),
      { cardId: card.id, correct },
    ];
    setResults(next);
    setFlipped(false);
    setTimeout(() => {
      if (idx + 1 >= cards.length) onComplete(next);
      else setIdx((i) => i + 1);
    }, 200);
  };

  const goPrevCard = () => {
    if (idx <= 0) return;
    setIdx((i) => i - 1);
    setFlipped(false);
  };

  const goNextCard = () => {
    if (idx >= cards.length - 1) return;
    setIdx((i) => i + 1);
    setFlipped(false);
  };

  useEffect(() => {
    if (flipped) speak(card.definition, deck.targetLanguage);
    else speak(card.term, deck.sourceLanguage);
  }, [flipped, card, deck.sourceLanguage, deck.targetLanguage, speak]);

  useFlashcardKeyboard({
    flipped,
    onFlip: () => setFlipped((f) => !f),
    onPrevCard: goPrevCard,
    onNextCard: goNextCard,
    onHard: () => answer(false, 1),
    onEasy: () => answer(true, 4),
  });

  const ANSWER_OPTIONS = [
    {
      label: t('landing.hard'),
      correct: false,
      srsRating: 1 as const,
      color: 'var(--danger)',
      bg: 'rgba(239,68,68,0.1)',
    },
    {
      label: t('landing.okay'),
      correct: true,
      srsRating: 3 as const,
      color: 'var(--warning)',
      bg: 'rgba(245,158,11,0.1)',
    },
    {
      label: t('landing.easy'),
      correct: true,
      srsRating: 4 as const,
      color: 'var(--success)',
      bg: 'rgba(16,185,129,0.1)',
    },
  ];

  return (
    <div className='mx-auto w-full max-w-[760px]'>
      <div className='flex items-center gap-4 max-[640px]:gap-2'>
        <button
          type='button'
          className={navArrowClasses}
          onClick={goPrevCard}
          disabled={idx <= 0}
          aria-label={t('study.flashcard.prevCard')}
        >
          <ChevronLeft size={28} strokeWidth={2.25} aria-hidden />
        </button>

        <div className='flex min-w-0 flex-1 flex-col'>
          <ProgressRow idx={idx} total={cards.length} withPct />

          <div className='mb-4'>
            <div className={sceneClasses} onClick={() => setFlipped((f) => !f)}>
              <div className={cn(innerClasses, flipped && innerFlipped)}>
                <div className={cn(faceClasses, faceFront)}>
                  <div className='text-text3 mb-3 text-xs tracking-[0.08em] uppercase'>
                    {t('study.flashcard.reveal', { lang: deck.sourceLanguage })}
                  </div>
                  {card.termImageUrl && (
                    <img
                      src={card.termImageUrl}
                      alt={card.term}
                      className='mb-4 max-h-[120px] rounded-[12px] object-cover'
                    />
                  )}
                  <div className='font-display text-center text-[44px] leading-[1.1] font-bold'>
                    {card.term}
                  </div>
                  {card.transcription && (
                    <div className='text-text3 mt-2 text-sm'>
                      {card.transcription}
                    </div>
                  )}
                  {card.example && (
                    <div className='text-text3 mt-3 text-sm italic'>
                      &ldquo;{card.example}&rdquo;
                    </div>
                  )}
                  <div className='text-text3 mt-auto pt-4 text-xs'>
                    {t('study.flashcard.flipHint')}
                  </div>
                </div>

                <div className={cn(faceClasses, faceBack)}>
                  <div className='mb-3 text-xs tracking-[0.08em] uppercase opacity-80'>
                    {t('study.flashcard.translationLabel', {
                      lang: deck.targetLanguage,
                    })}
                  </div>
                  {(card.definitionImageUrl || card.termImageUrl) && (
                    <img
                      src={card.definitionImageUrl || card.termImageUrl || ''}
                      alt={card.definition}
                      className='mb-4 max-h-[120px] rounded-[12px] object-cover'
                    />
                  )}
                  <div className='font-display text-center text-[40px] leading-[1.1] font-bold'>
                    {card.definition}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className='text-text3 mb-4 text-center text-xs'>
            {t('study.flashcard.keyboardHint')}
          </p>

          {flipped && (
            <div className='animate-fade grid grid-cols-3 gap-3 max-[640px]:grid-cols-1'>
              {ANSWER_OPTIONS.map(
                ({ label, correct, srsRating, color, bg }) => {
                  const style: CSSProperties = {
                    background: bg,
                    border: `1px solid ${color}44`,
                    color,
                  };
                  return (
                    <button
                      key={label}
                      type='button'
                      onClick={() => answer(correct, srsRating)}
                      className='cursor-pointer rounded-[14px] px-5 py-3 text-base font-semibold transition-transform duration-200 hover:-translate-y-0.5'
                      style={style}
                    >
                      {label}
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        <button
          type='button'
          className={navArrowClasses}
          onClick={goNextCard}
          disabled={idx >= cards.length - 1}
          aria-label={t('study.flashcard.nextCard')}
        >
          <ChevronRight size={28} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function LearnMode({ cards, deck, sessionId, onComplete }: ModeProps) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<ModeResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const { speak } = useSpeech();

  const card = cards[idx];

  const makeChoices = useCallback(() => {
    const wrong = cards
      .filter((_: Any, i: number) => i !== idx)
      .map((c: CardItem) => c.definition);
    const shuffledWrong = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [...shuffledWrong, card.definition].sort(
      () => Math.random() - 0.5,
    );
    setChoices(all);
    setSelected(null);
    setShowResult(false);
  }, [idx, cards, card]);

  useEffect(() => {
    makeChoices();
    speak(card.term, deck.sourceLanguage);
  }, [idx, makeChoices, card.term, deck.sourceLanguage, speak]);

  const handleChoice = (choice: string) => {
    if (selected) return;
    const correct = choice === card.definition;
    sendAnswer(sessionId, card.id, correct);
    setSelected(choice);
    setShowResult(true);
    setTimeout(() => {
      const next = [...results, { cardId: card.id, correct }];
      setResults(next);
      if (idx + 1 >= cards.length) onComplete(next);
      else setIdx((i) => i + 1);
    }, 1000);
  };

  const choiceStyle = (choice: string): CSSProperties => {
    let bg = 'var(--surface)';
    let border = 'var(--border)';
    let color = 'var(--text)';
    if (selected === choice) {
      const correct = choice === card.definition;
      bg = correct ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
      border = correct ? 'var(--success)' : 'var(--danger)';
      color = correct ? 'var(--success)' : 'var(--danger)';
    } else if (showResult && choice === card.definition) {
      bg = 'rgba(16,185,129,0.15)';
      border = 'var(--success)';
      color = 'var(--success)';
    }
    return {
      background: bg,
      border: `1px solid ${border}`,
      color,
      cursor: selected ? 'default' : 'pointer',
    };
  };

  return (
    <div className='mx-auto w-full max-w-[640px]'>
      <ProgressRow idx={idx} total={cards.length} />

      <div className='border-border bg-surface mb-7 rounded-[20px] border p-7 text-center'>
        <div className='text-text3 mb-3 text-xs tracking-[0.08em] uppercase'>
          {t('study.learn.prompt')}
        </div>
        {card.termImageUrl && (
          <img
            src={card.termImageUrl}
            alt={card.term}
            className='mx-auto mb-4 max-h-[120px] rounded-[12px] object-cover'
          />
        )}
        <div className='font-display text-3xl font-bold'>{card.term}</div>
        {card.transcription && (
          <div className='text-text3 mt-2 text-sm'>{card.transcription}</div>
        )}
        <div className='mt-4 flex justify-center gap-2'>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => speak(card.term, deck.sourceLanguage)}
          >
            {t('study.learn.listen')}
          </button>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() =>
              speak(card.term, deck.sourceLanguage, { slow: true })
            }
          >
            {t('study.learn.listenSlow')}
          </button>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        {choices.map((choice) => (
          <button
            key={choice}
            type='button'
            onClick={() => handleChoice(choice)}
            className={choiceBtnBase}
            style={choiceStyle(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SpellPrompt {
  cardId: number;
  question: string;
  answer: string;
  questionLang: string;
  answerLang: string;
  questionImageUrl?: string;
  direction: 'forward' | 'reverse';
}

function buildSpellPrompts(cards: CardItem[], deck: DeckItem): SpellPrompt[] {
  const all: SpellPrompt[] = [];
  cards.forEach((c: CardItem) => {
    all.push({
      cardId: c.id,
      question: c.term,
      answer: c.definition,
      questionLang: deck.sourceLanguage,
      answerLang: deck.targetLanguage,
      questionImageUrl: c.termImageUrl || c.definitionImageUrl || undefined,
      direction: 'forward',
    });
    all.push({
      cardId: c.id,
      question: c.definition,
      answer: c.term,
      questionLang: deck.targetLanguage,
      answerLang: deck.sourceLanguage,
      questionImageUrl: c.definitionImageUrl || c.termImageUrl || undefined,
      direction: 'reverse',
    });
  });

  const shuffled = all.sort(() => Math.random() - 0.5);

  for (let i = 1; i < shuffled.length; i++) {
    if (shuffled[i].cardId === shuffled[i - 1].cardId) {
      const swap = shuffled.findIndex(
        (p, j) =>
          j > i &&
          p.cardId !== shuffled[i - 1].cardId &&
          p.cardId !== shuffled[i].cardId,
      );
      if (swap !== -1) {
        [shuffled[i], shuffled[swap]] = [shuffled[swap], shuffled[i]];
      }
    }
  }
  return shuffled;
}

function normalizeAnswer(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, ' ')
    .trim();
}

function SpellMode({ cards, deck, sessionId, onComplete }: ModeProps) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ModeResult[]>([]);
  const { speak } = useSpeech();

  const [prompts] = useState<SpellPrompt[]>(() =>
    buildSpellPrompts(cards, deck),
  );
  const prompt = prompts[idx];

  useEffect(() => {
    setInput('');
    setSubmitted(false);
    speak(prompt.question, prompt.questionLang);
  }, [idx, prompt.question, prompt.questionLang, speak]);

  const isCorrect = normalizeAnswer(input) === normalizeAnswer(prompt.answer);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const correct = isCorrect;
    sendAnswer(sessionId, prompt.cardId, correct);
    setSubmitted(true);
    setTimeout(() => {
      const next = [...results, { cardId: prompt.cardId, correct }];
      setResults(next);
      if (idx + 1 >= prompts.length) onComplete(next);
      else setIdx((i) => i + 1);
    }, 1200);
  };

  const inputStyle: CSSProperties = submitted
    ? {
        background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        borderColor: isCorrect ? 'var(--success)' : 'var(--danger)',
      }
    : {};

  return (
    <div className='mx-auto w-full max-w-[600px]'>
      <ProgressRow idx={idx} total={prompts.length} />

      <div className='border-border bg-surface mb-7 rounded-[20px] border p-7 text-center'>
        <div className='text-text3 mb-3 text-xs tracking-[0.08em] uppercase'>
          {t('study.spell.promptDir', {
            from: prompt.questionLang,
            to: prompt.answerLang,
          })}
        </div>
        {prompt.questionImageUrl && (
          <img
            src={prompt.questionImageUrl}
            alt={prompt.question}
            className='mx-auto mb-4 max-h-[120px] rounded-[12px] object-cover'
          />
        )}
        <div className='font-display text-3xl font-bold'>{prompt.question}</div>
        <div className='mt-4 flex justify-center gap-2'>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => speak(prompt.question, prompt.questionLang)}
          >
            {t('study.spell.hear')}
          </button>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() =>
              speak(prompt.question, prompt.questionLang, { slow: true })
            }
          >
            {t('study.spell.hearSlow')}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          key={idx}
          className='input-field text-center text-xl'
          value={input}
          onChange={(e) => !submitted && setInput(e.target.value)}
          placeholder={t('study.spell.placeholder', {
            lang: prompt.answerLang,
          })}
          style={inputStyle}
          disabled={submitted}
          autoFocus
        />
        {submitted && !isCorrect && (
          <div className='mt-3 text-center'>
            <span className='text-text3 text-sm'>
              {t('study.spell.correctAnswer')}{' '}
            </span>
            <span className='text-success text-base font-semibold'>
              {prompt.answer}
            </span>
          </div>
        )}
        {!submitted && (
          <button
            type='submit'
            className='btn btn-primary mt-4 w-full justify-center'
          >
            {t('study.spell.check')}
          </button>
        )}
      </form>
    </div>
  );
}

function MatchMode({ cards, sessionId, onComplete }: ModeProps) {
  const { t } = useTranslation();
  const [slicedCards] = useState(() => cards.slice(0, 8));
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{
    type: 'term' | 'def';
    idx: number;
  } | null>(null);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [missedPairs, setMissedPairs] = useState<Set<number>>(new Set());

  const terms = slicedCards.map((c: Any, i: number) => ({
    text: c.term,
    id: i,
  }));
  const [shuffledDefs] = useState(() =>
    [...slicedCards]
      .sort(() => Math.random() - 0.5)
      .map((c: CardItem) => ({
        text: c.definition,
        originalIdx: slicedCards.indexOf(c),
      })),
  );

  const handleSelect = (
    type: 'term' | 'def',
    idx: number,
    originalIdx?: number,
  ) => {
    const key = type === 'term' ? `t${idx}` : `d${idx}`;
    if (matched.has(type === 'term' ? `pair${idx}` : `pair${originalIdx}`))
      return;

    if (!selected) {
      setSelected({ type, idx });
      return;
    }
    if (selected.type === type) {
      setSelected({ type, idx });
      return;
    }

    const termIdx = type === 'term' ? idx : selected.idx;
    const defOrigIdx =
      type === 'def' ? originalIdx! : shuffledDefs[selected.idx].originalIdx;

    if (termIdx === defOrigIdx) {
      const newMatched = new Set(matched);
      newMatched.add(`pair${termIdx}`);
      setMatched(newMatched);
      setSelected(null);
      if (newMatched.size === slicedCards.length) {
        setTimeout(() => {
          const finalResults: ModeResult[] = slicedCards.map(
            (c: Any, i: number) => {
              const correct = !missedPairs.has(i);
              sendAnswer(sessionId, c.id, correct);
              return { cardId: c.id, correct };
            },
          );
          onComplete(finalResults);
        }, 500);
      }
    } else {
      setMissedPairs((prev) => {
        const next = new Set(prev);
        next.add(termIdx);
        next.add(defOrigIdx);
        return next;
      });
      const wrongKey1 =
        selected.type === 'term' ? `t${selected.idx}` : `d${selected.idx}`;
      setWrong(new Set([wrongKey1, key]));
      setTimeout(() => {
        setWrong(new Set());
        setSelected(null);
      }, 800);
    }
  };

  const getCardStyle = (
    sel: boolean,
    mat: boolean,
    wr: boolean,
  ): CSSProperties => ({
    background: mat
      ? 'rgba(16,185,129,0.15)'
      : wr
        ? 'rgba(239,68,68,0.1)'
        : sel
          ? 'rgba(124,58,237,0.2)'
          : 'var(--surface)',
    border: `1px solid ${
      mat
        ? 'var(--success)'
        : wr
          ? 'var(--danger)'
          : sel
            ? 'var(--brand)'
            : 'var(--border)'
    }`,
    color: mat ? 'var(--success)' : wr ? 'var(--danger)' : 'var(--text)',
    cursor: mat ? 'default' : 'pointer',
    opacity: mat ? 0.6 : 1,
    textDecoration: mat ? 'line-through' : 'none',
  });

  const isTermSelected = (i: number) =>
    selected?.type === 'term' && selected.idx === i;
  const isDefSelected = (i: number) =>
    selected?.type === 'def' && selected.idx === i;
  const isTermMatched = (i: number) => matched.has(`pair${i}`);
  const isDefMatched = (i: number) =>
    matched.has(`pair${shuffledDefs[i].originalIdx}`);
  const isTermWrong = (i: number) => wrong.has(`t${i}`);
  const isDefWrong = (i: number) => wrong.has(`d${i}`);

  return (
    <div className='mx-auto w-full max-w-[800px]'>
      <div className='mb-6 text-center'>
        <h2 className='font-display mb-2 text-2xl'>{t('study.match.title')}</h2>
        <p className='text-text2 mb-3 text-sm'>{t('study.match.subtitle')}</p>
        <div className='text-brand-light text-sm font-semibold'>
          {t('study.match.progress', {
            matched: matched.size,
            total: slicedCards.length,
          })}
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
        <div className='flex flex-col gap-2.5'>
          {terms.map((titem: Any, i: number) => (
            <div
              key={i}
              className='rounded-[14px] px-4 py-3.5 text-center font-medium transition-all duration-200'
              style={getCardStyle(
                isTermSelected(i),
                isTermMatched(i),
                isTermWrong(i),
              )}
              onClick={() => !isTermMatched(i) && handleSelect('term', i)}
            >
              {titem.text}
            </div>
          ))}
        </div>
        <div className='flex flex-col gap-2.5'>
          {shuffledDefs.map((d: Any, i: number) => (
            <div
              key={i}
              className='rounded-[14px] px-4 py-3.5 text-center font-medium transition-all duration-200'
              style={getCardStyle(
                isDefSelected(i),
                isDefMatched(i),
                isDefWrong(i),
              )}
              onClick={() =>
                !isDefMatched(i) && handleSelect('def', i, d.originalIdx)
              }
            >
              {d.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ResultScreenProps {
  results: ModeResult[];
  onRetry: () => void;
  onBack: () => void;
}
function ResultScreen({ results, onRetry, onBack }: ResultScreenProps) {
  const { t } = useTranslation();
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const titleKey =
    pct === 100 ? 'perfect' : pct >= 70 ? 'great' : pct >= 50 ? 'good' : 'keep';
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '📖';
  const gradient =
    pct >= 70
      ? 'linear-gradient(135deg, #10B981, #06B6D4)'
      : 'linear-gradient(135deg, #F59E0B, #EF4444)';

  return (
    <div className='animate-scale mx-auto w-full max-w-[520px] text-center'>
      <div className='mb-4 text-[88px]'>{emoji}</div>
      <h2 className='font-display mb-3 text-3xl'>
        {t(`study.result.${titleKey}`)}
      </h2>
      <div
        className='font-display mb-3 bg-clip-text text-[80px] leading-[1] font-extrabold text-transparent'
        style={{ background: gradient, WebkitBackgroundClip: 'text' }}
      >
        {pct}%
      </div>
      <p className='text-text2 mb-6'>
        {t('study.result.scoreLine', { correct, total })}
      </p>

      <div className='mb-6 grid grid-cols-2 gap-3'>
        <div className='rounded-[16px] border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.10)] p-4'>
          <div className='font-display text-success text-3xl font-bold'>
            {correct}
          </div>
          <div className='text-text2 text-sm'>{t('common.correct')}</div>
        </div>
        <div className='rounded-[16px] border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.10)] p-4'>
          <div className='font-display text-danger text-3xl font-bold'>
            {total - correct}
          </div>
          <div className='text-text2 text-sm'>{t('common.toReview')}</div>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        <button
          type='button'
          className='btn btn-secondary w-full justify-center'
          onClick={onBack}
        >
          {t('study.result.backToDeck')}
        </button>
        <button
          type='button'
          className='btn btn-primary w-full justify-center'
          onClick={onRetry}
        >
          {t('study.result.again')}
        </button>
      </div>
    </div>
  );
}

interface FlashcardKeyboardOpts {
  flipped: boolean;
  onFlip: () => void;
  onPrevCard: () => void;
  onNextCard: () => void;
  onHard: () => void;
  onEasy: () => void;
}
function useFlashcardKeyboard({
  flipped,
  onFlip,
  onPrevCard,
  onNextCard,
  onHard,
  onEasy,
}: FlashcardKeyboardOpts) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      )
        return;

      if (e.code === 'Space') {
        e.preventDefault();
        onFlip();
        return;
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (flipped) onHard();
        else onPrevCard();
        return;
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (flipped) onEasy();
        else onNextCard();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, onFlip, onPrevCard, onNextCard, onHard, onEasy]);
}

export function StudyPage() {
  const { t } = useTranslation();
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const navigate = useNavigate();
  const deckId = Number(id);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [phase, setPhase] = useState<'study' | 'result'>('study');
  const [results, setResults] = useState<ModeResult[]>([]);
  const [retryKey, setRetryKey] = useState(0);

  const deckQuery = useApiQuery<DeckItem>({
    queryKey: ['deck', deckId, 'study', retryKey],
    url: `/decks/${deckId}`,
    enabled: Number.isFinite(deckId),
  });
  const deck = deckQuery.data ?? null;
  const loading = deckQuery.isLoading || sessionId === null;

  useEffect(() => {
    const data = deckQuery.data;
    if (!data) return;
    if (!data.cards?.length) {
      toast.error(t('study.noCards'));
      navigate(`/decks/${id}`);
      return;
    }
    setCards([...data.cards].sort(() => Math.random() - 0.5));
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await studyApi.startSession(deckId, mode!);
        if (!cancelled) setSessionId(session.id);
      } catch {
        if (!cancelled) {
          toast.error(t('study.sessionFailed'));
          navigate(`/decks/${id}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckQuery.data, deckId, mode, navigate, id, t]);

  useEffect(() => {
    if (deckQuery.isError) {
      toast.error(t('study.sessionFailed'));
      navigate(`/decks/${id}`);
    }
  }, [deckQuery.isError, navigate, id, t]);

  const handleComplete = async (modeResults: ModeResult[]) => {
    setResults(modeResults);
    setPhase('result');
    if (sessionId) {
      try {
        await studyApi.completeSession(sessionId);
      } catch {
        /* non-fatal */
      }
    }
  };

  const handleRetry = () => {
    setPhase('study');
    setSessionId(null);
    setRetryKey((k) => k + 1);
  };

  const modeLabel =
    mode && ['FLASHCARD', 'LEARN', 'MATCH', 'SPELL'].includes(mode)
      ? t(`study.modesHeader.${mode as 'FLASHCARD'}`)
      : mode;

  if (loading)
    return (
      <div className='flex flex-col items-center gap-3 py-24 text-center'>
        <div className='animate-pulse-soft text-[64px]'>⚡</div>
        <p className='text-text2'>{t('study.loading')}</p>
      </div>
    );

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col'>
      <div className='border-border mb-6 flex flex-wrap items-center gap-3 border-b pb-4'>
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          onClick={() => navigate(`/decks/${id}`)}
        >
          {t('study.exit')}
        </button>
        <div className='font-semibold'>{deck?.title}</div>
        <div className='badge badge-brand'>{modeLabel}</div>
        <div className='text-text3 ml-auto text-sm'>
          {t('study.cardsCount', { count: cards.length })}
        </div>
      </div>

      <div className='flex-1 px-4 py-4'>
        {phase === 'result' ? (
          <ResultScreen
            results={results}
            onRetry={handleRetry}
            onBack={() => navigate(`/decks/${id}`)}
          />
        ) : (
          deck &&
          (() => {
            const props: ModeProps = {
              cards,
              deck,
              sessionId,
              onComplete: handleComplete,
            };
            switch (mode) {
              case 'LEARN':
                return <LearnMode {...props} />;
              case 'MATCH':
                return <MatchMode {...props} />;
              case 'SPELL':
                return <SpellMode {...props} />;
              case 'FLASHCARD':
              default:
                return <FlashcardMode {...props} />;
            }
          })()
        )}
      </div>
    </div>
  );
}
