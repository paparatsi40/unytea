"use client";

import { useState } from "react";
import { Check, Bell, Mail, Calendar, MessageSquare, Users, FileText } from "lucide-react";
import { toast } from "react-hot-toast";

type NotificationPrefs = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  sessionReminders: boolean;
  sessionStarted: boolean;
  newPostNotifications: boolean;
  newMemberNotifications: boolean;
  newMessageNotifications: boolean;
};

type Props = {
  initialPreferences: NotificationPrefs;
};

export function NotificationPreferences({ initialPreferences }: Props) {
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPreferences);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      toast.success("Notification preferences saved!");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-background after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
    </label>
  );

  return (
    <div className="space-y-6">
      {/* Delivery Methods */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Bell className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Delivery Methods
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose how you want to receive notifications
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Toggle 
              checked={prefs.emailNotifications} 
              onChange={() => setPrefs({ ...prefs, emailNotifications: !prefs.emailNotifications })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive in-app push notifications
                </p>
              </div>
            </div>
            <Toggle 
              checked={prefs.pushNotifications} 
              onChange={() => setPrefs({ ...prefs, pushNotifications: !prefs.pushNotifications })}
            />
          </div>
        </div>
      </div>

      {/* Session Notifications */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <Calendar className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Session Notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Stay updated about upcoming and live sessions
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Session Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get reminded 15 minutes before sessions start
                </p>
              </div>
            </div>
            <Toggle 
              checked={prefs.sessionReminders} 
              onChange={() => setPrefs({ ...prefs, sessionReminders: !prefs.sessionReminders })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-purple-500/5">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  Session Started
                  <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600">
                    Recommended
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Get notified when a session you're enrolled in starts
                </p>
              </div>
            </div>
            <Toggle 
              checked={prefs.sessionStarted} 
              onChange={() => setPrefs({ ...prefs, sessionStarted: !prefs.sessionStarted })}
            />
          </div>
        </div>
      </div>

      {/* Community Notifications */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2">
            <Users className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Community Activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Get updates about community activity
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">New Posts</p>
                <p className="text-sm text-muted-foreground">
                  When someone creates a new post in your communities
                </p>
              </div>
            </div>
            <Toggle 
              checked={prefs.newPostNotifications} 
              onChange={() => setPrefs({ ...prefs, newPostNotifications: !prefs.newPostNotifications })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">New Members</p>
                <p className="text-sm text-muted-foreground">
                  When someone joins a community you own
                </p>
              </div>
            </div>
            <Toggle 
              checked={prefs.newMemberNotifications} 
              onChange={() => setPrefs({ ...prefs, newMemberNotifications: !prefs.newMemberNotifications })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">New Messages</p>
                <p className="text-sm text-muted-foreground">
                  When you receive a new direct message
                </p>
              </div>
            </div>
            <Toggle 
              checked={prefs.newMessageNotifications} 
              onChange={() => setPrefs({ ...prefs, newMessageNotifications: !prefs.newMessageNotifications })}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {loading ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}