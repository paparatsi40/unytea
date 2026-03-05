"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, 
  Heart, 
  AtSign, 
  FileText, 
  Users, 
  Calendar,
  Sparkles,
  Info,
  X
} from "lucide-react";
import { markNotificationAsRead, deleteNotification } from "@/app/actions/notifications";
import { toast } from "sonner";
import Link from "next/link";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    isRead: boolean;
    createdAt: Date;
    sender?: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
    link?: string | null;
  };
  onUpdate?: () => void;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  COMMENT: <MessageSquare className="h-5 w-5 text-blue-500" />,
  REACTION: <Heart className="h-5 w-5 text-red-500" />,
  MENTION: <AtSign className="h-5 w-5 text-yellow-500" />,
  NEW_POST: <FileText className="h-5 w-5 text-green-500" />,
  NEW_MEMBER: <Users className="h-5 w-5 text-purple-500" />,
  SESSION_REMINDER: <Calendar className="h-5 w-5 text-orange-500" />,
  SESSION_CANCELLED: <Calendar className="h-5 w-5 text-red-500" />,
  MESSAGE: <MessageSquare className="h-5 w-5 text-cyan-500" />,
  ACHIEVEMENT: <Sparkles className="h-5 w-5 text-yellow-500" />,
  SYSTEM: <Info className="h-5 w-5 text-gray-500" />,
};

export function NotificationItem({ notification, onUpdate }: NotificationItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await markNotificationAsRead(notification.id);

    if (result.success) {
      toast.success("Marked as read");
      onUpdate?.();
    } else {
      toast.error(result.error || "Failed to mark as read");
    }
    setIsLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await deleteNotification(notification.id);

    if (result.success) {
      toast.success("Notification deleted");
      onUpdate?.();
    } else {
      toast.error(result.error || "Failed to delete");
    }
    setIsLoading(false);
  };

  const icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.SYSTEM;

  const content = (
    <div
      className={`group relative flex gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md ${
        !notification.isRead ? "bg-primary/5" : ""
      }`}
    >
      {/* Unread Indicator */}
      {!notification.isRead && (
        <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
      )}

      {/* Avatar or Icon */}
      <div className="flex-shrink-0 pl-4">
        {notification.sender ? (
          <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
            <img src={notification.sender.image || ""} className="h-8 w-8 rounded-full" />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            {icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-foreground">{notification.title}</h4>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.isRead && (
          <button
            onClick={handleMarkAsRead}
            disabled={isLoading}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="Mark as read"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
          title="Delete"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  if (notification.data?.link) {
    return <Link href={notification.data.link}>{content}</Link>;
  }

  return content;
}
