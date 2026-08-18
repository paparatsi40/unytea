import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  PLAN_LIMITS,
  PLAN_PRICING,
  PLATFORM_FEE_PERCENT,
  PAID_PLANS,
  getPlatformFeePercent,
  hasAnyAnnualPricing,
  percentToRate,
} from "@/lib/plans";

/**
 * The pricing surface advertised things that were not true.
 *
 * The commission had three sources that disagreed. The marketing cards said
 * Creator 8% / Business 5% / Pro 3%; `PLAN_LIMITS.transactionFee` said
 * 0.05 / 0.02 / 0; and `PLATFORM_FEE_BY_PLAN` — copied verbatim into three
 * Stripe route files — said 5 / 2 / 0. The last one is the truth, because it is
 * the value that reaches `application_fee_percent`. So a Pro host was quoted 3%
 * and charged 0%, and a Creator was quoted 8% and charged 5%.
 *
 * The cards also advertised concurrent-participant caps that exist in no
 * enforcement path, and an annual price whose Stripe id may not be configured —
 * a number you can click and then cannot buy.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * Source with comments stripped. Several of these files legitimately quote the
 * old behaviour in a comment explaining why it changed; a scanner that cannot
 * tell the explanation from the thing explained would force the explanation to
 * be deleted.
 */
function code(relativePath: string): string {
  return read(relativePath)
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (![".next", "node_modules"].includes(entry.name)) walkTsx(p, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

function locale(name: string) {
  return JSON.parse(read(`locales/${name}.json`));
}

const LOCALES = ["en", "es", "fr"] as const;

/**
 * The assertion the whole change exists for: what a host is shown must be what
 * Stripe will charge them.
 */
describe("the advertised commission equals the applied commission", () => {
  it.each(PAID_PLANS)("%s: card percent === application_fee_percent", (plan) => {
    // The card renders PLATFORM_FEE_PERCENT[plan]; the checkout routes resolve
    // the same number through getPlatformFeePercent(plan.name).
    const shown = PLATFORM_FEE_PERCENT[plan];
    const applied = getPlatformFeePercent(plan);

    expect(shown).toBe(applied);
  });

  it("resolves the plan name case-insensitively, as the DB stores it", () => {
    // plan.name comes back lower-cased from the subscription record.
    expect(getPlatformFeePercent("creator")).toBe(5);
    expect(getPlatformFeePercent("Business")).toBe(2);
    expect(getPlatformFeePercent("PRO")).toBe(0);
    expect(getPlatformFeePercent("start")).toBe(8);
  });

  it("keeps the pre-existing 5% fallback for an unknown plan", () => {
    // Not a new decision — preserved from the code this replaced.
    expect(getPlatformFeePercent(null)).toBe(5);
    expect(getPlatformFeePercent(undefined)).toBe(5);
    expect(getPlatformFeePercent("nonsense")).toBe(5);
  });

  it("PLAN_LIMITS derives its rate from the same number", () => {
    // Two representations, one arithmetic. transactionFee used to be typed out
    // by hand and had drifted into a third opinion.
    for (const plan of ["START", ...PAID_PLANS] as const) {
      expect(PLAN_LIMITS[plan].transactionFee).toBe(percentToRate(PLATFORM_FEE_PERCENT[plan]));
    }
  });

  it("the values themselves are what Stripe applies", () => {
    // Pinned explicitly so a future edit has to be deliberate.
    expect(PLATFORM_FEE_PERCENT).toEqual({ START: 8, CREATOR: 5, BUSINESS: 2, PRO: 0 });
  });

  it("no route keeps a private copy of the fee table", () => {
    // Three identical copies is three chances for a pricing change to land in
    // two of them.
    const routes = [
      "app/api/stripe/community-checkout/route.ts",
      "app/api/stripe/community-checkout-start/route.ts",
      "app/api/stripe/course-checkout/route.ts",
    ];
    for (const route of routes) {
      const source = read(route);
      expect(source, `${route} should not redefine the table`).not.toContain(
        "PLATFORM_FEE_BY_PLAN"
      );
      expect(source, `${route} should use the shared resolver`).toContain("getPlatformFeePercent");
    }
  });

  it("the cards read the fee rather than restating it", () => {
    const section = read("components/marketing/PricingSection.tsx");
    expect(section).toContain("PLATFORM_FEE_PERCENT[tier.plan]");
    // The old literals must not survive anywhere in the card layer.
    expect(section).not.toMatch(/commissionPercent:\s*\d/);
  });
});

describe("zero commission is presented as a feature", () => {
  it("Pro is actually zero", () => {
    expect(PLATFORM_FEE_PERCENT.PRO).toBe(0);
  });

  it("the card renders a distinct positive line at 0%", () => {
    // "+ 0% commission on member revenue" buries the best thing on the card in
    // the same grey footnote as a cost.
    const card = read("components/marketing/PricingCard.tsx");
    expect(card).toContain("commissionPercent === 0");
    expect(card).toContain('t("commissionZero")');
  });

  it.each(LOCALES)("%s has the copy", (name) => {
    const copy = locale(name).billing.pricing.commissionZero as string;
    expect(copy).toBeTruthy();
    expect(copy).toContain("0%");
  });
});

describe("annual billing cannot be clicked when it is not configured", () => {
  it("reports whether any plan has an annual price id", () => {
    // In an environment with no *_PRICE_ID_YEARLY set, this is false and the
    // interval toggle is not rendered at all.
    expect(typeof hasAnyAnnualPricing()).toBe("boolean");
    expect(hasAnyAnnualPricing()).toBe(
      PAID_PLANS.some((plan) => PLAN_PRICING[plan].stripePriceIdAnnual !== "")
    );
  });

  it("the toggle is hidden when annual is not offered anywhere", () => {
    const section = read("components/marketing/PricingSection.tsx");
    expect(section).toContain("hasAnyAnnualPricing()");
    expect(section).toContain('!annualOffered && "hidden"');
    // And the interval can never be "annual" while unoffered.
    expect(section).toContain('annualOffered ? interval : "monthly"');
  });

  it("a card with no price id for the selected interval disables its CTA", () => {
    const card = read("components/marketing/PricingCard.tsx");
    expect(card).toContain('const unavailable = priceId === ""');
    expect(card).toContain("disabled={isLoading || unavailable}");
  });

  it("says why, instead of failing after the click", () => {
    // The old behaviour was a toast reading "Stripe price ID not configured"
    // AFTER the visitor committed to the plan.
    const card = code("components/marketing/PricingCard.tsx");
    expect(card).toContain('t("intervalUnavailable")');
    expect(card).not.toContain("Stripe price ID not configured");
  });

  it.each(LOCALES)("%s has the unavailable copy", (name) => {
    expect(locale(name).billing.pricing.intervalUnavailable).toBeTruthy();
  });
});

describe("the cards do not advertise limits nothing enforces", () => {
  it("PLAN_LIMITS still has no participant field", () => {
    // If one is ever added, these claims can come back.
    expect(Object.keys(PLAN_LIMITS.CREATOR)).not.toContain("maxConcurrentParticipants");
  });

  it.each(LOCALES)("%s tier features make no participant-cap claim", (name) => {
    const tiers = locale(name).billing.tiers as Record<string, { features: string[] }>;
    const offenders: string[] = [];

    for (const [tier, value] of Object.entries(tiers)) {
      for (const feature of value.features) {
        if (/\b(100|300|1000)\b/.test(feature) || /participant|participante/i.test(feature)) {
          offenders.push(`${tier}: ${feature}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it.each(LOCALES)("%s still lists real features", (name) => {
    // Guard against the removal having emptied the cards — but only that.
    //
    // This asked for more than two per tier, which turned out to be pressure in
    // the wrong direction: Business survives the honesty audit with a single
    // true bullet, because the only thing it actually buys over Creator is the
    // lower transaction fee, and that is rendered separately by the card. A
    // threshold that demands three is a threshold that rewards inventing a
    // third.
    const tiers = locale(name).billing.tiers as Record<string, { features: string[] }>;
    for (const [tier, value] of Object.entries(tiers)) {
      expect(value.features.length, `${tier} should still have features`).toBeGreaterThan(0);
    }
  });

  // The participant caps were removed from billing.tiers by the pricing pass
  // and survived in dashboard.billing.plans — the list a paying host reads —
  // for the same reason the stale commission numbers did: different namespace,
  // different page, same claim. Both lists are guarded now.
  it.each(LOCALES)("%s dashboard plan features make no participant-cap claim", (name) => {
    const plans = locale(name).dashboard.billing.plans as Record<string, { features: string[] }>;
    const offenders: string[] = [];

    for (const [plan, value] of Object.entries(plans)) {
      for (const feature of value.features) {
        if (/(100|300|1000)/.test(feature) || /participant|participante/i.test(feature)) {
          offenders.push(`${plan}: ${feature}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  // Four perks were listed that no code delivers: white-label and API access
  // are flags with zero readers and no implementation; "advanced analytics" is
  // the same single screen Creator gets; admin seats have a limit enforced only
  // in a module nothing imports, and no UI promotes anyone to admin at all.
  it.each(LOCALES)("%s advertises no unbuilt perk", (name) => {
    const catalog = locale(name);
    const lists = [
      ...Object.values(catalog.billing.tiers as Record<string, { features: string[] }>),
      ...Object.values(catalog.dashboard.billing.plans as Record<string, { features: string[] }>),
    ];

    const banned =
      /white.?label|api access|acceso a (la )?api|accès (à l.)?api|advanced analytics|anal[í i]ticas avanzadas|analytics avanzados|analyses avancées|admins?|administradores|administrateurs/i;

    const offenders: string[] = [];
    for (const list of lists) {
      for (const feature of list.features) if (banned.test(feature)) offenders.push(feature);
    }

    expect(offenders).toEqual([]);
  });
});

describe("the retired plan vocabulary is gone", () => {
  it.each(LOCALES)("%s has no Free / Professional / Premium plan objects", (name) => {
    const pricing = locale(name).landing?.pricing ?? {};
    expect(Object.keys(pricing)).not.toContain("free");
    expect(Object.keys(pricing)).not.toContain("professional");
    expect(Object.keys(pricing)).not.toContain("premium");
  });

  it.each(LOCALES)("%s no longer offers Contact Sales", (name) => {
    // The retired Premium tier's CTA — the product sells no such plan.
    expect(JSON.stringify(locale(name).landing ?? {})).not.toMatch(/contact sales/i);
  });

  it("the live tiers are exactly the three that are sold", () => {
    for (const name of LOCALES) {
      expect(Object.keys(locale(name).billing.tiers)).toEqual(["creator", "business", "pro"]);
    }
  });
});

describe("displayed prices are one copy", () => {
  it("the dashboard billing page reads the shared table", () => {
    const billing = read("app/(dashboard)/dashboard/settings/billing/page.tsx");
    expect(billing).toContain('from "@/lib/plans"');
    expect(billing).toContain("PLAN_PRICING[plan.key].monthly");
    // Its own hardcoded dollar strings are gone.
    expect(billing).not.toMatch(/price:\s*"\$\d+"/);
  });

  it("the marketing cards read the shared table", () => {
    const section = read("components/marketing/PricingSection.tsx");
    expect(section).toContain("PLAN_PRICING[tier.plan]");
    expect(section).not.toMatch(/monthlyPrice:\s*\d/);
  });

  it("no surface hardcodes a plan price any more", () => {
    const offenders = [
      "components/marketing/PricingSection.tsx",
      "components/marketing/PricingCard.tsx",
      "app/(dashboard)/dashboard/settings/billing/page.tsx",
    ].filter((file) => /\$?\b(15|49|149|150|490|1490)\b\s*[,;]/.test(read(file)));

    expect(offenders).toEqual([]);
  });

  it("the prices are the ones being charged for", () => {
    expect(PLAN_PRICING.CREATOR.monthly).toBe(15);
    expect(PLAN_PRICING.BUSINESS.monthly).toBe(49);
    expect(PLAN_PRICING.PRO.monthly).toBe(149);
    // Annual is 10× monthly, i.e. two months free — the "Save 16%" badge.
    for (const plan of PAID_PLANS) {
      expect(PLAN_PRICING[plan].annual).toBe(PLAN_PRICING[plan].monthly * 10);
    }
  });
});

/**
 * The recording block that used to live here is gone.
 *
 * It pinned the coming-soon treatment: the library panel, the post-session
 * card, the public replay gate and the strings behind them. Recording was
 * withdrawn on 2026-08-18, those surfaces were removed rather than reworded,
 * and asserting they still say "coming soon" would now hold the product to a
 * promise it has retracted.
 *
 * What replaced it is tests/unit/recording-honesty.test.ts, which checks the
 * opposite: that no surface offers a recording without a file, and that nothing
 * tells a user one is on its way.
 */

describe("the dead landing.pricing namespace stays gone", () => {
  it.each(LOCALES)("%s has no landing.pricing", (name) => {
    // 29 keys are read from the `landing` namespace; none under `pricing.`.
    // The home page renders PricingSection, which reads billing.*.
    expect(locale(name).landing?.pricing).toBeUndefined();
  });

  it("nothing in the code reads a landing.pricing key", () => {
    const files = [
      ...walkTsx(path.join(REPO_ROOT, "app")),
      ...walkTsx(path.join(REPO_ROOT, "components")),
    ];

    const offenders: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      if (/["`]landing\.pricing/.test(source)) {
        offenders.push(path.relative(REPO_ROOT, file).split(path.sep).join("/"));
      }
      // A component bound to the parent `landing` namespace reaching into it.
      if (/(useTranslations|getTranslations)\(\s*["`]landing["`]\s*\)/.test(source)) {
        for (const m of source.matchAll(/t\(\s*["`]pricing\.[^"`]+["`]/g)) {
          offenders.push(`${path.relative(REPO_ROOT, file)}: ${m[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the landing namespace still exists and is still used", () => {
    // Guard against the deletion having taken the parent with it.
    for (const name of LOCALES) {
      expect(Object.keys(locale(name).landing).length).toBeGreaterThan(3);
    }
  });
});

describe("the egress path stays dormant", () => {
  it("the egress call really is still a stub", () => {
    // The one assertion worth keeping from the old recording-control block.
    // Recording was withdrawn on 2026-08-18 and the in-room control removed, so
    // nothing left disabled needs re-enabling — but if this ever stops being a
    // stub, the surface removed in that change has to come back with it rather
    // than recordings quietly appearing behind URL-gated code paths.
    expect(read("lib/jobs/livekit-webhook.ts")).toContain("TODO: Implement actual Egress API call");
  });
});
