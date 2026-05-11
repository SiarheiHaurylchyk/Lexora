import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Bot, Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';

import { aiApi } from '@/shared/api/api-legacy';
import { useAiNeuralTts } from '@/shared/hooks/useAiNeuralTts';
import { useBrowserSpeechRecognition } from '@/shared/hooks/useBrowserSpeechRecognition';
import {
  useGroqWhisperMic,
  type WhisperMicErrorCode,
} from '@/shared/hooks/useGroqWhisperMic';
import {
  BROWSER_STT_LANG_AUTO,
  resolveBrowserSttLang,
  useSpeech,
} from '@/shared/hooks/useSpeech';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { LEARNING_LANGUAGE_CODES } from '@/shared/lib/learningLanguages';
import { useAppSelector } from '@/shared/lib/storeHooks';

type Scenario =
  | 'FREE'
  | 'AIRPORT'
  | 'CAFE'
  | 'RESTAURANT'
  | 'HOTEL'
  | 'SHOP'
  | 'DOCTOR'
  | 'PHARMACY'
  | 'TAXI'
  | 'BANK'
  | 'POST_OFFICE'
  | 'JOB_INTERVIEW'
  | 'DIRECTIONS'
  | 'SMALL_TALK'
  | 'PHONE_CALL'
  | 'EMERGENCY'
  | 'BUSINESS_MEETING';

const SCENARIOS: { value: Scenario; key: string }[] = [
  { value: 'FREE', key: 'free' },
  { value: 'SMALL_TALK', key: 'smallTalk' },
  { value: 'AIRPORT', key: 'airport' },
  { value: 'TAXI', key: 'taxi' },
  { value: 'DIRECTIONS', key: 'directions' },
  { value: 'HOTEL', key: 'hotel' },
  { value: 'CAFE', key: 'cafe' },
  { value: 'RESTAURANT', key: 'restaurant' },
  { value: 'SHOP', key: 'shop' },
  { value: 'DOCTOR', key: 'doctor' },
  { value: 'PHARMACY', key: 'pharmacy' },
  { value: 'BANK', key: 'bank' },
  { value: 'POST_OFFICE', key: 'postOffice' },
  { value: 'PHONE_CALL', key: 'phoneCall' },
  { value: 'JOB_INTERVIEW', key: 'jobInterview' },
  { value: 'BUSINESS_MEETING', key: 'businessMeeting' },
  { value: 'EMERGENCY', key: 'emergency' },
];

type SttMode = 'browser' | 'whisper';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const cardClasses = tw`overflow-hidden rounded-2xl border border-border bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)]`;
const cardHeadClasses = tw`flex items-start justify-between gap-3 border-b border-border bg-[color-mix(in_srgb,var(--color-surface)_70%,transparent)] px-[18px] py-4`;
const badgeClasses = tw`shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_22%,transparent)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-light`;
const labelClasses = tw`mr-1 text-xs text-text3`;
const selectClasses = tw`min-w-[160px] rounded-[10px] border border-border bg-bg px-3 py-2 text-[13px] text-text max-[640px]:w-full`;
const speechHintClasses = tw`m-0 px-[18px] pt-2 pb-1 text-xs leading-[1.45] text-text3`;
const iconBtnClasses = tw`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[12px] border border-border bg-surface text-text transition-[background,border-color] duration-200 hover:not-disabled:bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] disabled:cursor-not-allowed disabled:opacity-45`;
const bubbleClasses = tw`max-w-[min(100%,420px)] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-[1.45]`;

export function AiPage() {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const learningLang = (user?.learningLanguage || 'en').trim() || 'en';
  const uiLocale = i18n.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';

  const [speechLang, setSpeechLang] = useState<string>(BROWSER_STT_LANG_AUTO);

  const [scenario, setScenario] = useState<Scenario>('FREE');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiProvider, setAiProvider] = useState<string>('');
  const [whisperAvailable, setWhisperAvailable] = useState(false);
  const [neuralTtsAvailable, setNeuralTtsAvailable] = useState(false);
  const [serverXaiTts, setServerXaiTts] = useState(false);
  const [serverGroqTts, setServerGroqTts] = useState(false);
  const [sttMode, setSttMode] = useState<SttMode>('browser');
  const [lastReplyProvider, setLastReplyProvider] = useState<string>('');
  const [speakReplies, setSpeakReplies] = useState(true);

  const sttDefaultAppliedRef = useRef(false);

  const {
    speak: browserSpeak,
    speakMixedRuEn,
    stop: stopBrowserSpeech,
  } = useSpeech();
  const { speak: speakReply, stop: stopNeuralAudio } = useAiNeuralTts(
    neuralTtsAvailable,
    serverXaiTts,
    serverGroqTts,
    browserSpeak,
    speakMixedRuEn,
  );
  const stopSpeech = useCallback(() => {
    stopBrowserSpeech();
    stopNeuralAudio();
  }, [stopBrowserSpeech, stopNeuralAudio]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const micBaseDraftRef = useRef('');
  const micLangSyncedForUser = useRef<string | undefined>(undefined);
  const prevSpeechLangForStop = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      micLangSyncedForUser.current = undefined;
      return;
    }
    const micSyncKey = `${user.id}:mic-defaults-v3`;
    if (micLangSyncedForUser.current === micSyncKey) return;
    micLangSyncedForUser.current = micSyncKey;
    setSpeechLang(BROWSER_STT_LANG_AUTO);
  }, [user?.id]);

  const recognitionLang = resolveBrowserSttLang(speechLang, uiLocale);

  const speechRec = useBrowserSpeechRecognition({
    lang: recognitionLang,
    onSessionFinalUpdate: (full: string) => {
      const phrase = full.trim();
      if (!phrase) return;
      const base = micBaseDraftRef.current.trimEnd();
      setDraft([base, phrase].filter(Boolean).join(' '));
    },
    onError: (msg: string) => toast.error(msg),
    onNoSpeech: () => toast.error(t('ai.sttNoSpeech')),
  });

  const appendVoiceTranscript = useCallback((phraseRaw: string) => {
    const phrase = phraseRaw.trim();
    if (!phrase) return;
    const base = micBaseDraftRef.current.trimEnd();
    setDraft([base, phrase].filter(Boolean).join(' '));
  }, []);

  const whisperMic = useGroqWhisperMic({
    onTranscript: appendVoiceTranscript,
    onError: (code: WhisperMicErrorCode, detail?: string) => {
      const keyMap: Record<WhisperMicErrorCode, string> = {
        UNSUPPORTED: 'ai.whisperUnsupported',
        MIC_DENIED: 'ai.whisperMicDenied',
        SHORT_AUDIO: 'ai.whisperTooShort',
        EMPTY_TRANSCRIPT: 'ai.whisperEmpty',
        TRANSCRIBE_FAILED: 'ai.whisperTranscribeFailed',
        RECORDER_ERROR: 'ai.whisperRecorderError',
      };
      const base = t(keyMap[code]);
      toast.error(detail ? `${base} ${detail}` : base);
    },
  });

  useEffect(() => {
    if (whisperAvailable && !sttDefaultAppliedRef.current) {
      sttDefaultAppliedRef.current = true;
      setSttMode('whisper');
    }
  }, [whisperAvailable]);

  useEffect(() => {
    if (!whisperAvailable && sttMode === 'whisper') setSttMode('browser');
  }, [whisperAvailable, sttMode]);

  useEffect(() => {
    if (sttMode === 'whisper') speechRec.stop();
    else whisperMic.discard();
  }, [sttMode, speechRec.stop, whisperMic.discard]);

  useEffect(() => {
    if (
      prevSpeechLangForStop.current !== null &&
      prevSpeechLangForStop.current !== speechLang &&
      speechRec.listening
    ) {
      speechRec.stop();
      toast(t('ai.micStoppedLangChange'), { duration: 3800 });
    }
    prevSpeechLangForStop.current = speechLang;
  }, [speechLang, speechRec.listening, speechRec.stop, t]);

  const scrollDown = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollDown();
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await aiApi.status();
        if (!cancelled) {
          setAiConfigured(data.configured);
          setAiProvider(data.provider || '');
          setWhisperAvailable(data.whisperTranscription === true);
          setServerXaiTts(data.xaiTts === true);
          setServerGroqTts(data.groqTts === true);
          setNeuralTtsAvailable(data.xaiTts === true || data.groqTts === true);
        }
      } catch {
        if (!cancelled) {
          setAiConfigured(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;

      const nextMessages: ChatTurn[] = [
        ...messages,
        { role: 'user', content: text },
      ];
      setMessages(nextMessages);
      setDraft('');
      setSending(true);
      stopSpeech();

      try {
        const { data } = await aiApi.chat({
          messages: nextMessages,
          scenario,
          uiLocale,
          learningLanguage: learningLang,
        });
        const reply = data.reply?.trim() || '';
        setLastReplyProvider(data.provider || '');
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        if (speakReplies && reply) {
          void speakReply(reply, learningLang);
        }
      } catch (err: unknown) {
        const msg = getApiErrorMessage(err) || t('ai.sendFailed');
        toast.error(msg);
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setSending(false);
      }
    },
    [
      messages,
      scenario,
      uiLocale,
      sending,
      speakReplies,
      speakReply,
      stopSpeech,
      learningLang,
      t,
    ],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendText(draft);
  };

  const clearChat = () => {
    stopSpeech();
    speechRec.stop();
    whisperMic.discard();
    setMessages([]);
    setLastReplyProvider('');
  };

  const toggleMic = () => {
    if (sttMode === 'whisper') {
      if (whisperMic.recording) whisperMic.stop();
      else if (!whisperMic.uploading) {
        micBaseDraftRef.current = draft;
        void whisperMic.start();
      }
    } else if (speechRec.listening) speechRec.stop();
    else {
      micBaseDraftRef.current = draft;
      speechRec.start();
    }
  };

  const micBusy =
    sttMode === 'whisper'
      ? whisperMic.recording || whisperMic.uploading
      : speechRec.listening;

  const micDisabled =
    sending ||
    (sttMode === 'whisper'
      ? !whisperMic.supported || whisperMic.uploading
      : !speechRec.supported);

  return (
    <div className='mx-auto box-border max-w-[920px] px-8 pt-7 pb-12 max-[640px]:px-4 max-[640px]:pt-5 max-[640px]:pb-10'>
      <h1 className='font-display m-0 mb-2 text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.03em]'>
        {t('ai.title')}
      </h1>
      <p className='text-text3 m-0 mb-7 max-w-[640px] text-sm leading-[1.5]'>
        {t('ai.subtitle')}
      </p>

      <div className='flex flex-col gap-5'>
        <section className={cardClasses} aria-labelledby='ai-chat-heading'>
          <div className={cardHeadClasses}>
            <div>
              <h2
                id='ai-chat-heading'
                className='font-display m-0 text-[17px] tracking-[-0.02em]'
              >
                {t('ai.blockConversation.title')}
              </h2>
              <p className='text-text3 m-0 mt-1 text-[13px] leading-[1.45]'>
                {t('ai.blockConversation.desc')}
              </p>
            </div>
            <span
              className={cn(
                badgeClasses,
                aiConfigured === false &&
                  '!bg-[color-mix(in_srgb,#f59e0b_25%,transparent)] !text-[#fcd34d]',
              )}
              title={t('ai.providerHint')}
            >
              {lastReplyProvider || aiProvider || '—'}
            </span>
          </div>

          <div className='border-border flex flex-wrap items-center gap-2.5 border-b px-[18px] py-3 max-[640px]:flex-col max-[640px]:items-stretch'>
            <span className={labelClasses}>{t('ai.scenario')}</span>
            <select
              className={selectClasses}
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              aria-label={t('ai.scenario')}
            >
              {SCENARIOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(`ai.scenarios.${s.key}`)}
                </option>
              ))}
            </select>

            {whisperAvailable && (
              <>
                <span className={labelClasses}>{t('ai.sttMode')}</span>
                <select
                  className={selectClasses}
                  value={sttMode}
                  onChange={(e) => setSttMode(e.target.value as SttMode)}
                  aria-label={t('ai.sttMode')}
                >
                  <option value='whisper'>{t('ai.sttModeWhisper')}</option>
                  <option value='browser'>{t('ai.sttModeBrowser')}</option>
                </select>
              </>
            )}

            {sttMode === 'browser' && (
              <>
                <span className={labelClasses}>{t('ai.speechLang')}</span>
                <select
                  className={selectClasses}
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value)}
                  aria-label={t('ai.speechLang')}
                >
                  <option value={BROWSER_STT_LANG_AUTO}>
                    {t('ai.speechLangAuto')}
                  </option>
                  {LEARNING_LANGUAGE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {t(`languages.${code}`)}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className='text-text2 inline-flex cursor-pointer items-center gap-2 text-[13px] select-none'>
              <input
                type='checkbox'
                checked={speakReplies}
                className='accent-brand-light'
                onChange={(e) => {
                  setSpeakReplies(e.target.checked);
                  if (!e.target.checked) stopSpeech();
                }}
              />
              {speakReplies ? (
                <Volume2 size={16} aria-hidden />
              ) : (
                <VolumeX size={16} aria-hidden />
              )}
              <span>
                {t('ai.speakReplies')}
                {neuralTtsAvailable && (
                  <span
                    className='text-brand-light ml-2 inline-block rounded-full bg-[color-mix(in_srgb,var(--color-brand)_24%,transparent)] px-2 py-0.5 align-middle text-[10px] font-semibold tracking-[0.04em] uppercase'
                    title={t('ai.neuralVoiceHint')}
                  >
                    {t('ai.neuralVoiceBadge')}
                  </span>
                )}
              </span>
            </label>

            {messages.length > 0 && (
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                onClick={clearChat}
              >
                {t('ai.clear')}
              </button>
            )}
          </div>

          {sttMode === 'browser' ? (
            <>
              <p className={speechHintClasses}>{t('ai.speechLangHint')}</p>
              <p className='border-border text-text3 m-0 border-b px-[18px] pb-3 text-xs leading-[1.45]'>
                {t('ai.micMatchSpokenHint')}
              </p>
            </>
          ) : (
            <p className='border-border text-text3 m-0 border-b px-[18px] pt-2 pb-3 text-xs leading-[1.45]'>
              {t('ai.whisperHint')}
            </p>
          )}

          {aiConfigured === false && (
            <p className='text-text3 mt-0 px-[18px] text-xs'>
              {t('ai.notConfigured')}
            </p>
          )}

          <div
            className='flex max-h-[min(52vh,520px)] min-h-[280px] flex-col gap-3 overflow-y-auto px-[18px] py-4'
            role='log'
            aria-live='polite'
          >
            {messages.length === 0 && (
              <div className='text-text3 m-auto px-4 py-8 text-center text-sm'>
                <Bot
                  size={36}
                  strokeWidth={1.75}
                  className='mb-3 opacity-[0.35]'
                  aria-hidden
                />
                <div>{t('ai.emptyHint')}</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={cn('flex', m.role === 'user' && 'justify-end')}
              >
                <div
                  className={cn(
                    bubbleClasses,
                    m.role === 'assistant'
                      ? 'border-border rounded-bl-[4px] border bg-[color-mix(in_srgb,var(--color-surface)_100%,transparent)]'
                      : 'rounded-br-[4px] bg-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-surface))]',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            className='border-border flex items-end gap-2 border-t bg-[color-mix(in_srgb,var(--color-bg)_40%,transparent)] px-[18px] py-3.5'
            onSubmit={onSubmit}
          >
            <textarea
              className='border-border bg-bg font-inherit text-text max-h-[140px] min-h-[44px] flex-1 resize-y rounded-[12px] border px-3 py-2.5 text-sm leading-[1.4] outline-none focus:border-[color-mix(in_srgb,var(--color-brand)_55%,var(--color-border))]'
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('ai.placeholder')}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendText(draft);
                }
              }}
            />
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                className={cn(
                  iconBtnClasses,
                  micBusy &&
                    'border-[#ef4444] bg-[color-mix(in_srgb,#ef4444_12%,var(--color-surface))] text-[#fca5a5]',
                )}
                onClick={toggleMic}
                disabled={micDisabled}
                aria-pressed={micBusy}
                aria-label={
                  sttMode === 'whisper'
                    ? whisperMic.uploading
                      ? t('ai.whisperUploading')
                      : whisperMic.recording
                        ? t('ai.stopMic')
                        : t('ai.startMic')
                    : speechRec.listening
                      ? t('ai.stopMic')
                      : t('ai.startMic')
                }
                title={
                  sttMode === 'whisper'
                    ? whisperMic.supported
                      ? `${t('ai.whisperMicHint')}${
                          whisperMic.uploading
                            ? ` — ${t('ai.whisperUploading')}`
                            : ''
                        }`
                      : t('ai.whisperUnsupported')
                    : speechRec.supported
                      ? speechLang === BROWSER_STT_LANG_AUTO
                        ? `${t('ai.micHint')} — ${t('ai.micLangResolved', { tag: recognitionLang })}`
                        : `${t('ai.micHint')} (${recognitionLang})`
                      : t('ai.micUnsupported')
                }
              >
                {sttMode === 'whisper' && whisperMic.uploading ? (
                  <span
                    className='border-t-brand-light animate-spin-slow h-[18px] w-[18px] rounded-full border-2 border-[color-mix(in_srgb,var(--color-text)_30%,transparent)]'
                    aria-hidden
                  />
                ) : micBusy ? (
                  <Square size={18} />
                ) : (
                  <Mic size={20} />
                )}
              </button>
              <button
                type='submit'
                className={iconBtnClasses}
                disabled={sending || !draft.trim()}
                aria-label={t('ai.send')}
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </section>

        <section
          className={cn(cardClasses, 'opacity-[0.85]')}
          aria-labelledby='ai-path-heading'
        >
          <div className={cardHeadClasses}>
            <div>
              <h2
                id='ai-path-heading'
                className='font-display m-0 text-[17px] tracking-[-0.02em]'
              >
                {t('ai.blockPath.title')}
              </h2>
              <p className='text-text3 m-0 mt-1 text-[13px] leading-[1.45]'>
                {t('ai.blockPath.desc')}
              </p>
            </div>
            <span className={badgeClasses}>{t('ai.blockPath.badge')}</span>
          </div>
          <div className='text-text3 px-[18px] pt-7 pb-8 text-center text-sm leading-[1.55]'>
            {t('ai.blockPath.placeholder')}
          </div>
        </section>
      </div>
    </div>
  );
}
