import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { resolveLang, useSpeech, useVoices } from '@/shared/hooks/useSpeech';
import {
  resetSpeech,
  setLanguageVoice,
  setNormalRate,
  setSlowRate,
} from '@/shared/lib/storeActions';
import { useSettingsStore } from '@/shared/lib/storeHooks';

const LANGS = [
  'en',
  'ru',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'zh',
  'ja',
  'ko',
  'ar',
  'pl',
  'tr',
  'uk',
] as const;

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

export function VoiceSettings() {
  const { t } = useTranslation();
  const voices = useVoices();
  const { speak } = useSpeech();
  const speech = useSettingsStore((s) => s.speech);

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
    <div className='border-border bg-surface rounded-[20px] border p-6'>
      <div className='mb-5'>
        <h2 className='font-display m-0 mb-1 text-xl'>
          {t('settings.voicePanel.panelTitle')}
        </h2>
        <p className='text-text2 m-0 text-sm'>
          {t('settings.voicePanel.panelSub')}
        </p>
      </div>

      <div className='mb-6 grid grid-cols-2 gap-4 max-[640px]:grid-cols-1'>
        <div className='border-border bg-bg3 rounded-[12px] border p-4'>
          <label
            className='text-text2 mb-2 block text-[13px]'
            htmlFor='normal-rate'
          >
            {t('settings.voicePanel.normalRate')}{' '}
            <strong>{speech.normalRate.toFixed(2)}×</strong>
          </label>
          <input
            id='normal-rate'
            type='range'
            min={0.5}
            max={1.5}
            step={0.05}
            value={speech.normalRate}
            onChange={(e) => setNormalRate(Number(e.target.value))}
            className='accent-brand-light w-full'
          />
        </div>
        <div className='border-border bg-bg3 rounded-[12px] border p-4'>
          <label
            className='text-text2 mb-2 block text-[13px]'
            htmlFor='slow-rate'
          >
            {t('settings.voicePanel.slowRate')}{' '}
            <strong>{speech.slowRate.toFixed(2)}×</strong>
          </label>
          <input
            id='slow-rate'
            type='range'
            min={0.2}
            max={1}
            step={0.05}
            value={speech.slowRate}
            onChange={(e) => setSlowRate(Number(e.target.value))}
            className='accent-brand-light w-full'
          />
        </div>
      </div>

      {!hasAny ? (
        <div className='border-border bg-bg3 text-text3 rounded-[12px] border border-dashed p-8 text-center text-sm'>
          {t('settings.voicePanel.noVoices')}
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          {LANGS.map((code) => {
            const list = voicesByLang[code] || [];
            if (list.length === 0) return null;
            const selected = speech.voices[code] || '';
            return (
              <div
                key={code}
                className='border-border bg-bg3 flex flex-wrap items-center gap-2 rounded-[12px] border px-3 py-2.5'
              >
                <div className='text-text2 min-w-[80px] text-sm font-semibold'>
                  {t(`languages.${code}`)}
                </div>
                <select
                  className='input-field min-w-[180px] flex-1'
                  value={selected}
                  onChange={(e) =>
                    setLanguageVoice({
                      lang: code,
                      voiceURI: e.target.value,
                    })
                  }
                >
                  <option value=''>{t('settings.voicePanel.autoVoice')}</option>
                  {list.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} — {v.lang}
                      {v.default ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  onClick={() => speak(SAMPLE[code] || 'Hello', code)}
                  title={t('settings.voicePanel.testVoice')}
                >
                  🔊
                </button>
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  onClick={() =>
                    speak(SAMPLE[code] || 'Hello', code, { slow: true })
                  }
                  title={t('settings.voicePanel.testVoiceSlow')}
                >
                  🐢
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className='mt-5'>
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={() => resetSpeech()}
        >
          {t('settings.voicePanel.resetAll')}
        </button>
      </div>
    </div>
  );
}
