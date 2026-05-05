/**
 * Join CSS class names while skipping false / undefined / null / empty values.
 * Usage:
 *   classNames('btn', isOpen && 'btn-open', maybeError && styles.error)
 */
export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
