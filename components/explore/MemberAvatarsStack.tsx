import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ExploreSampleMember } from "@/types/explore";

type MemberAvatarsStackProps = {
  members: ExploreSampleMember[];
  totalCount: number;
};

const FALLBACK_COLORS = [
  "bg-amber-200 text-amber-900",
  "bg-blue-200 text-blue-900",
  "bg-pink-200 text-pink-900",
  "bg-green-200 text-green-900",
  "bg-purple-200 text-purple-900",
];

const VISIBLE_COUNT = 4;
const AVATAR_PX = 22;

const STRINGS = {
  members: "members",
};

function pickFallbackColor(id: string): string {
  // Deterministic: sum char codes mod palette length.
  // (id.charCodeAt(0) mod len would be biased toward letters with lower codes;
  // sum-of-codes spreads more evenly across the 5 buckets.)
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return FALLBACK_COLORS[sum % FALLBACK_COLORS.length];
}

export function MemberAvatarsStack({ members, totalCount }: MemberAvatarsStackProps) {
  const visible = members.slice(0, VISIBLE_COUNT);
  const showOverflow = totalCount > VISIBLE_COUNT;

  return (
    <div className="flex items-center border-t border-border/50 pt-2.5">
      <div className="flex">
        {visible.map((member, i) => (
          <div
            key={member.id}
            className={cn(
              "relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 border-card text-[9px] font-medium",
              i > 0 && "-ml-2",
              !member.image && pickFallbackColor(member.id)
            )}
            style={{ width: AVATAR_PX, height: AVATAR_PX }}
            title={member.name}
          >
            {member.image ? (
              <Image
                src={member.image}
                alt={member.name}
                width={AVATAR_PX}
                height={AVATAR_PX}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{member.initials}</span>
            )}
          </div>
        ))}
        {showOverflow && (
          <div
            className={cn(
              "relative inline-flex items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-medium text-muted-foreground",
              visible.length > 0 && "-ml-2"
            )}
            style={{ width: AVATAR_PX, height: AVATAR_PX }}
            aria-label={`${totalCount - VISIBLE_COUNT} more members`}
          >
            +
          </div>
        )}
      </div>
      <span className="ml-2 text-xs text-muted-foreground">
        {totalCount.toLocaleString()} {STRINGS.members}
      </span>
    </div>
  );
}
