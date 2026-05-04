import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import styles from './LandingPage.module.css';

const FEATURES = [
  { key: 'flashcard', icon: '⚡' },
  { key: 'smart', icon: '🎯' },
  { key: 'tts', icon: '🔊' },
  { key: 'match', icon: '🧩' },
  { key: 'spell', icon: '✏️' },
  { key: 'stats', icon: '📊' },
] as const;

const LANG_KEYS = ['en', 'ru', 'de', 'fr', 'es', 'ja', 'zh'] as const;

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <div className={styles.logoMark}>✦</div>
          <span className={styles.brandName}>Lexora</span>
        </div>
        <div className={styles.navActions}>
          <LanguageSwitcher compact />
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/login')}>{t('landing.login')}</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/register')}>{t('landing.getStarted')}</button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />

        <div className="animate-fade">
          <div className={`badge badge-brand ${styles.heroBadge}`}>{t('landing.badge')}</div>
          <h1 className={styles.heroTitle}>
            {t('landing.heroLine1')}{' '}
            <span className={styles.heroAccent}>{t('landing.heroHighlight')}</span>
            <br />{t('landing.heroLine2')}
          </h1>
          <p className={styles.heroSub}>{t('landing.heroSub')}</p>
          <div className={styles.heroBtns}>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              {t('landing.startFree')}
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/explore')}>
              {t('landing.browseDecks')}
            </button>
          </div>
        </div>

        <div className={styles.demoWrap}>
          <div className={styles.demoCard}>
            <div className={styles.demoHint}>{t('common.term')}</div>
            <div className={styles.demoTerm}>Serendipity</div>
            <div className={styles.demoTrans}>/ˌser.ənˈdɪp.ɪ.ti/</div>
            <div className={styles.demoBack}>
              <div className={styles.demoBackLabel}>{t('common.translation')}</div>
              <div className={styles.demoBackText}>Счастливая случайность</div>
              <div className={styles.demoBackQuote}>{t('landing.demoQuote')}</div>
            </div>
            <div className={styles.demoBtns}>
              {[t('landing.hard'), t('landing.okay'), t('landing.easy')].map((label) => (
                <button key={label} type="button" className={`btn btn-secondary btn-sm ${styles.demoChoice}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.langStrip}>
        <div className={styles.langTrack}>
          {[...LANG_KEYS, ...LANG_KEYS].map((k, i) => (
            <span key={`${k}-${i}`} className={styles.langItem}>
              {t(`landing.langs.${k}`)}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.featuresSection}>
        <div className={styles.featuresInner}>
          <h2 className={styles.featuresTitle}>
            {t('landing.featuresTitle')}{' '}
            <span className={styles.featuresHighlight}>{t('landing.featuresHighlight')}</span>
          </h2>
          <p className={styles.featuresSub}>{t('landing.featuresSub')}</p>
          <div className={styles.grid3}>
            {FEATURES.map(({ key, icon }) => (
              <div key={key} className={`card ${styles.featureCard}`}>
                <div className={styles.featureIcon}>{icon}</div>
                <h3 className={styles.featureTitle}>{t(`landing.features.${key}.title`)}</h3>
                <p className={styles.featureDesc}>{t(`landing.features.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>{t('landing.ctaTitle')}</h2>
        <p className={styles.ctaSub}>{t('landing.ctaSub')}</p>
        <button type="button" className={`btn btn-primary btn-lg ${styles.ctaBtn}`} onClick={() => navigate('/register')}>
          {t('landing.createAccount')}
        </button>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>✦ Lexora</span>
          <span>{t('landing.footer')}</span>
        </div>
      </footer>
    </div>
  );
}
