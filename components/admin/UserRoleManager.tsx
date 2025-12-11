"use client";

import { useState } from "react";
import { Crown, Shield, Eye, User, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";

type AppRole = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "USER";

interface UserRoleManagerProps {
  userId: string;
  currentRole: AppRole;
}

export function UserRoleManager({ userId, currentRole }: UserRoleManagerProps) {
  const [role, setRole] = useState<AppRole>(currentRole);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (newRole: AppRole) => {
    if (newRole === role) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setRole(newRole);
      toast.success(`Role updated to ${newRole}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: AppRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200";
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200";
      case "MODERATOR":
        return "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200";
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Crown className="w-3 h-3" />;
      case "ADMIN":
        return <Shield className="w-3 h-3" />;
      case "MODERATOR":
        return <Eye className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  return (
    <div className="relative inline-block">
      <select
        value={role}
        onChange={(e) => handleRoleChange(e.target.value as AppRole)}
        disabled={isLoading}
        className={`
          appearance-none
          pl-2 pr-8 py-2 
          rounded-lg 
          text-xs font-semibold 
          border-2
          transition-all
          cursor-pointer
          ${getRoleColor(role)}
          focus:outline-none 
          focus:ring-2 
          focus:ring-yellow-400
          disabled:opacity-50 
          disabled:cursor-not-allowed
          hover:shadow-md
        `}
      >
        <option value="USER">👤 USER</option>
        <option value="MODERATOR">👁️ MODERATOR</option>
        <option value="ADMIN">🛡️ ADMIN</option>
        <option value="SUPER_ADMIN">👑 SUPER ADMIN</option>
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
    </div>
  );
}
