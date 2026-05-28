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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
          {title}
        </h2>
        <a href="#" className="text-sm hover:underline" style={{ color: primaryColor }}>
          View all →
        </a>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {members.slice(0, 12).map((member) => (
          <div
            key={member.id}
            className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            {/* Avatar */}
            <div className="mb-3">
              {member.user.image ? (
                <Image
                  src={member.user.image}
                  alt={member.user.name || "User"}
                  width={64}
                  height={64}
                  className="mx-auto rounded-full"
                />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
                  <User className="h-8 w-8 text-gray-500" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="mb-1 truncate text-sm font-medium text-gray-900">
              {member.user.name || "Anonymous"}
            </div>

            {/* Role Badge */}
            {member.role !== "MEMBER" && (
              <div
                className="mb-2 inline-block rounded-full px-2 py-1 text-xs"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
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
