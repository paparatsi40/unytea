/**
 * Password hashing parameters, in one place.
 *
 * The cost was 10, written as a bare literal at each of the two places that
 * hash a password. Two copies of a security parameter is one copy too many:
 * raising one and missing the other leaves half the accounts weaker than the
 * policy claims, and nothing would have said so.
 *
 * Raising it now is deliberate timing. Cost is baked into every stored digest,
 * so a change only affects hashes written afterwards — existing ones keep
 * verifying at whatever cost they were written with, and only move up when
 * their owner next logs in (see `authorizeCredentials`). Doing this before
 * launch means there is almost nothing to migrate.
 */

/**
 * bcrypt work factor. Each increment doubles the work.
 *
 * 12 costs roughly 230ms per hash on the current runtime, against 60ms at 10.
 * That is paid on sign-up, password reset, and each login — once, server-side —
 * and it multiplies an offline attacker's cost by four for every guess.
 */
export const BCRYPT_COST = 12;

/**
 * A valid bcrypt digest of 32 random bytes no user can supply, at exactly
 * `BCRYPT_COST`.
 *
 * `authorizeCredentials` compares against this when the account does not exist
 * or is OAuth-only, so the response takes the same time either way. The cost
 * encoded here has to track `BCRYPT_COST`: when real hashes moved to 12 and
 * this stayed at 10, comparing against it took 60ms while comparing against a
 * real hash took 230ms — and that gap is exactly the user-enumeration oracle
 * the constant exists to close, handed back over the network. A test asserts
 * the two agree.
 */
export const FAKE_BCRYPT_HASH = "$2a$12$PTzcSxEL4EjTzda6kC2xCeFcV2d2r0Ija84ReOmdrsy9jUJSX2OuW";
