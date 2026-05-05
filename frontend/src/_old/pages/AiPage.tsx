import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Bot, Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { aiApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiError';
import { classNames } from '../lib/classNames';
import { useAppSelector } from '../store/hooks';
import { LEARNING_LANGUAGE_CODES } from '../lib/learningLanguages';
import { useSpeech, resolveBrowserSttLang, BROWSER_STT_LANG_AUTO } from '../hooks/useSpeech';
import { useBrowserSpeechRecognition } from '../hooks/useBrowserSpeechRecognition';
import { useGroqWhisperMic, type WhisperMicErrorCode } from '../hooks/useGroqWhisperMic';
import { useAiNeuralTts } from '../hooks/useAiNeuralTts';
import styles from './AiPage.module.css';

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

export default function AiPage() {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const learningLang = (user?.learningLanguage || 'en').trim() || 'en';
  const uiLocale = i18n.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';

  /** Browser STT locale: {@link BROWSER_STT_LANG_AUTO} uses OS + UI hints; fixed codes force one language. */
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

  const { speak: browserSpeak, speakMixedRuEn, stop: stopBrowserSpeech } = useSpeech();
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
  /** Text in the box when the current mic capture started (avoid duplicated words on multi-fire events). */
  const micBaseDraftRef = useRef('');
  /** Reset mic language preference when the logged-in user changes. */
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
    onSessionFinalUpdate: (full) => {
      const phrase = full.trim();
      if (!phrase) return;
      const base = micBaseDraftRef.current.trimEnd();
      setDraft([base, phrase].filter(Boolean).join(' '));
    },
    onError: (msg) => toast.error(msg),
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
    if (prevSpeechLangForStop.current !== null && prevSpeechLangForStop.current !== speechLang && speechRec.listening) {
      speechRec.stop();
      toast(t('ai.micStoppedLangChange'), { duration: 3800 });
    }
    prevSpeechLangForStop.current = speechLang;
  }, [speechLang, speechRec.listening, speechRec.stop, t]);

  const scrollDown = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

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

      const nextMessages: ChatTurn[] = [...messages, { role: 'user', content: text }];
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
    [messages, scenario, uiLocale, sending, speakReplies, speakReply, stopSpeech, learningLang, t],
  );

  const onSubmit = (e: React.FormEvent) => {
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
    (sttMode === 'whisper' ? !whisperMic.supported || whisperMic.uploading : !speechRec.supported);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('ai.title')}</h1>
      <p className={styles.subtitle}>{t('ai.subtitle')}</p>

      <div className={styles.blocks}>
        <section className={styles.card} aria-labelledby="ai-chat-heading">
          <div className={styles.cardHead}>
            <div>
              <h2 id="ai-chat-heading" className={styles.cardTitle}>
                {t('ai.blockConversation.title')}
              </h2>
              <p className={styles.cardDesc}>{t('ai.blockConversation.desc')}</p>
            </div>
            <span
              className={classNames(
                styles.badge,
                aiConfigured === false && styles.badgeWarn,
              )}
              title={t('ai.providerHint')}
            >
              {lastReplyProvider || aiProvider || '—'}
            </span>
          </div>

          <div className={styles.toolbar}>
            <span className={styles.label}>{t('ai.scenario')}</span>
            <select
              className={styles.select}
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
                <span className={styles.label}>{t('ai.sttMode')}</span>
                <select
                  className={styles.select}
                  value={sttMode}
                  onChange={(e) => setSttMode(e.target.value as SttMode)}
                  aria-label={t('ai.sttMode')}
                >
                  <option value="whisper">{t('ai.sttModeWhisper')}</option>
                  <option value="browser">{t('ai.sttModeBrowser')}</option>
                </select>
              </>
            )}

            {sttMode === 'browser' && (
              <>
                <span className={styles.label}>{t('ai.speechLang')}</span>
                <select
                  className={styles.select}
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value)}
                  aria-label={t('ai.speechLang')}
                >
                  <option value={BROWSER_STT_LANG_AUTO}>{t('ai.speechLangAuto')}</option>
                  {LEARNING_LANGUAGE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {t(`languages.${code}`)}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={speakReplies}
                onChange={(e) => {
                  setSpeakReplies(e.target.checked);
                  if (!e.target.checked) stopSpeech();
                }}
              />
              {speakReplies ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
              <span>
                {t('ai.speakReplies')}
                {neuralTtsAvailable && (
                  <span className={styles.neuralTtsTag} title={t('ai.neuralVoiceHint')}>
                    {t('ai.neuralVoiceBadge')}
                  </span>
                )}
              </span>
            </label>

            {messages.length > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearChat}>
                {t('ai.clear')}
              </button>
            )}
          </div>

          {sttMode === 'browser' ? (
            <>
              <p className={styles.speechHint}>{t('ai.speechLangHint')}</p>
              <p className={styles.speechHintSecondary}>{t('ai.micMatchSpokenHint')}</p>
            </>
          ) : (
            <p className={classNames(styles.speechHint, styles.speechHintFooter)}>{t('ai.whisperHint')}</p>
          )}

          {aiConfigured === false && (
            <p className={styles.providerHint} style={{ padding: '0 18px', marginTop: 0 }}>
              {t('ai.notConfigured')}
            </p>
          )}

          <div className={styles.thread} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className={styles.empty}>
                <Bot size={36} strokeWidth={1.75} style={{ opacity: 0.35, marginBottom: 12 }} aria-hidden />
                <div>{t('ai.emptyHint')}</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={classNames(styles.row, m.role === 'user' && styles.rowUser)}
              >
                <div
                  className={classNames(
                    styles.bubble,
                    m.role === 'assistant' ? styles.bubbleAi : styles.bubbleUser,
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form className={styles.composer} onSubmit={onSubmit}>
            <textarea
              className={styles.textarea}
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
            <div className={styles.rowActions}>
              <button
                type="button"
                className={classNames(styles.iconBtn, micBusy && styles.iconBtnActive)}
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
                      ? `${t('ai.whisperMicHint')}${whisperMic.uploading ? ` — ${t('ai.whisperUploading')}` : ''}`
                      : t('ai.whisperUnsupported')
                    : speechRec.supported
                      ? speechLang === BROWSER_STT_LANG_AUTO
                        ? `${t('ai.micHint')} — ${t('ai.micLangResolved', { tag: recognitionLang })}`
                        : `${t('ai.micHint')} (${recognitionLang})`
                      : t('ai.micUnsupported')
                }
              >
                {sttMode === 'whisper' && whisperMic.uploading ? (
                  <span className={styles.micSpinner} aria-hidden />
                ) : micBusy ? (
                  <Square size={18} />
                ) : (
                  <Mic size={20} />
                )}
              </button>
              <button
                type="submit"
                className={styles.iconBtn}
                disabled={sending || !draft.trim()}
                aria-label={t('ai.send')}
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </section>

        <section className={classNames(styles.card, styles.cardMuted)} aria-labelledby="ai-path-heading">
          <div className={styles.cardHead}>
            <div>
              <h2 id="ai-path-heading" className={styles.cardTitle}>
                {t('ai.blockPath.title')}
              </h2>
              <p className={styles.cardDesc}>{t('ai.blockPath.desc')}</p>
            </div>
            <span className={styles.badge}>{t('ai.blockPath.badge')}</span>
          </div>
          <div className={styles.placeholderBody}>{t('ai.blockPath.placeholder')}</div>
        </section>
      </div>
    </div>
  );
}
