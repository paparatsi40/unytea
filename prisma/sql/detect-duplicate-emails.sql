-- ═══════════════════════════════════════════════════════════════════════════
-- READ ONLY. Run this against production BEFORE pushing the email
-- normalization branch. It writes nothing — SELECT only.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Vercel's build runs `prisma migrate deploy`, so the normalization migration
-- applies by itself the moment the branch is pushed. `users.email` is UNIQUE,
-- and lowercasing two rows that differ only by case would collide on that
-- index. The migration guards against it and aborts cleanly, but a failed
-- migration is a failed deploy — so find out here, not there.
--
--   EMPTY RESULT  → nothing to merge. Safe to push.
--   ANY ROWS      → STOP. Each row is a group of accounts that are one person
--                   as far as every mail provider is concerned. They must be
--                   merged into one before the migration can run, and which
--                   account survives (and what happens to the other one's
--                   communities, memberships, posts, subscriptions) is a
--                   product decision. Do not delete rows to make the migration
--                   pass.

-- ── 1. The groups themselves ────────────────────────────────────────────────
SELECT
  lower(btrim(email))                        AS canonical_email,
  count(*)                                   AS account_count,
  array_agg(email ORDER BY "createdAt")      AS stored_variants,
  array_agg(id ORDER BY "createdAt")         AS user_ids,
  array_agg("createdAt" ORDER BY "createdAt") AS created_at,
  -- Which of them can actually sign in with a password, and which arrived
  -- through OAuth. A group where only one row has a password is usually the
  -- easy case; two passwords means two people set credentials independently.
  count(*) FILTER (WHERE password IS NOT NULL) AS with_password
FROM users
GROUP BY lower(btrim(email))
HAVING count(*) > 1
ORDER BY count(*) DESC, canonical_email;

-- ── 2. How much data hangs off each duplicate, to size the merge ────────────
-- Run this only if the query above returned rows. It shows what would have to
-- be reassigned or dropped when two accounts become one.
--
-- SELECT
--   u.id,
--   u.email,
--   u."createdAt",
--   u.password IS NOT NULL                                   AS has_password,
--   (SELECT count(*) FROM accounts a WHERE a."userId" = u.id)         AS oauth_accounts,
--   (SELECT count(*) FROM communities c WHERE c."ownerId" = u.id)     AS communities_owned,
--   (SELECT count(*) FROM members m WHERE m."userId" = u.id)          AS memberships,
--   (SELECT count(*) FROM posts p WHERE p."authorId" = u.id)          AS posts
-- FROM users u
-- WHERE lower(btrim(u.email)) IN (
--   SELECT lower(btrim(email)) FROM users GROUP BY 1 HAVING count(*) > 1
-- )
-- ORDER BY lower(btrim(u.email)), u."createdAt";

-- ── 3. Rows the migration will rewrite, whether or not there are duplicates ──
-- Purely informational: how many addresses are not already canonical.
--
-- SELECT count(*) AS rows_to_normalize
-- FROM users
-- WHERE email <> lower(btrim(email));
