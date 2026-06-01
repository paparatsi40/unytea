"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, LayoutTemplate, Sliders } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AppearanceSettingsPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const t = useTranslations("dashboard.communityAdmin.settings.appearance");

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t("cardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("cardDescription")}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/dashboard/c/${slug}/settings/landing`}>
              <Button variant="outline" className="w-full justify-between">
                {t("landingBuilderButton")}
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/c/${slug}/settings/sections`}>
              <Button variant="outline" className="w-full justify-between">
                {t("sectionPresetsButton")}
                <Sliders className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
