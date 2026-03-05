"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { Settings, User as UserIcon } from "lucide-react";

export default function ProfilePage() {
  const { user } = useCurrentUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex items-center space-x-6 mb-8">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="h-24 w-24 rounded-full border-4 border-border object-cover"
            />
          ) : (
            <div className="h-24 w-24 rounded-full border-4 border-border bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <UserIcon className="h-12 w-12 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {user.name || "User"}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
            <p className="text-foreground">{user.email}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Account</p>
            <p className="text-foreground">Active</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-primary/5 border border-primary/20 p-6 text-center">
          <Settings className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Full Profile Editing Coming Soon
          </h3>
          <p className="text-sm text-muted-foreground">
            Advanced profile management features will be available in the next update.
          </p>
        </div>
      </div>
    </div>
  );
}
