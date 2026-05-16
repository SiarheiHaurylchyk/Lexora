import { useTranslation } from 'react-i18next';
import { Modal } from '@ui';

import type { ResolvedMistake } from '@/shared/lib/studyResults';

interface Props {
  mistakes: ResolvedMistake[];
  onClose: () => void;
}

/**
 * Модальное окно «Разбор ошибок» в конце сессии обучения.
 *
 * Показывает список ошибок: что спрашивали, какой ожидался ответ
 * и (если есть) что ввёл пользователь.
 */
export function StudyMistakesModal({ mistakes, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <Modal title={t('study.result.mistakesTitle')} onClose={onClose}>
      <ul className='flex max-h-[min(60vh,420px)] flex-col gap-3 overflow-y-auto pr-1'>
        {mistakes.map((mistake, i) => (
          <li
            key={`${mistake.question}-${mistake.expected}-${i}`}
            className='border-border bg-surface rounded-xl border p-4 text-left'
          >
            <div className='font-display text-lg font-semibold'>
              {mistake.question}
            </div>
            <p className='text-text3 mt-2 text-sm'>
              {t('study.result.expected')}:{' '}
              <span className='text-success font-medium'>
                {mistake.expected}
              </span>
            </p>
            {mistake.given != null && mistake.given !== '' && (
              <p className='text-text3 mt-1 text-sm'>
                {t('study.result.yourAnswer')}:{' '}
                <span className='text-danger font-medium'>{mistake.given}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
