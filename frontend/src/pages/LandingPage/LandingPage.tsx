import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from '@/widgets/LanguageSwitcher';

const FEATURES = [
  { key: 'flashcard', icon: '⚡' },
  { key: 'smart', icon: '🎯' },
  { key: 'tts', icon: '🔊' },
  { key: 'match', icon: '🧩' },
  { key: 'spell', icon: '✏️' },
  { key: 'stats', icon: '📊' },
] as const;

const LANG_KEYS = ['en', 'ru', 'de', 'fr', 'es', 'ja', 'zh'] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className='bg-bg min-h-screen overflow-x-hidden'>
      <nav className='border-border sticky top-0 z-50 flex items-center justify-between border-b bg-[rgba(15,15,19,0.8)] px-12 py-5 backdrop-blur-[20px]'>
        <div className='flex items-center gap-2.5'>
          <div className='from-brand to-accent flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br text-lg'>
            ✦
          </div>
          <span className='font-display text-[22px] font-extrabold'>
            Lexora
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <LanguageSwitcher compact />
          <button
            type='button'
            className='btn btn-ghost'
            onClick={() => navigate('/login')}
          >
            {t('landing.login')}
          </button>
          <button
            type='button'
            className='btn btn-primary'
            onClick={() => navigate('/register')}
          >
            {t('landing.getStarted')}
          </button>
        </div>
      </nav>

      <section className='relative px-6 pt-[100px] pb-20 text-center'>
        <div className='pointer-events-none absolute -top-[100px] left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(124,58,237,0.15)_0%,transparent_70%)]' />

        <div className='animate-fade'>
          <div className='badge badge-brand mb-6 text-[13px]'>
            {t('landing.badge')}
          </div>
          <h1 className='mb-6 text-[clamp(48px,8vw,88px)] leading-[1.05] font-extrabold'>
            {t('landing.heroLine1')}{' '}
            <span className='from-brand to-accent bg-gradient-to-br bg-clip-text text-transparent'>
              {t('landing.heroHighlight')}
            </span>
            <br />
            {t('landing.heroLine2')}
          </h1>
          <p className='text-text2 mx-auto mb-10 max-w-[560px] text-xl leading-[1.6]'>
            {t('landing.heroSub')}
          </p>
          <div className='flex flex-wrap justify-center gap-3'>
            <button
              type='button'
              className='btn btn-primary btn-lg'
              onClick={() => navigate('/register')}
            >
              {t('landing.startFree')}
            </button>
            <button
              type='button'
              className='btn btn-secondary btn-lg'
              onClick={() => navigate('/explore')}
            >
              {t('landing.browseDecks')}
            </button>
          </div>
        </div>

        <div className='mt-20 flex justify-center'>
          <div className='bg-surface border-border relative w-full max-w-[520px] rounded-[24px] border px-[60px] py-10 shadow-[0_40px_80px_rgba(0,0,0,0.5)]'>
            <div className='text-text3 mb-6 text-xs tracking-[1px]'>
              {t('common.term')}
            </div>
            <div className='font-display mb-2 text-4xl font-bold'>
              Serendipity
            </div>
            <div className='text-text3 mb-6 text-sm'>/ˌser.ənˈdɪp.ɪ.ti/</div>
            <div className='from-brand-dark to-brand rounded-2xl bg-gradient-to-br px-8 py-6 text-white'>
              <div className='mb-2 text-xs tracking-[1px] opacity-70'>
                {t('common.translation')}
              </div>
              <div className='text-2xl font-semibold'>
                Счастливая случайность
              </div>
              <div className='mt-2 text-[13px] italic opacity-70'>
                {t('landing.demoQuote')}
              </div>
            </div>
            <div className='mt-5 flex justify-center gap-3'>
              {[t('landing.hard'), t('landing.okay'), t('landing.easy')].map(
                (label) => (
                  <button
                    key={label}
                    type='button'
                    className='btn btn-secondary btn-sm flex-1 justify-center'
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className='border-border overflow-hidden border-t border-b py-10'>
        <div className='animate-scroll-x flex w-max gap-6'>
          {[...LANG_KEYS, ...LANG_KEYS].map((k, i) => (
            <span
              key={`${k}-${i}`}
              className='text-text3 px-3 text-[15px] whitespace-nowrap'
            >
              {t(`landing.langs.${k}`)}
            </span>
          ))}
        </div>
      </section>

      <section className='px-12 py-[100px]'>
        <div className='mx-auto max-w-[1100px]'>
          <h2 className='mb-4 text-center text-[42px]'>
            {t('landing.featuresTitle')}{' '}
            <span className='text-brand-light'>
              {t('landing.featuresHighlight')}
            </span>
          </h2>
          <p className='text-text2 mb-16 text-center text-lg'>
            {t('landing.featuresSub')}
          </p>
          <div className='grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1'>
            {FEATURES.map(({ key, icon }) => (
              <div
                key={key}
                className='card hover:border-brand cursor-default transition-colors'
              >
                <div className='bg-bg3 mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] text-2xl'>
                  {icon}
                </div>
                <h3 className='font-display mb-2 text-lg'>
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className='text-text2 text-sm leading-[1.6]'>
                  {t(`landing.features.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='border-border border-t bg-[linear-gradient(135deg,rgba(124,58,237,0.1)_0%,rgba(6,182,212,0.05)_100%)] px-6 py-20 text-center'>
        <h2 className='mb-4 text-[40px]'>{t('landing.ctaTitle')}</h2>
        <p className='text-text2 mb-8 text-lg'>{t('landing.ctaSub')}</p>
        <button
          type='button'
          className='btn btn-primary btn-lg px-10 py-4 text-lg'
          onClick={() => navigate('/register')}
        >
          {t('landing.createAccount')}
        </button>
      </section>

      <footer className='border-border text-text3 border-t px-12 py-8 text-[13px]'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <span className='font-display text-text2 font-bold'>✦ Lexora</span>
          <span>{t('landing.footer')}</span>
        </div>
      </footer>
    </div>
  );
}
