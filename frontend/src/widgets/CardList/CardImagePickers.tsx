import { useTranslation } from 'react-i18next';

import type { CardForm } from './types';

import { CardImagePicker } from '@/features/CardImagePicker';

interface CardImagePickersProps {
  card: CardForm;
  onTermImageChange: (newImageUrl: string) => void;
  onDefinitionImageChange: (newImageUrl: string) => void;
}

/**
 * Two image pickers side by side: one for the term illustration and one
 * for the definition illustration. The "prompt" / "context" props are kept
 * for backwards compatibility with the picker component.
 */
export function CardImagePickers({
  card,
  onTermImageChange,
  onDefinitionImageChange,
}: CardImagePickersProps) {
  const { t } = useTranslation();

  const termPrompt = card.term || card.definition;
  const definitionPrompt = card.definition || card.term;

  return (
    <div className='border-border mb-[18px] grid grid-cols-2 gap-4 border-t border-dashed pt-3.5 max-[600px]:grid-cols-1'>
      <CardImagePicker
        label={t('editDeck.termImage')}
        prompt={termPrompt}
        context={card.definition || undefined}
        value={card.termImageUrl}
        onChange={onTermImageChange}
      />
      <CardImagePicker
        label={t('editDeck.defImage')}
        prompt={definitionPrompt}
        context={card.term || undefined}
        value={card.definitionImageUrl}
        onChange={onDefinitionImageChange}
      />
    </div>
  );
}
