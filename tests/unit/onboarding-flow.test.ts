import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * UX_REVIEW Tier 2 — onboarding friction, swallowed errors, and plan copy that
 * oversold the product.
 *
 * Four separate defects met in one screen:
 *   - the goals step was a required free-text essay, three screens into signup;
 *   - a failed save redirected to /dashboard anyway, telling the user they were
 *     set up while their name, role and interests had been discarded;
 *   - the wizard ended by asking a brand-new user to pick a $49 or $149 plan
 *     before they had seen anything, priced off Stripe env vars that are set
 *     nowhere — so a paid pick fell through to the free plan in silence;
 *   - the Free plan advertised "Direct messaging with members", which the
 *     product has never allowed.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const LOCALES = ["en", "es", "fr"] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/** Source with comments stripped — they legitimately quote what was removed. */
function code(relativePath: string): string {
  return read(relativePath)
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function messages(locale: string): Record<string, unknown> {
  return JSON.parse(read(`locales/${locale}.json`));
}

/** Read a dotted key path out of a catalog, e.g. "onboarding.errors.retry". */
function at(locale: string, keyPath: string): unknown {
  return keyPath
    .split(".")
    .reduce<unknown>(
      (node, key) => (node as Record<string, unknown> | undefined)?.[key],
      messages(locale)
    );
}

const wizard = code("app/onboarding/page.tsx");

/**
 * Item 1 — the Free plan claimed member-to-member DMs.
 *
 * `canUsersDirectMessage` requires exactly one of the pair to be OWNER of the
 * community (an XOR), so member ↔ member is refused outright. The copy is the
 * thing that was wrong, not the rule.
 */
describe("no surface claims member-to-member direct messaging", () => {
  it("the rule really is host<->member only", () => {
    // If this ever changes, the copy below becomes correct and these tests
    // should be revisited rather than deleted.
    const actions = read("app/actions/messages.ts");
    expect(actions).toContain("senderIsOwner !== recipientIsOwner");
  });

  it.each(LOCALES)("%s makes no member-to-member DM claim", (locale) => {
    const raw = read(`locales/${locale}.json`);
    expect(raw).not.toMatch(
      /direct messaging with members|mensajer[ií]a directa con miembros|messagerie directe avec les membres/i
    );
  });

  it("the documentation page says hosts and members", () => {
    const docs = read("app/[locale]/documentation/page.tsx");
    expect(docs).not.toContain("Direct messaging between members");
    expect(docs).toContain("Direct messaging between hosts and members");
  });
});

/** Item 2 — the goals step must no longer block. */
describe("the goals step is optional", () => {
  it("step 3 always validates", () => {
    // The switch case is the gate; anything but an unconditional pass here
    // means a user can still be stuck behind a text box.
    const validator = wizard.slice(
      wizard.indexOf("const isStepValid"),
      wizard.indexOf("if (isLoading)")
    );
    expect(validator).toMatch(/case 3:\s*return true;/);
    expect(validator).not.toContain("formData.goals");
  });

  it("keeps the field itself", () => {
    // Optional, not removed — the API still composes a bio from it.
    expect(wizard).toContain("formData.goals");
    expect(wizard).toContain('t("steps.3.goalsPlaceholder")');
  });

  it("labels it optional so the user knows they can skip", () => {
    expect(wizard).toContain('t("steps.3.optionalLabel")');
  });

  it.each(LOCALES)("%s has the optional label", (locale) => {
    expect(at(locale, "onboarding.steps.3.optionalLabel")).toBeTruthy();
  });

  it("still requires the fields that are actually needed", () => {
    // Making one step optional must not quietly disable the others.
    const validator = wizard.slice(
      wizard.indexOf("const isStepValid"),
      wizard.indexOf("if (isLoading)")
    );
    expect(validator).toContain("formData.fullName.trim().length > 0");
    expect(validator).toContain("formData.role.trim().length > 0");
    expect(validator).toContain("formData.interests.length >= 1");
  });
});

/** Item 3 — a failed save must be visible, not redirected past. */
describe("a failed save is surfaced instead of swallowed", () => {
  const handler = wizard.slice(
    wizard.indexOf("const handleComplete"),
    wizard.indexOf("const isStepValid")
  );

  it("checks the response before doing anything else", () => {
    expect(handler).toContain("if (!response.ok)");
  });

  it("does not redirect on a failed response", () => {
    // The old code called router.push("/dashboard") regardless of response.ok.
    const failureBranch = handler.slice(
      handler.indexOf("if (!response.ok)"),
      handler.indexOf("router.push")
    );
    expect(failureBranch).toContain("setSaveError");
    expect(failureBranch).toContain("return;");
  });

  it("does not redirect when the request throws", () => {
    const catchBlock = handler.slice(handler.indexOf("} catch"));
    expect(catchBlock).toContain("setSaveError");
    expect(catchBlock).not.toContain("router.push");
  });

  it("redirects exactly once, on the success path only", () => {
    expect(handler.match(/router\.push\(/g)).toHaveLength(1);
  });

  it("renders the failure as an announced alert with a retry", () => {
    expect(wizard).toContain('role="alert"');
    expect(wizard).toContain("saveError &&");
    expect(wizard).toContain('t("errors.retry")');
  });

  it("re-enables the button so the retry is possible", () => {
    // Leaving isSubmitting true would disable the only way forward.
    const failureBranch = handler.slice(handler.indexOf("if (!response.ok)"));
    expect(failureBranch).toContain("setIsSubmitting(false)");
  });

  it.each(LOCALES)("%s has every error string the wizard can show", (locale) => {
    for (const key of ["title", "saveFailed", "invalidDetails", "network", "retry"]) {
      expect(
        at(locale, `onboarding.errors.${key}`),
        `${locale}.onboarding.errors.${key}`
      ).toBeTruthy();
    }
  });
});

/** Item 4 — the plan decision leaves onboarding. */
describe("onboarding no longer asks for money", () => {
  it("has four steps, ending on interests", () => {
    expect(wizard).toContain("number: 4");
    expect(wizard).not.toContain("number: 5");
    expect(wizard).toContain("InterestSelector");
  });

  it("references no plan, price or checkout", () => {
    for (const token of [
      "selectedPlan",
      "NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID",
      "NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID",
      "/api/stripe/checkout",
      "priceId",
    ]) {
      expect(wizard, `wizard should not mention ${token}`).not.toContain(token);
    }
  });

  it("ends on a neutral label, not a trial pitch", () => {
    expect(wizard).toContain('t("navigation.getStarted")');
    expect(wizard).not.toContain("navigation.startTrial");
    expect(wizard).not.toContain("navigation.startFree");
  });

  it.each(LOCALES)("%s drops the plan step and its labels", (locale) => {
    expect(at(locale, "onboarding.steps.5")).toBeUndefined();
    expect(at(locale, "onboarding.navigation.startTrial")).toBeUndefined();
    expect(at(locale, "onboarding.navigation.startFree")).toBeUndefined();
    expect(at(locale, "onboarding.navigation.getStarted")).toBeTruthy();
  });

  it("sends the API only what the API accepts", () => {
    // The route's Zod schema has no selectedPlan; it was always stripped.
    const route = read("app/api/user/onboarding/route.ts");
    expect(route).not.toContain("selectedPlan");
    expect(wizard).toContain("interests: formData.interests");
  });
});

/**
 * The decision did not disappear — it moved to the point where the user has a
 * reason to make it. The wall already existed; these pin it in place.
 */
describe("the plan decision lives at community creation", () => {
  const createPage = read("app/(dashboard)/dashboard/communities/new/page.tsx");

  it("checks the plan allowance before showing the wizard", () => {
    expect(createPage).toContain("checkCommunityPlanLimit");
    expect(createPage).toContain("!planCheck.canCreate");
  });

  it("routes the blocked user to the upgrade surface", () => {
    expect(createPage).toContain('router.push("/dashboard/upgrade")');
    expect(createPage).not.toContain("/dashboard/settings/billing");
  });

  it("is enforced server-side too, not just in the UI", () => {
    // A client-only gate is a suggestion; the action refuses independently.
    const communities = read("app/actions/communities.ts");
    expect(communities).toContain("PLAN_LIMIT_COMMUNITIES");
    expect(createPage).toContain("PLAN_LIMIT_COMMUNITIES");
  });

  it("keeps checkout and the paid tiers intact", () => {
    // "Relocate the decision" must not become "delete the paid product".
    expect(fs.existsSync(path.join(REPO_ROOT, "app/api/stripe/checkout/route.ts"))).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, "app/(dashboard)/dashboard/upgrade/page.tsx"))).toBe(
      true
    );
    for (const locale of LOCALES) {
      const tiers = at(locale, "billing.tiers") as Record<string, unknown>;
      expect(Object.keys(tiers)).toEqual(["creator", "business", "pro"]);
    }
  });

  it("keeps the trial messaging on the upgrade surface", () => {
    const upgrade = read("app/(dashboard)/dashboard/upgrade/page.tsx");
    expect(upgrade).toContain('t("headerSubtitle")');

    expect(at("en", "billing.pricing.headerSubtitle")).toMatch(/14-day free trial/i);
    expect(at("en", "billing.pricing.headerSubtitle")).toMatch(/no credit card/i);

    for (const locale of LOCALES) {
      expect(
        at(locale, "billing.pricing.headerSubtitle"),
        `${locale} trial messaging`
      ).toBeTruthy();
      expect(at(locale, "billing.pricing.trialNoCC"), `${locale} no-card messaging`).toBeTruthy();
    }
  });
});
