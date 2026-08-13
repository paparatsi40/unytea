# Unytea — Remediation Prompt 05: the "trigger" block (SEC-06, SEC-07, SEC-10)

These are the last security items before the product can meet a real member who is not the owner. They are API-route and rendering issues, so the Server Action seam does not cover them. All three defects were re-verified present and unchanged on the merged `main`.

**Branch:** create `remediation/02-trigger-block` off the current `main` (the merged security branch, HEAD `b9817bfe`).

**Standing directive:** no shortcuts, no patches — every fix removes the root cause and ships with a test verified failing against the unfixed code first. **Guardrails:** never run `npm run build` (it hits the live DB) — use `npx next build`; never touch the live database; keep `npm run type-check`, `npm run test`, `npx next build`, `npm audit --omit=dev`, `npm run lint` green after each fix; work on the branch, do not push.

**Investigate callers first for SEC-06 and SEC-07.** Both endpoints may have few or zero real callers (recall `issueCertificate` had none). For each: find who calls it. If an endpoint is dead, the root-cause fix is to remove it, not harden it. If it is used, harden per below — and if doing so requires client-side changes larger than expected, STOP and report rather than leaving a broken flow or taking a shortcut.

---

## SEC-06 — Pusher: cross-tenant channel authorization and event injection
`app/api/pusher/route.ts`.

**POST (private-channel auth, ~15–45):** the handler parses `private-channel-(\w+)`, then `void _channelId` — it discards the id and authorizes *any* authenticated user for *any* private channel. The comment "Intentionally unused - channel ID validated" is false.
**Fix:** determine what the id in `private-channel-{id}` refers to (inspect how the client subscribes — is it a `Channel` id, a community id, a conversation id?). Resolve it to the owning community (reuse `lib/actions/resolvers.ts` where possible), and authorize the socket only if the caller is an ACTIVE member of that community (for a DM/conversation channel, only if the caller is a participant). Return 403 otherwise. Never call `authorizeChannel` before that check passes.

**PUT (trigger, ~48–70):** any authenticated user can `pusher.trigger(channel, event, data)` with a fully client-controlled channel, event name and payload — cross-tenant event injection (fake `message:new`, presence, typing into any community).
**Fix (root cause):** remove the free-form client trigger. Emit Pusher events only from server-side paths that have already authorized the underlying action (i.e. from inside the relevant Server Actions, after the seam has passed). For events that genuinely originate on the client (e.g. typing indicators), replace the free-form endpoint with a narrow named emitter that (a) accepts only an allowlisted set of event types, and (b) verifies the caller is an ACTIVE member of the target channel's community before emitting. Do not accept an arbitrary `channel`/`event` from the client.

**Tests:** a member of community A cannot authorize a private channel owned by B (nor a conversation they are not part of); a non-member cannot emit into a channel; any surviving named emitter rejects a non-member and a non-allowlisted event type.

---

## SEC-07 — `POST /api/email/send`: open, unauthorized transactional-email relay
`app/api/email/send/route.ts`.

The handler authenticates (line 14) but never authorizes — the comment "Only admins/hosts can send invite/recap emails" is unenforced. There is no Zod schema and no rate limit, and it trusts the client to supply the recipient (`to`), the `communityName`, the `joinLink`, and the entire recap body. One free account can drive unlimited branded invite/phishing email from the verified Resend domain.

**Fix (invert the trust — the client sends IDs, the server derives content):**
- Add a Zod schema for the body.
- **community-invite:** take a `communityId` (not a display name / link). Verify the caller is OWNER/ADMIN of that community. Derive `communityName` and `joinLink` server-side from the DB — never from client input.
- **session-recap:** take a `sessionId`. Verify the caller hosts/owns that session (or is community OWNER/ADMIN). Derive the recap content and recipient(s) server-side.
- **welcome:** restrict to the caller's own address (`to` must equal the session user's email), or — if it is only ever sent by the signup flow server-side — remove it from this client-callable route entirely (check callers).
- Attach a rate limiter keyed on the caller's user id.

**Tests:** a non-owner cannot send an invite for a community they do not administer; a non-host cannot send a recap for a session they do not own; the endpoint refuses to send using client-supplied community name / join link (those are derived server-side); the rate limiter engages.

---

## SEC-10 — Stored XSS via unescaped JSON-LD
`JSON.stringify` does not escape `<` or `/`, so injecting its output into a `<script>` via `dangerouslySetInnerHTML` lets a value containing `</script><script>…` break out. CSP does not mitigate this (`script-src` includes `'unsafe-inline'`).

Confirmed at `components/sessions/SessionJsonLd.tsx` (three injections, carrying `session.title`, `session.host.name`, `session.community.name`, `session.description`). **Find every other JSON-LD injection site** (grep for `dangerouslySetInnerHTML` used with `JSON.stringify` — the audit noted `app/[locale]/blog/[slug]/page.tsx` and `app/layout.tsx` among ~8 total) and fix all of them.

**Fix:** a single shared serializer — e.g. `lib/json-ld.ts` `jsonLdSafe(obj)` returning `JSON.stringify(obj)` with `<`, `>`, `&`, ` `, ` ` replaced by their `\uXXXX` escapes — applied at every JSON-LD `__html`. (Next's `<Script>` does not auto-escape either, so the escaping is the defense regardless of the tag used.)

Separately, **delete the naive regex `sanitizeHtml` at `lib/validations.ts` (~line 164)** — a bypassable footgun (`<scr<script>ipt>`) sitting next to the real `lib/sanitize.ts`. Confirm it has zero callers first (repoint any to `lib/sanitize.ts`).

**Tests:** a session title / community name containing `</script><script>alert(1)</script>` (and an ` ` case) is serialized with `<` escaped so it cannot terminate the script block; a test asserts `lib/sanitize.ts` is the only HTML sanitizer left.

---

## Hand back
Per finding: whether the endpoint was dead (removed) or live (hardened), what changed, and the test name covering it. For SEC-06/SEC-07, note any client-side change made. All five gates green. After this, the trigger block is closed and the product is ready for a controlled first-member launch (the remaining audit items are post-launch hardening).
