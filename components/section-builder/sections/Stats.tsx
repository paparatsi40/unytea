"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SectionSchema } from "../types";
import type { LandingCommunity, LandingSampleMember, LandingActivityStatus } from "../types";

const ACTIVITY_LABELS: Record<LandingActivityStatus, string> = {
  very_active: "Very active",
  active: "Active",
  moderate: "Moderately active",
  quiet: "Quiet",
};

export const StatsRender = (props: Record<string, any>) => {
  const { title } = props;
  const community = props.community as LandingCommunity | undefined;
  const sampleMembers = (props.sampleMembers as LandingSampleMember[] | undefined) ?? [];
  const activityStatus = props.activityStatus as LandingActivityStatus | undefined;

  // No community context (e.g. section-builder preview) — show a placeholder.
  if (!community) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center text-sm text-muted-foreground">
        Member count, activity, and join CTA appear on the published page.
      </section>
    );
  }

  const memberCount = community.memberCount ?? 0;
  const isActive = activityStatus === "very_active" || activityStatus === "active";

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-6">
      {title && <h2 className="mb-4 text-xl font-medium text-foreground">{title}</h2>}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-4">
          {sampleMembers.length > 0 && (
            <div className="flex -space-x-2">
              {sampleMembers.slice(0, 7).map((m) => (
                <span
                  key={m.id}
                  className="relative inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-gray-200 text-[9px] font-medium text-gray-600"
                >
                  {m.image ? (
                    <Image
                      src={m.image}
                      alt={m.name}
                      fill
                      unoptimized
                      sizes="24px"
                      className="object-cover"
                    />
                  ) : (
                    m.initials
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="text-sm">
            <span className="font-medium text-foreground">
              {memberCount.toLocaleString()} {memberCount === 1 ? "member" : "members"}
            </span>
            {activityStatus && (
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    isActive ? "bg-green-500" : "bg-gray-400"
                  )}
                />
                {ACTIVITY_LABELS[activityStatus]}
              </span>
            )}
          </div>
        </div>

        {/* Join CTA for free communities only. Paid communities surface tiers
            via the MembershipTiers section instead. The /c/{slug}/join flow
            page is a documented follow-up (currently 404). */}
        {!community.isPaid && (
          <Link
            href={`/c/${community.slug}/join`}
            className="inline-flex items-center rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            Join community
          </Link>
        )}
      </div>
    </section>
  );
};

export const StatsSchema: SectionSchema = {
  type: "stats",
  label: "Stats",
  description: "Member count, activity indicator, and join CTA",
  icon: "📊",
  defaultProps: {
    title: "",
  },
  fields: [{ key: "title", label: "Title (optional)", kind: "text", placeholder: "Our community" }],
  Render: StatsRender,
};
