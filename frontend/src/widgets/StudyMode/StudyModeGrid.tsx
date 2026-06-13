import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export type StudyDirOption = 'forward' | 'reverse' | 'mixed';

interface StudyModeGridProps {
  deckId: number | string;
  studyDir: StudyDirOption;
}

/**
 * Визуальная конфигурация карточки режима обучения.
 * У каждого режима свой градиент и цвет свечения при hover.
 */
const STUDY_MODE_CONFIGS = [
  {
    key: 'FLASHCARD',
    icon: '⚡',
    gradientStart: '#7c3aed',
    gradientEnd: '#4f46e5',
  },
  {
    key: 'LEARN',
    icon: '🎯',
    gradientStart: '#0891b2',
    gradientEnd: '#0e7490',
  },
  {
    key: 'MATCH',
    icon: '🧩',
    gradientStart: '#f59e0b',
    gradientEnd: '#d97706',
  },
  {
    key: 'SPELL',
    icon: '✏️',
    gradientStart: '#059669',
    gradientEnd: '#0f766e',
  },
  {
    key: 'DRAG',
    icon: '🔀',
    gradientStart: '#06b6d4',
    gradientEnd: '#0891b2',
  },
  {
    key: 'SCRAMBLE',
    icon: '🔤',
    gradientStart: '#6366f1',
    gradientEnd: '#7c3aed',
  },
  {
    key: 'GRAVITY',
    icon: '☄️',
    gradientStart: '#ef4444',
    gradientEnd: '#f97316',
  },
  {
    key: 'EXAM',
    icon: '📝',
    gradientStart: '#64748b',
    gradientEnd: '#475569',
  },
] as const;

/**
 * Сетка из 8 режимов обучения для DeckPage.
 *
 * У каждой карточки:
 * - цветная полоска с иконкой и уникальным градиентом режима
 * - подпись и краткое описание
 * - при hover: карточка приподнимается со свечением своего цвета,
 *   иконка слегка увеличивается
 *
 * Свечение через CSS-класс `.mode-card` и inline-свойство `--mode-card-glow`.
 */
export function StudyModeGrid({ deckId, studyDir }: StudyModeGridProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className='grid grid-cols-4 gap-3 max-[900px]:grid-cols-3 max-[520px]:grid-cols-2'>
      {STUDY_MODE_CONFIGS.map(({ key, icon, gradientStart, gradientEnd }) => {
        const iconStripStyle: CSSProperties = {
          background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
        };

        // Цвет свечения для CSS-класса `.mode-card` при hover.
        const cardStyle: CSSProperties = {
          '--mode-card-glow': `${gradientStart}55`,
        } as CSSProperties;

        return (
          <button
            key={key}
            type='button'
            onClick={() =>
              navigate(`/decks/${deckId}/study/${key}?dir=${studyDir}`)
            }
            className='mode-card group border-border bg-surface overflow-hidden rounded-[16px] border text-left'
            style={cardStyle}
          >
            {/* Цветная полоска с иконкой — слегка увеличивается при hover */}
            <div
              className='flex h-[68px] items-center justify-center text-[30px] transition-all duration-200 group-hover:h-[60px] group-hover:text-[34px] group-hover:brightness-110'
              style={iconStripStyle}
            >
              {icon}
            </div>

            {/* Текст — сдвигается вверх, когда полоска сжимается */}
            <div className='px-3 pt-2.5 pb-3'>
              <div className='text-text mb-0.5 text-[13px] leading-tight font-bold'>
                {t(`deck.modes.${key}.label`)}
              </div>
              <div className='text-text3 text-[11px] leading-[1.3]'>
                {t(`deck.modes.${key}.desc`)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
