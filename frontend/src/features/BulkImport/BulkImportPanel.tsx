import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { deckApi } from '@/shared/api/api-legacy';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import {
  countBulkImportPreview,
  parseBulkImport,
} from '@/shared/lib/parseBulkImport';
import type { CardForm } from '@/shared/types/cardForm';

interface Props {
  deckId: number;
  /** Сколько карточек уже сохранено в колоде — нужно для sortOrder новых. */
  baseCardCount: number;
  /** Колбэк со списком успешно сохранённых карточек. */
  onImportComplete: (newCards: CardForm[]) => void;
  /** Закрыть панель. */
  onClose: () => void;
}

/**
 * Панель массового импорта карточек.
 *
 * Поддерживает несколько форматов вставки:
 *  - Quizlet/Excel/TSV   →  «термин<tab>перевод»
 *  - Lexora              →  «термин - перевод»
 *  - Anki/CSV            →  «термин;перевод»
 *  - Markdown table      →  «| термин | перевод |»
 *
 * Парсит вставленный текст (parseBulkImport), показывает количество
 * распознанных карточек на кнопке «Импорт» и при подтверждении создаёт
 * карточки на сервере по одной (по очереди).
 */
export function BulkImportPanel({
  deckId,
  baseCardCount,
  onImportComplete,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [pastedText, setPastedText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Сколько карточек распознано в текущем тексте (для лейбла кнопки)
  const previewCount = countBulkImportPreview(pastedText);

  /** Распарсить текст и создать карточки на сервере одну за другой. */
  const handleImport = async () => {
    const { cards: parsed, skippedLines } = parseBulkImport(pastedText);
    if (parsed.length === 0) {
      toast.error(t('editDeck.bulkInvalid'));
      return;
    }
    setIsImporting(true);
    try {
      const saved: CardForm[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        const { data } = await deckApi.addCard(deckId, {
          term: row.term,
          definition: row.definition,
          example: row.example ?? '',
          transcription: '',
          termImageUrl: null,
          definitionImageUrl: null,
          sortOrder: baseCardCount + i,
        });
        saved.push({
          id: data.id,
          term: row.term,
          definition: row.definition,
          example: row.example ?? '',
          transcription: '',
          termImageUrl: '',
          definitionImageUrl: '',
          isDirty: false,
        });
      }
      onImportComplete(saved);
      setPastedText('');
      onClose();
      toast.success(t('editDeck.bulkSuccess', { count: saved.length }));
      if (skippedLines > 0) {
        toast(t('editDeck.bulkSkipped', { count: skippedLines }), {
          icon: 'ℹ️',
        });
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? t('editDeck.bulkSaveFailed'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className='card mb-5'>
      <h3 className='font-display mb-2 text-[15px]'>
        {t('editDeck.bulkTitle')}
      </h3>
      <p className='text-text3 mb-1 text-[13px]'>
        {t('editDeck.bulkImportInstructions')}
      </p>

      {/* Шпаргалка по форматам, чтобы пользователь понял, что вставлять */}
      <div className='bg-bg3 border-border mb-3 rounded-lg border px-3 py-2 text-[12px]'>
        <div className='text-text3 mb-1 text-[10px] font-semibold tracking-wide uppercase'>
          {t('editDeck.bulkFormats')}
        </div>
        <div className='text-text2 grid grid-cols-1 gap-0.5'>
          <span>
            📋 <b>Quizlet / Excel</b> —{' '}
            <code className='bg-bg text-brand rounded px-1'>
              term{'\t'}definition
            </code>{' '}
            (Tab)
          </span>
          <span>
            ✏️ <b>Lexora</b> —{' '}
            <code className='bg-bg text-brand rounded px-1'>
              term - definition
            </code>
          </span>
          <span>
            📝 <b>Anki / CSV</b> —{' '}
            <code className='bg-bg text-brand rounded px-1'>
              term;definition
            </code>
          </span>
          <span>
            📊 <b>Markdown</b> —{' '}
            <code className='bg-bg text-brand rounded px-1'>
              | term | definition |
            </code>
          </span>
        </div>
      </div>

      <textarea
        className='input-field min-h-[120px] resize-y font-mono text-[13px]'
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        placeholder={
          'consumption\tпотребление\nobesity\tожирение\n\nOR:\nconsumption - потребление\nobesity - ожирение'
        }
      />

      <div className='mt-3 flex gap-2.5'>
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={onClose}
        >
          {t('common.cancel')}
        </button>
        <button
          type='button'
          className='btn btn-primary btn-sm'
          disabled={isImporting || previewCount === 0}
          onClick={() => void handleImport()}
        >
          {isImporting
            ? t('editDeck.bulkImporting')
            : t('editDeck.importCount', { count: previewCount })}
        </button>
      </div>
    </div>
  );
}
