"use client";

import { MessageCircle, Edit, ThumbsUp, Users, Award, Zap } from "lucide-react";

const POINT_ACTIONS = [
  { icon: MessageCircle, label: "Chat message", points: 1, color: "text-blue-500" },
  { icon: Edit, label: "Create post", points: 5, color: "text-purple-500" },
  { icon: ThumbsUp, label: "Helpful comment", points: 10, color: "text-green-500" },
  { icon: Users, label: "1-on-1 session", points: 20, color: "text-pink-500" },
  { icon: Award, label: "Complete challenge", points: 50, color: "text-yellow-500" },
];

export function PointsGuide() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center space-x-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-bold text-gray-900">How to Earn Points</h3>
      </div>

      <div className="space-y-3">
        {POINT_ACTIONS.map((action, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div className="flex items-center space-x-3">
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </div>
            <span className="text-lg font-bold text-purple-600">+{action.points}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Level up every 100 points! 🚀
      </p>
    </div>
  );
}
