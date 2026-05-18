"use client";

import { User } from "lucide-react";
import Image from "next/image";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface MemberGridSectionProps {
  title?: string;
  members: Member[];
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function MemberGridSection({
  title = "Community Members",
  members,
  theme,
}: MemberGridSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  if (members.length === 0) {
    return null;
  }

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 
          className="text-2xl font-bold"
          style={{ color: primaryColor }}
        >
          {title}
        </h2>
        <a 
          href="#" 
          className="text-sm hover:underline"
          style={{ color: primaryColor }}
        >
          View all →
        </a>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {members.slice(0, 12).map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer text-center"
          >
            {/* Avatar */}
            <div className="mb-3">
              {member.user.image ? (
                <Image
                  src={member.user.image}
                  alt={member.user.name || "User"}
                  width={64}
                  height={64}
                  className="rounded-full mx-auto"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
                  <User className="h-8 w-8 text-gray-500" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="font-medium text-gray-900 text-sm mb-1 truncate">
              {member.user.name || "Anonymous"}
            </div>

            {/* Role Badge */}
            {member.role !== "MEMBER" && (
              <div 
                className="text-xs px-2 py-1 rounded-full mb-2 inline-block"
                style={{ 
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor 
                }}
              >
                {member.role}
              </div>
            )}

          </div>
        ))}
      </div>
    </section>
  );
}