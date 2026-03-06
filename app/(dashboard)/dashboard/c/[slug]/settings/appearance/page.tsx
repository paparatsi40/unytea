"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";

export default function AppearanceSettingsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Appearance</h1>
        <p className="text-muted-foreground">
          Customize your community look and feel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Appearance settings are currently under development. 
            Check back soon for layout, color, and branding customization options.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
