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
        className="px-8 py-4 border-2 border-border rounded-xl font-semibold hover:border-primary transition-colors flex items-center justify-center gap-2"
      >
        <Play className="w-5 h-5" />
        {t("hero.cta.secondary")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t("demoModal.title")}</h3>
            <p className="text-muted-foreground mb-6">{t("demoModal.description")}</p>
            <Button onClick={() => setOpen(false)} className="w-full">
              {t("demoModal.close")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
