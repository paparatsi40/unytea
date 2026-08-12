/**
 * The failure shape every Server Action can return once it goes through
 * `defineAction`.
 *
 * Chosen to union cleanly with the `{ success: false, error: string }` shape the
 * existing actions already return, so call sites that branch on
 * `if (!result.success)` keep working unchanged while gaining a machine-readable
 * `code`.
 */
export type ActionErrorCode =
  | "UNAUTHORIZED" // no authenticated caller
  | "FORBIDDEN" // authenticated, but not permitted on this resource
  | "VALIDATION" // input failed its Zod schema
  | "RATE_LIMITED" // too many calls from this identity
  | "NOT_FOUND" // the resource the authorization decision hangs on is missing
  | "PAYWALL_LOCKED" // community is locked pending its owner's billing
  | "INTERNAL"; // unexpected failure; captured to Sentry

export interface ActionFailure {
  success: false;
  error: string;
  code: ActionErrorCode;
  /** Field-level detail, present only for VALIDATION failures. */
  issues?: Record<string, string[]>;
}

export function actionFailure(
  code: ActionErrorCode,
  error: string,
  issues?: Record<string, string[]>
): ActionFailure {
  return issues ? { success: false, error, code, issues } : { success: false, error, code };
}

/** Narrowing helper for call sites that want to branch on the seam's failures. */
export function isActionFailure(value: unknown): value is ActionFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success: unknown }).success === false &&
    "code" in value
  );
}
