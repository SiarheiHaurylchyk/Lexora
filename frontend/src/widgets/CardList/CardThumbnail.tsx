interface CardThumbnailProps {
  /** Image URL to show. When empty, a dashed placeholder is shown. */
  imageUrl?: string;
}

const thumbnailClasses = tw`border-border h-12 w-12 rounded-[10px] border object-cover`;
const placeholderClasses = tw`border-border bg-bg text-text3 flex h-12 w-12 items-center justify-center rounded-[10px] border border-dashed text-lg`;

/**
 * Small square preview of the card image used in the collapsed card row.
 * Falls back to a "🃏" placeholder when no image is set.
 */
export function CardThumbnail({ imageUrl }: CardThumbnailProps) {
  if (imageUrl) {
    return <img src={imageUrl} alt='' className={thumbnailClasses} />;
  }
  return (
    <div className={placeholderClasses} aria-hidden>
      🃏
    </div>
  );
}
