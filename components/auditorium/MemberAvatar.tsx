"use client";

type Member = {
  id: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    level: number;
  };
  isTyping?: boolean;
};

type Props = {
  member: Member;
  isCurrentUser: boolean;
  isHovered: boolean;
};

const getLevelColor = (level: number) => {
  if (level >= 20) return "#06b6d4"; // cyan (diamond)
  if (level >= 10) return "#eab308"; // yellow (gold)
  if (level >= 5) return "#6b7280"; // gray (silver)
  return "#f97316"; // orange (bronze)
};

export function MemberAvatar({ member, isCurrentUser, isHovered }: Props) {
  const levelColor = getLevelColor(member.user.level);
  const initial = member.user.name?.charAt(0).toUpperCase() || "?";

  return (
    <>
      {/* Outer glow (for current user or hover) */}
      {(isCurrentUser || isHovered) && (
        <circle
          cx="0"
          cy="0"
          r="35"
          fill={isCurrentUser ? "#a855f7" : "#ec4899"}
          opacity="0.2"
          className={isCurrentUser ? "animate-pulse" : ""}
        />
      )}

      {/* Avatar circle */}
      <circle
        cx="0"
        cy="0"
        r="25"
        fill="url(#avatarGradient)"
        stroke={isCurrentUser ? "#a855f7" : "#e5e7eb"}
        strokeWidth={isCurrentUser ? "3" : "2"}
      />

      {/* Avatar image or initial */}
      {member.user.image ? (
        <image
          href={member.user.image}
          x="-25"
          y="-25"
          width="50"
          height="50"
          clipPath="circle(25px at center)"
        />
      ) : (
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="20"
          fontWeight="bold"
        >
          {initial}
        </text>
      )}

      {/* Level badge */}
      <circle cx="18" cy="18" r="10" fill={levelColor} stroke="white" strokeWidth="2" />
      <text
        x="18"
        y="18"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="8"
        fontWeight="bold"
      >
        {member.user.level}
      </text>

      {/* Typing indicator */}
      {member.isTyping && (
        <g transform="translate(0, -40)">
          <rect
            x="-20"
            y="-10"
            width="40"
            height="20"
            rx="10"
            fill="#3b82f6"
            opacity="0.9"
          />
          <circle cx="-8" cy="0" r="2" fill="white" className="animate-bounce" style={{ animationDelay: '0ms' }} />
          <circle cx="0" cy="0" r="2" fill="white" className="animate-bounce" style={{ animationDelay: '150ms' }} />
          <circle cx="8" cy="0" r="2" fill="white" className="animate-bounce" style={{ animationDelay: '300ms' }} />
        </g>
      )}

      {/* Tooltip on hover */}
      {isHovered && (
        <g transform="translate(0, -50)">
          <rect
            x={-(member.user.name?.length || 4) * 3.5}
            y="-12"
            width={(member.user.name?.length || 4) * 7}
            height="24"
            rx="4"
            fill="rgba(0,0,0,0.8)"
          />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="12"
            fontWeight="500"
          >
            {member.user.name || "Anonymous"}
          </text>
        </g>
      )}

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </>
  );
}
