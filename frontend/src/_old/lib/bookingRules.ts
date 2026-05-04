/** Hours before lesson start within which the learner may no longer cancel (server uses the same rule). */
export const LEARNER_CANCEL_MIN_HOURS_BEFORE = 24;

/**
 * Whether the learner may cancel this booking (must match server: start strictly after now + 24h).
 */
export function canLearnerCancelBooking(startTimeIso: string): boolean {
  const start = new Date(startTimeIso).getTime();
  if (Number.isNaN(start)) return false;
  const deadline = Date.now() + LEARNER_CANCEL_MIN_HOURS_BEFORE * 60 * 60 * 1000;
  return start > deadline;
}
