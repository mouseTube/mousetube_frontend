// Whether a session is locked for its author is decided by the API, never here: every session it
// sends carries `rights` (can_edit, can_withdraw, ...) and, when it is locked, the reason.
export interface SessionRights {
  can_edit: boolean;
  can_withdraw: boolean;
  can_share: boolean;
  can_delete: boolean;
  locked_reason: string;
}

type WithRights = { rights?: Partial<SessionRights> | null } | null | undefined;

/** The session cannot be changed by the user (a new session has no rights yet: it can). */
export const isLocked = (session: WithRights) => session?.rights?.can_edit === false;

/** Why it is locked and what to do, for the notice shown above a locked form. */
export const lockedReason = (session: WithRights) => session?.rights?.locked_reason ?? '';
