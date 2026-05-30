import { useTranslation } from 'react-i18next';

import { useSpeech } from '@/shared/hooks/useSpeech';

interface CardSpeakButtonProps {
  /** Text to play out loud (usually the term in the source language). */
  text: string;
  /** Language code of the text, e.g. "en" or "ru". */
  language: string;
  /** When true, play with the user's "slow" rate (used for the turtle button). */
  slow?: boolean;
  /** Caller-controlled class names. Lets the parent place the button anywhere. */
  className?: string;
}

/**
 * One small speaker button. The same component covers both the normal "🔊"
 * button and the slow "🐢" variant — the parent picks via the `slow` prop.
 * Visual styling is fully controlled by the parent through `className`.
 */
export function CardSpeakButton({
  text,
  language,
  slow = false,
  className,
}: CardSpeakButtonProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  const icon = slow ? '🐢' : '🔊';
  const tooltipKey = slow ? 'deck.pronounceTermSlow' : 'deck.pronounceTerm';

  return (
    <button
      type='button'
      className={className}
      title={t(tooltipKey)}
      onClick={() => speak(text, language, slow ? { slow: true } : undefined)}
    >
      {icon}
    </button>
  );
}
