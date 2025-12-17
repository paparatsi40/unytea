"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState("account");

  // State for notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);

  if (!isOpen) return null;

  const tabs = [
    { id: "account", label: "Account" },
    { id: "notifications", label: "Notifications" },
    { id: "privacy", label: "Privacy" },
    { id: "appearance", label: "Appearance" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue="John Doe" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue="john@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    className="w-full mt-1 p-2 border rounded-md min-h-[100px]"
                    defaultValue="Passionate about learning and teaching."
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive email updates about your sessions
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive push notifications on your device
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="message-notifications">Message Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Get notified when you receive new messages
                    </p>
                  </div>
                  <Switch
                    id="message-notifications"
                    checked={messageNotifications}
                    onCheckedChange={setMessageNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="session-reminders">Session Reminders</Label>
                    <p className="text-sm text-gray-500">
                      Receive reminders before your upcoming sessions
                    </p>
                  </div>
                  <Switch
                    id="session-reminders"
                    checked={sessionReminders}
                    onCheckedChange={setSessionReminders}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Save Preferences</Button>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <select
                    id="profile-visibility"
                    className="w-full mt-1 p-2 border rounded-md"
                    defaultValue="public"
                  >
                    <option value="public">Public</option>
                    <option value="mentors-only">Mentors Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <Label>Data Sharing</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Control how your data is shared with other users and services.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Appearance</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    className="w-full mt-1 p-2 border rounded-md"
                    defaultValue="light"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    className="w-full mt-1 p-2 border rounded-md"
                    defaultValue="en"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
