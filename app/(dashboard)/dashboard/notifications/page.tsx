import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserNotifications } from "@/app/actions/notifications";
import { NotificationList } from "@/components/notifications/NotificationList";
import { NotificationHeader } from "@/components/notifications/NotificationHeader";
import { NotificationsLoadError } from "@/components/notifications/NotificationsLoadError";

export const metadata = {
  title: "Notifications | Unytea",
  description: "Stay updated with your notifications",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getUserNotifications(100);

  if (!result.success) {
    return <NotificationsLoadError error={result.error} />;
  }

  const { notifications, unreadCount } = result;

  return (
    <div className="space-y-6 p-8">
      <NotificationHeader unreadCount={unreadCount || 0} />
      <NotificationList notifications={notifications || []} />
    </div>
  );
}
