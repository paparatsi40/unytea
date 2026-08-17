-- Normalize every stored email to its canonical form: trimmed, lowercased.
--
-- Sign-up stored the address exactly as typed while forgot-password looked it
-- up lowercased, so anyone who signed up with a capital letter could never
-- reset their password — silently, because that endpoint returns the same
-- message whether or not an account exists. The same mismatch made
-- `allowDangerousEmailAccountLinking` on Google a no-op for those rows: Google
-- sends the address lowercased, it never matched, and a second account was
-- created instead of the two being linked.
--
-- The application now normalizes on both sides of every lookup and write. This
-- migration brings existing rows in line with that.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- BEFORE PUSHING THIS: run prisma/sql/detect-duplicate-emails.sql against
-- production. `users.email` is UNIQUE, so if two rows differ only by case this
-- migration CANNOT succeed — those two rows have to become one first, and
-- deciding which data survives a merge is a product decision, not something a
-- migration can guess.
-- ─────────────────────────────────────────────────────────────────────────────

-- Guard. Postgres would otherwise fail the UPDATE below on the unique index
-- with `duplicate key value violates unique constraint "users_email_key"`,
-- which says nothing about which rows or what to do. This aborts first, before
-- a single row is touched, and names the file that lists them.
--
-- The whole migration runs in one transaction, so an abort here leaves the
-- database exactly as it was — the deploy fails, the data does not change.
DO $$
DECLARE
  duplicate_groups int;
BEGIN
  SELECT count(*) INTO duplicate_groups
  FROM (
    SELECT lower(btrim(email))
    FROM users
    GROUP BY 1
    HAVING count(*) > 1
  ) AS d;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'Refusing to normalize emails: % case-insensitive duplicate group(s) in users.email. Merge them first — see prisma/sql/detect-duplicate-emails.sql. No rows were changed.',
      duplicate_groups;
  END IF;
END $$;

-- Only the rows that actually differ. Rewriting every row would churn the
-- table and its index for no reason.
UPDATE users
SET email = lower(btrim(email))
WHERE email <> lower(btrim(email));

-- Password reset tokens carry a copy of the address from when they were issued.
-- A token minted minutes before this migration would otherwise stop resolving
-- to its user. (The application also normalizes on read, so this is belt and
-- braces — tokens expire in an hour either way.)
UPDATE password_reset_tokens
SET email = lower(btrim(email))
WHERE email <> lower(btrim(email));
