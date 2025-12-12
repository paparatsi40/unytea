import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Settings, Wrench } from "lucide-react";

export default async function CommunitySettingsPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const community = await prisma.community.findUnique({
    where: { id: params.communityId },
  });

  if (!community) {
    redirect("/dashboard");
  }

  // Check if user is owner
  if (community.ownerId !== session.user.id) {
    redirect(`/dashboard/communities/${params.communityId}/feed`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {community.name} - Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your community settings
        </p>
      </div>

      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-blue-500/5 p-12 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Wrench className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Settings Panel Coming Soon
          </h2>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Advanced settings and customization options for your community.
          </p>

          <div className="grid gap-3 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <span className="text-foreground">Community details</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <span className="text-foreground">Privacy settings</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <span className="text-foreground">Branding & customization</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <span className="text-foreground">Permissions & roles</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <span className="text-foreground">Integrations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
