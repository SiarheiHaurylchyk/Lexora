interface MaterialsDeckBadgesProps {
  /** CEFR text like "A1" or `null` if the deck has no level set. */
  cefrLabel: string | null;
  /** "Free" or formatted price like "$1.99". */
  priceLabel: string;
  /** When true, the price badge is colored as paid (yellow); else green. */
  isPaid: boolean;
}

const badgeClasses = tw`rounded-full bg-[rgba(255,255,255,0.18)] px-2.5 py-0.5 text-[11px] font-semibold text-white`;
const paidPriceColors = tw`!bg-[#fbbf24] !text-[#1f2937]`;
const freePriceColors = tw`!bg-[rgba(16,185,129,0.85)]`;

/**
 * Top-right corner badges on the catalog deck cover: optional CEFR pill
 * ("A1", "B2", …) and a price pill ("Free" / "$1.99").
 */
export function MaterialsDeckBadges({
  cefrLabel,
  priceLabel,
  isPaid,
}: MaterialsDeckBadgesProps) {
  return (
    <div className='absolute top-3 right-3 flex flex-wrap justify-end gap-1.5'>
      {cefrLabel && <span className={badgeClasses}>{cefrLabel}</span>}
      <span
        className={cn(badgeClasses, isPaid ? paidPriceColors : freePriceColors)}
      >
        {priceLabel}
      </span>
    </div>
  );
}
