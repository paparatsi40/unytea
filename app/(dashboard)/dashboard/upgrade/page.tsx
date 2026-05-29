"use client";

import { useLocale, useTranslations } from "next-intl";
import { PricingSection } from "@/components/marketing/PricingSection";

export default function UpgradePage() {
  const locale = useLocale();
  const t = useTranslations("billing.pricing");

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">{t("headerTitle")}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {t("headerSubtitle")}
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("headerDetail")}
        </p>
      </div>

      <PricingSection locale={locale} />

      <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-border bg-card/50 p-8">
        <h2 className="mb-4 text-center text-2xl font-bold text-foreground">
          {t("freeForMembersTitle")}
        </h2>
        <p className="text-center text-muted-foreground">{t("freeForMembersBody")}</p>
      </div>
    </div>
  );
}
