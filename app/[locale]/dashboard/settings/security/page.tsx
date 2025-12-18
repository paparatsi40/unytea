"use client";

import { useState } from "react";
import { Key, Smartphone, Monitor, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords don't match" });
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Security</h2>
        <p className="text-base text-muted-foreground">
          Manage your password and security settings
        </p>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
            <p className="text-base text-muted-foreground">
              Update your password to keep your account secure
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-5">
          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              New Password
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-sm text-muted-foreground">
              Must be at least 8 characters long
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Confirm New Password
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`rounded-lg border p-4 text-base ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-600"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === "success" && <CheckCircle2 className="h-5 w-5" />}
                {message.text}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={isLoading} className="text-base px-6 py-2">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <Smartphone className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h3>
            <p className="text-base text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/30 bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-medium text-foreground">Status</p>
              <p className="text-sm text-muted-foreground">Not enabled</p>
            </div>
            <Button variant="outline" size="sm" disabled className="text-sm">
              Enable 2FA (Coming Soon)
            </Button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Monitor className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Active Sessions</h3>
            <p className="text-base text-muted-foreground">
              Manage devices where you're currently logged in
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Current Session */}
          <div className="rounded-lg border border-border/30 bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-base font-medium text-foreground">
                    Current Device
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Windows • Chrome • Last active: Now
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                Active
              </span>
            </div>
          </div>

          {/* Info */}
          <p className="text-sm text-muted-foreground">
            You're currently logged in on this device only. Other sessions will appear here when you log in from multiple devices.
          </p>
        </div>
      </div>

      {/* Security Tips */}
      <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
        <p className="text-base text-foreground">
          <strong>💡 Security Tips:</strong> Use a unique password, enable 2FA when available, and review active sessions regularly to keep your account secure.
        </p>
      </div>
    </div>
  );
}
