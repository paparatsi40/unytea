# Unytea — Community Feed: options for preventing member self-promotion

**Context.** The security remediation already closed every *push* channel a member could use to reach other members: direct messages are host↔member only, live sessions are owner-only, notifications are internal, and the open email relay is gone. **The community feed is the one lateral surface left** — and it's different from the others: members posting *is* the community. So the goal here is not to lock it down but to stop a member from using it to promote their own products/services to your members, with the smallest possible hit to legitimate discussion.

---

## Current state (read from the code)

- **Posts** (`createPost`): any ACTIVE member can post to their community's feed. Content up to 50,000 chars, optional title, plus an `attachments` JSON blob that can carry links. `contentType` is chosen by the client among DISCUSSION / QUESTION / ANNOUNCEMENT / RESOURCE — so a member can self-label a post an **ANNOUNCEMENT**. Posts publish instantly (`isPublished: true`): **no approval queue**. A generic per-user "create" rate limit applies. **No link/URL filtering** anywhere.
- **Comments** (`createComment`): any member, up to 10,000 chars — the same promotion surface (a comment plus a link).
- **Profile** (`User.bio`, `tagline`, `website`): a member can put a pitch and a link here. It's *passive* — visible in the member directory and on the profile, not pushed into anyone's feed.
- **Moderation that already exists**: owner/admin/moderator can delete any post or comment and pin posts; members can report content (the report queue is now correctly gated); posts have an `isLocked` flag. There is no pre-publish moderation.

> **Verify before choosing a link policy:** how is post/comment content rendered — plain text, or rich text / HTML? That decides whether a pasted link is even clickable (how much teeth the promo vector has), and — if content is rendered through `dangerouslySetInnerHTML` without sanitization — it would be a latent stored-XSS in the feed on top of the promotion question. This is step 1 of implementation whichever policy you pick.

---

## The levers (independent — mix and match)

**A — Link controls. The highest-leverage, lowest-collateral lever.** Promotion almost always needs a link; discussion rarely does. Least → most strict:
- render member links as plain text and/or `nofollow` (kills SEO value, link still shows);
- strip external links from member posts/comments (owner/admin/moderator exempt);
- domain allowlist: the owner configures allowed domains; others are stripped or held;
- hold any member post containing an external link for owner approval.

**B — New-member probation.** Spam accounts join and post immediately. Gate *links* (not posting itself) behind a short tenure or a few clean posts — e.g. no external links until 3 days ACTIVE or 3 prior non-flagged posts. Cheap, and it targets exactly the drive-by pattern.

**C — Post-approval queue.** Owner approves member posts before they're visible. Strongest, but highest friction — it removes the real-time feel that makes a feed a feed. Best as a **per-community toggle** (a curated community opts in), or scoped to *only* new members / posts-with-links (a hybrid that keeps most of the protection and little of the friction).

**D — Announcement restriction.** Limit `contentType: ANNOUNCEMENT` to owner/admin/moderator; members keep DISCUSSION / QUESTION / RESOURCE. An announcement shouldn't be a member megaphone. Roughly a one-line change.

**E — Profile links.** `nofollow` or disallow links in a member's `bio`/`website`. Passive, lower urgency.

**F — Rate + reports.** A tighter posts-per-member-per-day cap for new members, and lean on the existing report system — optionally auto-hide a post after N pending reports pending owner review.

---

## Recommended default posture

For a community product you don't want to over-lock, keep **posting open** (members discussing is the whole point) and put the controls on *promotion specifically*:

1. **A + B together — the core.** External links from members are held for owner approval (or stripped) **until** the member clears a short probation; owner/admin/moderator are always exempt; the owner can allowlist domains. This stops promotion cold and leaves discussion untouched.
2. **D — lock ANNOUNCEMENT to staff.** Cheap and obvious.
3. **C offered as an optional per-community toggle** for owners who want a fully curated feed — **off by default**.
4. **E + F as light polish**, later.

This hits the exact behavior you named — a member reaching your members to sell their thing — with the smallest cost to the community you're trying to grow.

---

## What I need from you to turn this into an implementation prompt

1. **Posture:** the recommended default above, a more curated stance (approval queue on by default), or a minimal one (just tighter rate limits + reports)?
2. **Link strictness (lever A):** nofollow / strip / allowlist / hold-for-approval — which?
3. Then implementation step 1 is the rendering check above, and the rest follows from your two answers.
