// A recording session that waits for a review or is shared is locked: what it is made of (the
// session, its protocol, its animals) cannot be changed by its author. The API refuses it; the
// forms say it and stay closed. A published session is not locked: editing it updates its record
// in the repository, and files added to it make a new version.
export const LOCKED_STATUSES = ['waiting validation', 'shared'];

export const isLockedStatus = (status?: string | null) => LOCKED_STATUSES.includes(status ?? '');

/** Why it is locked and what to do, for the notice shown above a locked form. */
export function lockedExplanation(status?: string | null, what = 'This part') {
  if (status === 'waiting validation')
    return `This recording session waits for an administrator's review. ${what} cannot be changed meanwhile: withdraw the session from the list of "My vocalizations" to edit it.`;
  if (status === 'shared')
    return `This recording session is shared: it is public, so ${what.toLowerCase()} cannot be changed. An administrator can.`;
  return '';
}
