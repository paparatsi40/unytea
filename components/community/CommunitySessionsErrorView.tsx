"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Client error view for the (server) sessions admin page — lets the error
// strings localize via the dashboard's client NextIntlClientProvider.
export function CommunitySessionsErrorView() {
  const t = useTranslations("dashboard.communityAdmin.sessions.error");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mb-4 text-muted-foreground">{t("body")}</p>
        <Link href="/dashboard/communities">
          <Button variant="outline" className="border-border text-foreground">
            {t("back")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
