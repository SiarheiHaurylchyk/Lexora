import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useDeckEditor } from './useDeckEditor';

import { CardList } from '@/widgets/CardList';
import { DeckSettingsForm } from '@/widgets/DeckSettings';

import { BulkImportPanel } from '@/features/BulkImport';

/**
 * Страница редактирования колоды.
 *
 * Состоит из трёх блоков:
 *  1. Форма настроек колоды (DeckSettingsForm) — название, языки, обложка.
 *  2. Панель массового импорта карточек (BulkImportPanel) — раскрывается по кнопке.
 *  3. Список карточек с inline-редактором (CardList).
 *
 * Сама страница UI-компонент: вся бизнес-логика лежит в хуке `useDeckEditor`.
 */
export function EditDeckPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Открыта ли панель массового импорта (вставка списка карточек из текста)
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const {
    deckId,
    loading,
    meta,
    setMeta,
    cards,
    saving,
    activeCardIdx,
    saveMeta,
    addCard,
    updateCardField,
    saveCard,
    deleteCard,
    openCardEditor,
    closeCardEditor,
    appendImportedCards,
  } = useDeckEditor();

  const goToDeckPage = () => navigate(`/decks/${deckId}`);

  if (loading) {
    return (
      <div className='box-border w-full py-10'>
        <div className='skeleton h-[400px] rounded-[20px]' />
      </div>
    );
  }

  return (
    <div className='box-border w-full py-10'>
      {/* Шапка страницы: «Назад», заголовок, ссылка на просмотр колоды */}
      <div className='mb-8 flex flex-wrap items-center gap-4'>
        <button type='button' className='btn btn-ghost' onClick={goToDeckPage}>
          {t('common.back')}
        </button>
        <h1 className='font-display text-[28px]'>{t('editDeck.title')}</h1>
        <button
          type='button'
          className='btn btn-secondary ml-auto'
          onClick={goToDeckPage}
        >
          {t('editDeck.viewDeck')}
        </button>
      </div>

      <DeckSettingsForm
        meta={meta}
        saving={saving}
        onChange={setMeta}
        onSave={saveMeta}
      />

      {isBulkImportOpen && (
        <BulkImportPanel
          deckId={deckId}
          baseCardCount={cards.length}
          onImportComplete={appendImportedCards}
          onClose={() => setIsBulkImportOpen(false)}
        />
      )}

      <CardList
        cards={cards}
        activeCardIdx={activeCardIdx}
        sourceLanguage={meta.sourceLanguage}
        targetLanguage={meta.targetLanguage}
        onAdd={addCard}
        onOpen={openCardEditor}
        onClose={closeCardEditor}
        onSave={saveCard}
        onDelete={(idx) => void deleteCard(idx)}
        onUpdate={updateCardField}
        onShowBulk={() => setIsBulkImportOpen(true)}
      />
    </div>
  );
}
