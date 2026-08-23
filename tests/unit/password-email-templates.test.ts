import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The two password mails, rendered for real.
 *
 * These messages went into the catalog, which means they go through ICU — and
 * ICU treats an apostrophe as an escape character and angle brackets as rich
 * text. French copy is full of apostrophes ("qu'une", "n'êtes"), so "it looks
 * fine in the JSON" is not evidence. This renders every message in every locale
 * and reads what comes out.
 *
 * `@/lib/email` is mocked globally in tests/setup.ts, so the real module is
 * pulled in with `importActual`; only the `resend` SDK underneath it is faked.
 */

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const LOCALES = ["en", "es", "fr"] as const;
const LINK = "https://unytea.com/auth/reset-password?token=deadbeef";

type Email = typeof import("@/lib/email");

async function emailModule(): Promise<Email> {
  return vi.importActual<Email>("@/lib/email");
}

/** The payload handed to Resend by one call. */
async function sent(
  which: "reset" | "set",
  locale: string,
  userName: string | null = "Ada"
): Promise<{ subject: string; html: string; text: string; from: string; to: string[] }> {
  const mod = await emailModule();
  const fn = which === "reset" ? mod.sendPasswordResetEmail : mod.sendSetPasswordEmail;
  await fn("ada@example.com", { userName, resetLink: LINK, locale });
  return send.mock.calls.at(-1)![0];
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "re_test_key";
  send.mockResolvedValue({ data: { id: "re_1" }, error: null });
});

// ───────────────────────────────────────────────────────────────────────────
describe("both mails render in every locale", () => {
  const CASES = LOCALES.flatMap((locale) =>
    (["reset", "set"] as const).map((which) => [which, locale] as const)
  );

  it.each(CASES)("%s / %s produces a subject, a body and a link", async (which, locale) => {
    const payload = await sent(which, locale);

    expect(payload.subject.trim()).not.toBe("");
    expect(payload.html).toContain(LINK);
    expect(payload.text).toContain(LINK);
    // ICU leaves its own placeholder syntax in the output when a message fails
    // to resolve; a raw brace means the copy did not render.
    expect(payload.html).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(payload.text).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(payload.html).not.toContain("email.password");
    expect(payload.subject).not.toContain("email.password");
  });

  it.each(CASES)("%s / %s greets the reader by name", async (which, locale) => {
    const payload = await sent(which, locale, "Ada");
    expect(payload.text).toContain("Ada");
    expect(payload.html).toContain("Ada");
  });

  it.each(CASES)("%s / %s greets a nameless account without a gap", async (which, locale) => {
    const payload = await sent(which, locale, null);
    // No "Hi ," and no literal "null" where the name would have been.
    expect(payload.text).not.toContain("null");
    expect(payload.text).not.toMatch(/\s,/);
    expect(payload.text.trim()).not.toBe("");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the two mails say different things", () => {
  it.each(LOCALES)("%s: the subjects differ", async (locale) => {
    const reset = await sent("reset", locale);
    const set = await sent("set", locale);
    expect(set.subject).not.toBe(reset.subject);
  });

  it.each(LOCALES)("%s: the call to action differs", async (locale) => {
    const reset = await sent("reset", locale);
    const set = await sent("set", locale);
    expect(set.html).not.toBe(reset.html);
  });

  it("the 'set' mail does not tell anyone to reset what they never had", async () => {
    // The point of the second template. English is asserted literally because
    // it is the copy the wording rule is about; the other locales are covered
    // by the subject/body difference above.
    const set = await sent("set", "en");
    expect(set.subject.toLowerCase()).toContain("set a password");
    expect(set.subject.toLowerCase()).not.toContain("reset");
    expect(set.html.toLowerCase()).not.toContain("reset your password");
  });

  it("the 'reset' mail still reads as a reset", async () => {
    const reset = await sent("reset", "en");
    expect(reset.subject.toLowerCase()).toContain("reset");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the copy is translated, not copied", () => {
  it.each(["es", "fr"] as const)("%s differs from English", async (locale) => {
    for (const which of ["reset", "set"] as const) {
      const en = await sent(which, "en");
      const other = await sent(which, locale);
      expect(other.subject, `${locale} ${which} subject`).not.toBe(en.subject);
      expect(other.html, `${locale} ${which} body`).not.toBe(en.html);
    }
  });

  it("falls back to English for a locale it does not have", async () => {
    const en = await sent("reset", "en");
    const junk = await sent("reset", "klingon");
    expect(junk.subject).toBe(en.subject);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("what the sender reports back", () => {
  it("reports success when Resend accepts it", async () => {
    const mod = await emailModule();
    const result = await mod.sendSetPasswordEmail("ada@example.com", {
      userName: "Ada",
      resetLink: LINK,
    });
    expect(result.success).toBe(true);
  });

  it("reports failure rather than throwing when Resend refuses", async () => {
    // This is the contract the route now depends on: `sendEmail` swallows and
    // returns, so a caller that ignores the return value cannot tell.
    send.mockResolvedValue({ data: null, error: { message: "API key is invalid" } });
    const mod = await emailModule();
    const result = await mod.sendPasswordResetEmail("ada@example.com", {
      userName: "Ada",
      resetLink: LINK,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("API key is invalid");
  });

  it("reports failure when there is no API key at all", async () => {
    // `getResend()` throws; `sendEmail` catches. The symptom in production was
    // a 200 with no mail and nothing in Resend's log.
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    const mod = await vi.importActual<Email>("@/lib/email");
    const result = await mod.sendPasswordResetEmail("ada@example.com", {
      userName: "Ada",
      resetLink: LINK,
    });
    expect(result.success).toBe(false);
  });
});
