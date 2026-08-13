/**
 * Safe serialization of JSON-LD for injection into a `<script>` tag.
 *
 * SEC-10. `JSON.stringify` escapes quotes and backslashes but NOT `<` or `/`,
 * so a value containing `</script><script>alert(1)</script>` terminates the
 * script block and executes. Every JSON-LD block on the public session and blog
 * pages carries user-controlled text -- session titles, host names, community
 * names, descriptions -- so this was a stored XSS reachable by anyone who can
 * create a community and a session.
 *
 * CSP does not mitigate it: the enforced policy still includes 'unsafe-inline'
 * in script-src. Next's <Script> component does not escape either, so the
 * escaping is the defence regardless of which tag is used.
 *
 * The emitted \uXXXX sequences are valid inside JSON strings and parse back to
 * the original characters, so consumers -- Google's crawler included -- see
 * exactly the intended values. Only the raw bytes in the HTML change.
 *
 * Escaped:
 * - `<` and `>` -- prevent `</script>` from terminating the block, and stop any
 *   tag from being formed.
 * - `&`         -- prevent HTML entity sequences from being reinterpreted.
 * - U+2028 / U+2029 -- legal in JSON but line terminators in JavaScript, so an
 *   unescaped one is a syntax error inside a script block.
 */

// Built at runtime rather than written as literals: a raw U+2028 in source is
// itself a line terminator, so embedding one here would break this file.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
};

const UNSAFE = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, "g");

/**
 * Serialize a value as JSON that is safe to place inside a `<script>` body.
 *
 * @returns the escaped JSON string, or `"null"` when the value is not
 *   serializable -- never `undefined`, so callers can always assign it to
 *   `__html` without producing the literal text "undefined" in the document.
 */
export function jsonLdSafe(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof json !== "string") return "null";

  return json.replace(UNSAFE, (char) => ESCAPES[char]);
}
