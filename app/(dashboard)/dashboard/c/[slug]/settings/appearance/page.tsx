"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, LayoutTemplate, Sliders } from "lucide-react";

export default function AppearanceSettingsPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Appearance</h1>
        <p className="text-muted-foreground">
          Customize your community layout and branding experience
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Customize appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use the tools below to control how your community looks for visitors and members.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/dashboard/c/${slug}/settings/landing`}>
              <Button variant="outline" className="w-full justify-between">
                Landing page builder
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/c/${slug}/settings/sections`}>
              <Button variant="outline" className="w-full justify-between">
                Section presets
                <Sliders className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
