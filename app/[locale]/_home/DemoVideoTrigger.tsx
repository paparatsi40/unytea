"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Hero "Watch Demo" button + the modal it opens. Bundled together so the
 * parent home page (server component) just renders <DemoVideoTrigger /> and
 * the interactive piece is encapsulated.
 */
export function DemoVideoTrigger() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("landing");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-border px-8 py-4 font-semibold transition-colors hover:border-primary"
      >
        <Play className="h-5 w-5" />
        {t("hero.cta.secondary")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-2xl font-bold">{t("demoModal.title")}</h3>
            <p className="mb-6 text-muted-foreground">{t("demoModal.description")}</p>
            <Button onClick={() => setOpen(false)} className="w-full">
              {t("demoModal.close")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
