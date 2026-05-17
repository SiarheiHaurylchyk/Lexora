import { useTranslation } from 'react-i18next';

import { CardEditorForm } from './CardEditorForm';
import { CardRow } from './CardRow';
import type { CardForm } from './types';

interface Props {
  /** Все карточки колоды в форме редактора. */
  cards: CardForm[];
  /** Индекс открытой в inline-редакторе карточки; null — все свёрнуты. */
  activeCardIdx: number | null;
  sourceLanguage: string;
  targetLanguage: string;
  /** Создать пустую карточку и открыть её редактор. */
  onAdd: () => void;
  /** Открыть inline-редактор у выбранной карточки. */
  onOpen: (idx: number) => Promise<void>;
  /** Закрыть редактор (с тихим автосохранением заполненной карточки). */
  onClose: (idx: number) => Promise<void>;
  /** Сохранить карточку на сервере; вернуть true при успехе. */
  onSave: (idx: number) => Promise<boolean>;
  /** Удалить карточку (на сервере и из списка). */
  onDelete: (idx: number) => void;
  /** Изменить значение одного поля карточки. */
  onUpdate: (idx: number, field: keyof CardForm, value: string) => void;
  /** Показать панель массового импорта. */
  onShowBulk: () => void;
}

/**
 * Виджет «Список карточек колоды».
 *
 * Каждая карточка отображается одной строкой (CardRow). При клике строка
 * раскрывается в полноценный редактор (CardEditorForm). Сразу одна
 * карточка может быть «активной» — этим управляет родитель через
 * `activeCardIdx` и колбэки `onOpen` / `onClose`.
 */
export function CardList({
  cards,
  activeCardIdx,
  sourceLanguage,
  targetLanguage,
  onAdd,
  onOpen,
  onClose,
  onSave,
  onDelete,
  onUpdate,
  onShowBulk,
}: Props) {
  const { t } = useTranslation();
  const isEmpty = cards.length === 0;

  return (
    <div>
      {/* Заголовок секции и две кнопки: массовый импорт и добавление одной карточки */}
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2.5'>
        <h2 className='font-display m-0 text-lg'>
          {t('editDeck.cardsTitle', { count: cards.length })}
        </h2>
        <div className='flex gap-2.5'>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={onShowBulk}
          >
            {t('editDeck.bulkImport')}
          </button>
          <button
            type='button'
            className='btn btn-primary btn-sm'
            onClick={onAdd}
          >
            {t('editDeck.addCard')}
          </button>
        </div>
      </div>

      {isEmpty ? (
        // Пустое состояние: предложение добавить первую карточку
        <div className='border-border2 bg-surface rounded-[20px] border-2 border-dashed px-6 py-[60px] text-center'>
          <div className='mb-4 text-5xl'>🃏</div>
          <p className='text-text3 mb-5'>{t('editDeck.noCardsBody')}</p>
          <div className='flex justify-center gap-3'>
            <button
              type='button'
              className='btn btn-secondary'
              onClick={onShowBulk}
            >
              {t('editDeck.bulkImport')}
            </button>
            <button type='button' className='btn btn-primary' onClick={onAdd}>
              {t('editDeck.addFirst')}
            </button>
          </div>
        </div>
      ) : (
        <div className='flex flex-col gap-2.5'>
          {cards.map((card, idx) => {
            const isActive = activeCardIdx === idx;
            return (
              <div
                key={idx}
                className={cn(
                  'border-border bg-surface overflow-hidden rounded-[12px] border transition-colors duration-200',
                  isActive && 'border-brand',
                )}
              >
                {isActive ? (
                  <CardEditorForm
                    card={card}
                    sourceLanguage={sourceLanguage}
                    targetLanguage={targetLanguage}
                    onUpdate={(field, value) => onUpdate(idx, field, value)}
                    onSave={() => onSave(idx)}
                    onClose={() => onClose(idx)}
                    onDelete={() => onDelete(idx)}
                  />
                ) : (
                  <CardRow
                    card={card}
                    sourceLanguage={sourceLanguage}
                    onOpen={() => void onOpen(idx)}
                    onDelete={() => onDelete(idx)}
                  />
                )}
              </div>
            );
          })}

          <button
            type='button'
            className='btn btn-secondary mt-1 justify-center'
            onClick={onAdd}
          >
            {t('editDeck.addAnother')}
          </button>
        </div>
      )}
    </div>
  );
}
