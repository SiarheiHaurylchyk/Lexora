import { useTranslation } from 'react-i18next';

import {
  MaterialsDeckCard,
  type MaterialsDeckCardProps,
} from './MaterialsDeckCard';

import type { CatalogSourceSection } from '@/shared/lib/cefrLevels';
import { cefrSubtitleKey, cefrTitleKey } from '@/shared/lib/cefrLevels';

const sectionTitleClasses = tw`mb-4 mt-10 font-display text-xl first:mt-0`;
const levelHeaderClasses = tw`border-border bg-surface/60 mb-4 flex items-center gap-4 rounded-2xl border px-4 py-3`;
const gridClasses = tw`grid gap-5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]`;
const listClasses = tw`flex flex-col gap-2.5`;

interface Props {
  sections: CatalogSourceSection[];
  view: 'grid' | 'list';
  savedMap: Map<number, number>;
  deckCardProps: Omit<
    MaterialsDeckCardProps,
    'deck' | 'ctx' | 'view' | 'isSaved'
  >;
}

/** Каталог материалов, сгруппированный по источнику и уровню CEFR. */
export function MaterialsCatalogByLevel({
  sections,
  view,
  savedMap,
  deckCardProps,
}: Props) {
  const { t } = useTranslation();
  const layoutClass = view === 'grid' ? gridClasses : listClasses;

  return (
    <div className='flex flex-col gap-2'>
      {sections.map((section) => (
        <div key={section.source}>
          <h2 className={sectionTitleClasses}>
            {section.source === 'platform'
              ? t('materials.sectionPlatform')
              : t('materials.sectionCommunity')}
          </h2>
          {section.levels.map(({ level, decks }) => (
            <section key={`${section.source}-${level}`} className='mb-8'>
              <div className={levelHeaderClasses}>
                <div className='bg-brand/15 text-brand-light font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold'>
                  {level === 'OTHER' ? '·' : level}
                </div>
                <div>
                  <h3 className='font-display m-0 text-base font-semibold'>
                    {t(cefrTitleKey(level))}
                  </h3>
                  <p className='text-text3 m-0 mt-0.5 text-sm'>
                    {t(cefrSubtitleKey(level))}
                  </p>
                </div>
                <span className='text-text3 ml-auto text-xs'>
                  {t('materials.levelDeckCount', { count: decks.length })}
                </span>
              </div>
              <div className={layoutClass}>
                {decks.map((deck) => (
                  <MaterialsDeckCard
                    key={deck.id}
                    deck={deck}
                    ctx='catalog'
                    view={view}
                    isSaved={savedMap.has(deck.id)}
                    {...deckCardProps}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
