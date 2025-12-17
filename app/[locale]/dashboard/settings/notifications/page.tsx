import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";

export const metadata = {
  title: "Notification Preferences | Unytea",
  description: "Manage your notification settings",
};

export default async function NotificationSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch user preferences
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailNotifications: true,
      pushNotifications: true,
      sessionReminders: true,
      sessionStarted: true,
      newPostNotifications: true,
      newMemberNotifications: true,
      newMessageNotifications: true,
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Notification Preferences
        </h1>
        <p className="text-muted-foreground">
          Control when and how you receive notifications
        </p>
      </div>

      {/* Notification Preferences Component */}
      <NotificationPreferences initialPreferences={user} />
    </div>
  );
}