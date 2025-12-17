import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserNotifications } from "@/app/actions/notifications";
import { NotificationList } from "@/components/notifications/NotificationList";
import { NotificationHeader } from "@/components/notifications/NotificationHeader";
import { Bell } from "lucide-react";

export const metadata = {
  title: "Notifications | Unytea",
  description: "Stay updated with your notifications",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await getUserNotifications(100);

  if (!result.success) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Failed to load notifications
          </h2>
          <p className="text-muted-foreground">
            {result.error || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const { notifications, unreadCount } = result;

  return (
    <div className="space-y-6 p-8">
      <NotificationHeader unreadCount={unreadCount || 0} />
      <NotificationList notifications={notifications || []} />
    </div>
  );
}
