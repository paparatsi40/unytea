/**
 * What to call a person, from whatever the row happens to carry.
 *
 * The same three-step precedence was written out by hand in `joinSession`, and
 * everywhere else in the product a name was needed the code read `user.name`
 * alone and appended `|| "Unknown"` — a hardcoded English word, in a product
 * that ships in three languages, for an account that very often has a perfectly
 * good `username` sitting one column over.
 *
 * Returns an empty string rather than a fallback, on purpose. A fallback is a
 * piece of copy: it has to be translated, and it differs by surface — the
 * nameless person in a participant list is a "Guest", the nameless one in a
 * reaction list is "Anonymous", and the host of a session is "the host". The
 * only thing this module can know is whether a name exists.
 */
export interface DisplayNameParts {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

export function resolveDisplayName(parts: DisplayNameParts | null | undefined): string {
  if (!parts) return "";

  const full = parts.name?.trim();
  if (full) return full;

  // Not `${first} ${last}`: either half can be missing, and a template would
  // produce a name with a leading or trailing space, which is not empty and so
  // would win over a perfectly good username.
  const composed = [parts.firstName, parts.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  if (composed) return composed;

  return parts.username?.trim() ?? "";
}
