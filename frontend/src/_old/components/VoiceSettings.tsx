import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { RootState } from '../store';
import {
  setLanguageVoice,
  setNormalRate,
  setSlowRate,
  resetSpeech,
} from '../store/settingsSlice';
import { useSpeech, useVoices, resolveLang } from '../hooks/useSpeech';
import styles from './VoiceSettings.module.css';

const LANGS = ['en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'pl', 'tr', 'uk'] as const;

const SAMPLE: Record<string, string> = {
  en: 'Hello, this is a sample sentence.',
  ru: 'Привет, это пример произношения.',
  de: 'Hallo, das ist ein Beispielsatz.',
  fr: 'Bonjour, ceci est un exemple.',
  es: 'Hola, esto es una frase de ejemplo.',
  it: 'Ciao, questa è una frase di esempio.',
  pt: 'Olá, esta é uma frase de exemplo.',
  zh: '你好，这是一个示例句子。',
  ja: 'こんにちは、これは例文です。',
  ko: '안녕하세요, 예시 문장입니다.',
  ar: 'مرحبا، هذه جملة مثال.',
  pl: 'Cześć, to jest przykładowe zdanie.',
  tr: 'Merhaba, bu bir örnek cümledir.',
  uk: 'Привіт, це приклад речення.',
};

export default function VoiceSettings() {
  const { t } = useTranslation();
  const voices = useVoices();
  const dispatch = useAppDispatch();
  const { speak } = useSpeech();
  const speech = useAppSelector((s: RootState) => s.settings.speech);

  const voicesByLang = useMemo(() => {
    const map: Record<string, SpeechSynthesisVoice[]> = {};
    LANGS.forEach((code) => {
      const base = resolveLang(code).split('-')[0];
      map[code] = voices
        .filter((v) => v.lang.startsWith(base))
        .sort((a, b) => a.name.localeCompare(b.name));
    });
    return map;
  }, [voices]);

  const hasAny = voices.length > 0;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{t('settings.voicePanel.panelTitle')}</h2>
        <p className={styles.panelSub}>{t('settings.voicePanel.panelSub')}</p>
      </div>

      <div className={styles.rateGrid}>
        <div className={styles.rateBox}>
          <label className={styles.rateLabel} htmlFor="normal-rate">
            {t('settings.voicePanel.normalRate')} <strong>{speech.normalRate.toFixed(2)}×</strong>
          </label>
          <input
            id="normal-rate"
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={speech.normalRate}
            onChange={(e) => dispatch(setNormalRate(Number(e.target.value)))}
            className={styles.slider}
          />
        </div>
        <div className={styles.rateBox}>
          <label className={styles.rateLabel} htmlFor="slow-rate">
            {t('settings.voicePanel.slowRate')} <strong>{speech.slowRate.toFixed(2)}×</strong>
          </label>
          <input
            id="slow-rate"
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={speech.slowRate}
            onChange={(e) => dispatch(setSlowRate(Number(e.target.value)))}
            className={styles.slider}
          />
        </div>
      </div>

      {!hasAny ? (
        <div className={styles.emptyVoices}>{t('settings.voicePanel.noVoices')}</div>
      ) : (
        <div className={styles.voiceList}>
          {LANGS.map((code) => {
            const list = voicesByLang[code] || [];
            if (list.length === 0) return null;
            const selected = speech.voices[code] || '';
            return (
              <div key={code} className={styles.voiceRow}>
                <div className={styles.voiceLangLabel}>{t(`languages.${code}`)}</div>
                <select
                  className={`input-field ${styles.voiceSelect}`}
                  value={selected}
                  onChange={(e) =>
                    dispatch(setLanguageVoice({ lang: code, voiceURI: e.target.value }))
                  }
                >
                  <option value="">{t('settings.voicePanel.autoVoice')}</option>
                  {list.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} — {v.lang}
                      {v.default ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => speak(SAMPLE[code] || 'Hello', code)}
                  title={t('settings.voicePanel.testVoice')}
                >
                  🔊
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => speak(SAMPLE[code] || 'Hello', code, { slow: true })}
                  title={t('settings.voicePanel.testVoiceSlow')}
                >
                  🐢
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.panelFoot}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => dispatch(resetSpeech())}>
          {t('settings.voicePanel.resetAll')}
        </button>
      </div>
    </div>
  );
}
