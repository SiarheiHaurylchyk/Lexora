/**
 * StudyPage — the page where the student practices a deck.
 *
 * The same page handles four study modes (FLASHCARD, LEARN, MATCH, SPELL).
 * Each mode is a small inner component (FlashcardMode, LearnMode, ...) that
 * receives the same `ModeProps` and reports results when the user is done.
 *
 * High-level flow:
 *   1. Load the deck and shuffle its cards.
 *   2. Start a study session on the backend (so the answer history is saved).
 *   3. Render the right mode component.
 *   4. When the mode completes, switch to the result screen.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { deckApi, studyApi } from '../services/api';
import { useSpeech } from '../hooks/useSpeech';
import styles from './StudyPage.module.css';

/** Tiny helper: join class names, dropping falsy entries. */
const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(' ');

/** One answer recorded by a mode for a single card. */
interface ModeResult { cardId: number; correct: boolean; }

/** Props that every mode component accepts. */
interface ModeProps {
  cards: any[];
  deck: any;
  sessionId: number | null;
  onComplete: (results: ModeResult[]) => void;
}

/** Send a single answer to the backend (best-effort, errors are ignored). */
function sendAnswer(sessionId: number | null, cardId: number, correct: boolean, rating?: number) {
  if (!sessionId) return;
  const r = rating ?? (correct ? 4 : 1);
  studyApi.recordAnswer(sessionId, { cardId, correct, rating: r }).catch(() => {});
}

/** Small bar at the top of every mode showing "x / total" and percent done. */
function ProgressRow({
  idx,
  total,
  withPct,
  className,
}: {
  idx: number;
  total: number;
  withPct?: boolean;
  className?: string;
}) {
  const progress = (idx / total) * 100;
  return (
    <div className={cx(styles.progressRow, className)}>
      <span className={styles.progressCount}>{idx + 1} / {total}</span>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      {withPct && <span className={styles.progressPct}>{Math.round(progress)}%</span>}
    </div>
  );
}

/**
 * FlashcardMode — classic flip cards. The user reads the term, flips the card,
 * sees the translation, and rates how hard it was (Hard / Okay / Easy).
 * Keyboard: Space = flip; ← / → before flip = prev/next card; after flip = hard / easy (SRS ratings 1 / 4).
 */
function FlashcardMode({ cards, deck, sessionId, onComplete }: ModeProps) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<ModeResult[]>([]);
  const { speak } = useSpeech();
  const card = cards[idx];

  /** SRS `rating` passed to API: 1 hard (interval reset), 3 okay, 4 easy (longer intervals). */
  const answer = (correct: boolean, srsRating?: number) => {
    const rating = srsRating ?? (correct ? 4 : 1);
    sendAnswer(sessionId, card.id, correct, rating);
    const next = [...results.filter((r) => r.cardId !== card.id), { cardId: card.id, correct }];
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
    { label: t('landing.hard'), correct: false, srsRating: 1 as const, color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)' },
    { label: t('landing.okay'), correct: true, srsRating: 3 as const, color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)' },
    { label: t('landing.easy'), correct: true, srsRating: 4 as const, color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' },
  ];

  return (
    <div className={styles.flashcardLayout}>
      <div className={styles.flashcardRow}>
        <button
          type="button"
          className={cx(styles.navArrow, styles.navArrowPrev)}
          onClick={goPrevCard}
          disabled={idx <= 0}
          aria-label={t('study.flashcard.prevCard')}
        >
          <ChevronLeft size={28} strokeWidth={2.25} aria-hidden />
        </button>

        <div className={styles.flashcardCol}>
          <ProgressRow idx={idx} total={cards.length} withPct className={styles.progressRowFlash} />

          <div className={styles.sceneWrap}>
            <div className={styles.scene} onClick={() => setFlipped((f) => !f)}>
              <div className={cx(styles.inner, flipped && styles.flipped)}>
                <div className={cx(styles.face, styles.front)}>
                  <div className={styles.faceLabel}>{t('study.flashcard.reveal', { lang: deck.sourceLanguage })}</div>
                  {card.termImageUrl && (
                    <img src={card.termImageUrl} alt={card.term} className={styles.faceImage} />
                  )}
                  <div className={styles.faceTerm}>{card.term}</div>
                  {card.transcription && <div className={styles.faceTrans}>{card.transcription}</div>}
                  {card.example && <div className={styles.faceExample}>"{card.example}"</div>}
                  <div className={styles.flipHint}>{t('study.flashcard.flipHint')}</div>
                </div>

                <div className={cx(styles.face, styles.back)}>
                  <div className={cx(styles.faceLabel, styles.faceLabelLight)}>
                    {t('study.flashcard.translationLabel', { lang: deck.targetLanguage })}
                  </div>
                  {(card.definitionImageUrl || card.termImageUrl) && (
                    <img
                      src={card.definitionImageUrl || card.termImageUrl}
                      alt={card.definition}
                      className={styles.faceImage}
                    />
                  )}
                  <div className={cx(styles.faceTerm, styles.faceTermLight)}>{card.definition}</div>
                </div>
              </div>
            </div>
          </div>

          <p className={styles.keyboardHint}>{t('study.flashcard.keyboardHint')}</p>

          {flipped && (
            <div className={`${styles.answerRow} animate-fade`}>
              {ANSWER_OPTIONS.map(({ label, correct, srsRating, color, bg }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => answer(correct, srsRating)}
                  className={styles.answerBtn}
                  style={{ background: bg, border: `1px solid ${color}44`, color }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className={cx(styles.navArrow, styles.navArrowNext)}
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

/**
 * LearnMode — multiple choice. We show one term and four definitions
 * (one correct + three random wrong ones). The user picks one and gets
 * instant feedback before moving to the next card.
 */
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
    const wrong = cards.filter((_: any, i: number) => i !== idx).map((c: any) => c.definition);
    const shuffledWrong = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [...shuffledWrong, card.definition].sort(() => Math.random() - 0.5);
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

  const choiceStyle = (choice: string): React.CSSProperties => {
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
    <div className={styles.modeWrap640}>
      <ProgressRow idx={idx} total={cards.length} />

      <div className={styles.learnPrompt}>
        <div className={styles.learnPromptLabel}>{t('study.learn.prompt')}</div>
        {card.termImageUrl && (
          <img src={card.termImageUrl} alt={card.term} className={styles.learnImage} />
        )}
        <div className={styles.learnTerm}>{card.term}</div>
        {card.transcription && <div className={styles.learnTrans}>{card.transcription}</div>}
        <div className={styles.learnListenRow}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => speak(card.term, deck.sourceLanguage)}
          >
            {t('study.learn.listen')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => speak(card.term, deck.sourceLanguage, { slow: true })}
          >
            {t('study.learn.listenSlow')}
          </button>
        </div>
      </div>

      <div className={styles.choiceList}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => handleChoice(choice)}
            className={styles.choiceBtn}
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

/**
 * Build the list of "spell" prompts for a deck.
 * Each card produces TWO prompts: one in each direction (term→definition and
 * definition→term). After that we shuffle and try not to put two prompts of
 * the same card next to each other.
 */
function buildSpellPrompts(cards: any[], deck: any): SpellPrompt[] {
  const all: SpellPrompt[] = [];
  cards.forEach((c: any) => {
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
        (p, j) => j > i && p.cardId !== shuffled[i - 1].cardId && p.cardId !== shuffled[i].cardId
      );
      if (swap !== -1) {
        [shuffled[i], shuffled[swap]] = [shuffled[swap], shuffled[i]];
      }
    }
  }
  return shuffled;
}

/** Normalize an answer for comparison (lowercase, collapse spaces/punctuation). */
function normalizeAnswer(s: string) {
  return s.trim().toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
}

/**
 * SpellMode — the user types the answer with the keyboard.
 * We compare the typed text to the expected answer with a soft normalization.
 */
function SpellMode({ cards, deck, sessionId, onComplete }: ModeProps) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ModeResult[]>([]);
  const { speak } = useSpeech();

  const [prompts] = useState<SpellPrompt[]>(() => buildSpellPrompts(cards, deck));
  const prompt = prompts[idx];

  useEffect(() => {
    setInput('');
    setSubmitted(false);
    speak(prompt.question, prompt.questionLang);
  }, [idx, prompt.question, prompt.questionLang, speak]);

  const isCorrect = normalizeAnswer(input) === normalizeAnswer(prompt.answer);

  const handleSubmit = (e: React.FormEvent) => {
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

  return (
    <div className={styles.modeWrap600}>
      <ProgressRow idx={idx} total={prompts.length} />

      <div className={styles.spellHead}>
        <div className={styles.spellLabel}>
          {t('study.spell.promptDir', { from: prompt.questionLang, to: prompt.answerLang })}
        </div>
        {prompt.questionImageUrl && (
          <img src={prompt.questionImageUrl} alt={prompt.question} className={styles.spellImage} />
        )}
        <div className={styles.spellTerm}>{prompt.question}</div>
        <div className={styles.spellHearRow}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => speak(prompt.question, prompt.questionLang)}
          >
            {t('study.spell.hear')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => speak(prompt.question, prompt.questionLang, { slow: true })}
          >
            {t('study.spell.hearSlow')}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          key={idx}
          className={`input-field ${styles.spellInput}`}
          value={input}
          onChange={(e) => !submitted && setInput(e.target.value)}
          placeholder={t('study.spell.placeholder', { lang: prompt.answerLang })}
          style={{
            background: submitted ? (isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : undefined,
            borderColor: submitted ? (isCorrect ? 'var(--success)' : 'var(--danger)') : undefined,
          }}
          disabled={submitted}
          autoFocus
        />
        {submitted && !isCorrect && (
          <div className={styles.spellAnswer}>
            <span style={{ fontSize: 14, color: 'var(--text3)' }}>{t('study.spell.correctAnswer')} </span>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>{prompt.answer}</span>
          </div>
        )}
        {!submitted && (
          <button type="submit" className={`btn btn-primary ${styles.spellSubmit}`}>
            {t('study.spell.check')}
          </button>
        )}
      </form>
    </div>
  );
}

/**
 * MatchMode — drag-free pair matching for up to 8 cards.
 * The user clicks a term and then a definition. Wrong pairs flash red and
 * count as "missed" for that card. Once all 8 pairs are matched the mode is
 * complete.
 */
function MatchMode({ cards, sessionId, onComplete }: ModeProps) {
  const { t } = useTranslation();
  const [slicedCards] = useState(() => cards.slice(0, 8));
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ type: 'term' | 'def'; idx: number } | null>(null);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [missedPairs, setMissedPairs] = useState<Set<number>>(new Set());

  const terms = slicedCards.map((c: any, i: number) => ({ text: c.term, id: i }));
  const [shuffledDefs] = useState(() =>
    [...slicedCards]
      .sort(() => Math.random() - 0.5)
      .map((c: any) => ({ text: c.definition, originalIdx: slicedCards.indexOf(c) }))
  );

  const handleSelect = (type: 'term' | 'def', idx: number, originalIdx?: number) => {
    const key = type === 'term' ? `t${idx}` : `d${idx}`;
    if (matched.has(type === 'term' ? `pair${idx}` : `pair${originalIdx}`)) return;

    if (!selected) { setSelected({ type, idx }); return; }
    if (selected.type === type) { setSelected({ type, idx }); return; }

    const termIdx = type === 'term' ? idx : selected.idx;
    const defOrigIdx = type === 'def' ? originalIdx! : shuffledDefs[selected.idx].originalIdx;

    if (termIdx === defOrigIdx) {
      const newMatched = new Set(matched);
      newMatched.add(`pair${termIdx}`);
      setMatched(newMatched);
      setSelected(null);
      if (newMatched.size === slicedCards.length) {
        setTimeout(() => {
          const finalResults: ModeResult[] = slicedCards.map((c: any, i: number) => {
            const correct = !missedPairs.has(i);
            sendAnswer(sessionId, c.id, correct);
            return { cardId: c.id, correct };
          });
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
      const wrongKey1 = selected.type === 'term' ? `t${selected.idx}` : `d${selected.idx}`;
      setWrong(new Set([wrongKey1, key]));
      setTimeout(() => { setWrong(new Set()); setSelected(null); }, 800);
    }
  };

  const getCardStyle = (sel: boolean, mat: boolean, wr: boolean): React.CSSProperties => ({
    background: mat ? 'rgba(16,185,129,0.15)' : wr ? 'rgba(239,68,68,0.1)' : sel ? 'rgba(124,58,237,0.2)' : 'var(--surface)',
    border: `1px solid ${mat ? 'var(--success)' : wr ? 'var(--danger)' : sel ? 'var(--brand)' : 'var(--border)'}`,
    color: mat ? 'var(--success)' : wr ? 'var(--danger)' : 'var(--text)',
    cursor: mat ? 'default' : 'pointer',
    opacity: mat ? 0.6 : 1,
    textDecoration: mat ? 'line-through' : 'none',
  });

  const isTermSelected = (i: number) => selected?.type === 'term' && selected.idx === i;
  const isDefSelected = (i: number) => selected?.type === 'def' && selected.idx === i;
  const isTermMatched = (i: number) => matched.has(`pair${i}`);
  const isDefMatched = (i: number) => matched.has(`pair${shuffledDefs[i].originalIdx}`);
  const isTermWrong = (i: number) => wrong.has(`t${i}`);
  const isDefWrong = (i: number) => wrong.has(`d${i}`);

  return (
    <div className={styles.modeWrap800}>
      <div className={styles.matchHead}>
        <h2 className={styles.matchTitle}>{t('study.match.title')}</h2>
        <p className={styles.matchSub}>{t('study.match.subtitle')}</p>
        <div className={styles.matchProgress}>
          {t('study.match.progress', { matched: matched.size, total: slicedCards.length })}
        </div>
      </div>

      <div className={styles.matchGrid}>
        <div className={styles.matchCol}>
          {terms.map((titem: any, i: number) => (
            <div
              key={i}
              className={styles.matchCard}
              style={getCardStyle(isTermSelected(i), isTermMatched(i), isTermWrong(i))}
              onClick={() => !isTermMatched(i) && handleSelect('term', i)}
            >
              {titem.text}
            </div>
          ))}
        </div>
        <div className={styles.matchCol}>
          {shuffledDefs.map((d: any, i: number) => (
            <div
              key={i}
              className={styles.matchCard}
              style={getCardStyle(isDefSelected(i), isDefMatched(i), isDefWrong(i))}
              onClick={() => !isDefMatched(i) && handleSelect('def', i, d.originalIdx)}
            >
              {d.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ResultScreen — shown after the user finishes any study mode.
 * It reports correct/wrong counts and gives "Back" / "Study again" buttons.
 */
function ResultScreen({ results, onRetry, onBack }: { results: ModeResult[]; onRetry: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const titleKey = pct === 100 ? 'perfect' : pct >= 70 ? 'great' : pct >= 50 ? 'good' : 'keep';
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '📖';
  const gradient = pct >= 70
    ? 'linear-gradient(135deg, #10B981, #06B6D4)'
    : 'linear-gradient(135deg, #F59E0B, #EF4444)';

  return (
    <div className={`${styles.result} animate-scale`}>
      <div className={styles.resultEmoji}>{emoji}</div>
      <h2 className={styles.resultTitle}>{t(`study.result.${titleKey}`)}</h2>
      <div className={styles.resultPct} style={{ background: gradient, WebkitBackgroundClip: 'text' }}>{pct}%</div>
      <p className={styles.resultLine}>{t('study.result.scoreLine', { correct, total })}</p>

      <div className={styles.resultStats}>
        <div className={cx(styles.resultStatBox, styles.resultStatGood)}>
          <div className={styles.resultStatNum} style={{ color: 'var(--success)' }}>{correct}</div>
          <div className={styles.resultStatLabel}>{t('common.correct')}</div>
        </div>
        <div className={cx(styles.resultStatBox, styles.resultStatBad)}>
          <div className={styles.resultStatNum} style={{ color: 'var(--danger)' }}>{total - correct}</div>
          <div className={styles.resultStatLabel}>{t('common.toReview')}</div>
        </div>
      </div>

      <div className={styles.resultActions}>
        <button type="button" className={`btn btn-secondary ${styles.resultActionBtn}`} onClick={onBack}>
          {t('study.result.backToDeck')}
        </button>
        <button type="button" className={`btn btn-primary ${styles.resultActionBtn}`} onClick={onRetry}>
          {t('study.result.again')}
        </button>
      </div>
    </div>
  );
}

/**
 * Flashcard keyboard: Space flips. Before flip, ← / → change cards (same as side arrows).
 * After flip, ← / → submit hard / easy (middle “okay” stays click-only).
 */
function useFlashcardKeyboard({
  flipped,
  onFlip,
  onPrevCard,
  onNextCard,
  onHard,
  onEasy,
}: {
  flipped: boolean;
  onFlip: () => void;
  onPrevCard: () => void;
  onNextCard: () => void;
  onHard: () => void;
  onEasy: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

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

export default function StudyPage() {
  const { t } = useTranslation();
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [phase, setPhase] = useState<'study' | 'result'>('study');
  const [results, setResults] = useState<ModeResult[]>([]);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await deckApi.getDeck(Number(id));
        if (cancelled) return;
        if (!data.cards?.length) {
          toast.error(t('study.noCards'));
          navigate(`/decks/${id}`);
          return;
        }
        const shuffled = [...data.cards].sort(() => Math.random() - 0.5);
        setDeck(data);
        setCards(shuffled);
        const { data: session } = await studyApi.startSession(Number(id), mode!);
        if (!cancelled) setSessionId(session.id);
      } catch {
        if (!cancelled) {
          toast.error(t('study.sessionFailed'));
          navigate(`/decks/${id}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, mode, navigate, retryKey, t]);

  const handleComplete = async (modeResults: ModeResult[]) => {
    setResults(modeResults);
    setPhase('result');
    if (sessionId) {
      try {
        await studyApi.completeSession(sessionId);
      } catch { /* non-fatal */ }
    }
  };

  const handleRetry = () => {
    setPhase('study');
    setRetryKey((k) => k + 1);
  };

  const modeLabel = mode && ['FLASHCARD', 'LEARN', 'MATCH', 'SPELL'].includes(mode)
    ? t(`study.modesHeader.${mode as 'FLASHCARD'}`)
    : mode;

  if (loading) return (
    <div className={styles.loader}>
      <div className={styles.loaderIcon}>⚡</div>
      <p style={{ color: 'var(--text2)' }}>{t('study.loading')}</p>
    </div>
  );

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/decks/${id}`)}>
          {t('study.exit')}
        </button>
        <div className={styles.topTitle}>{deck?.title}</div>
        <div className={`badge badge-brand ${styles.topMode}`}>{modeLabel}</div>
        <div className={styles.topRight}>{t('study.cardsCount', { count: cards.length })}</div>
      </div>

      <div className={styles.body}>
        {phase === 'result' ? (
          <ResultScreen results={results} onRetry={handleRetry} onBack={() => navigate(`/decks/${id}`)} />
        ) : (() => {
          const props: ModeProps = { cards, deck, sessionId, onComplete: handleComplete };
          switch (mode) {
            case 'LEARN': return <LearnMode {...props} />;
            case 'MATCH': return <MatchMode {...props} />;
            case 'SPELL': return <SpellMode {...props} />;
            case 'FLASHCARD':
            default: return <FlashcardMode {...props} />;
          }
        })()}
      </div>
    </div>
  );
}
