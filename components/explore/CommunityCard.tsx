import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Rich community card used across all sections of /explore.
 *
 * Why this lives in its own file: the Trending section originally rendered
 * this inline, while "Live sessions every week" and "New communities" used
 * a stripped-down version. That made the page feel inconsistent (rich at
 * the top, thin at the bottom) and hurt visitor → join conversion. Sharing
 * the component keeps every section equally inviting.
 */

type Owner = {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
};

type SessionSeries = {
  frequency?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
} | null | undefined;

type NextSession = {
  /**
   * Server-rendered sections pass real Date objects; the infinite feed
   * client gets ISO strings back from the API. Accept both so the same
   * card component can be used on both sides without converting.
   */
  scheduledAt: Date | string;
  series?: SessionSeries;
} | null;

export type CommunityCardData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPaid: boolean;
  isNew: boolean;
  imageUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  heroSubtitle: string | null;
  category: string;
  language: string;
  owner: Owner;
  _count: { members: number };
  nextSession: NextSession;
  nextSessionAttending: number;
  sessionsThisWeek: number;
  recentPostCount: number;
  newMembersLast7d: number;
  previewPost: string;
};

export interface CommunityCardProps {
  community: CommunityCardData;
  locale: string;
  /** Source tag used in the link's `?src=` for analytics. */
  linkSrc: string;
  /** 1-based rank shown to the user / used in the link's `?rank=` for analytics. */
  rank: number;
  /** Optional sort param surfaced in the link (defaults to no sort). */
  sort?: string;
}

function hostName(owner: Owner) {
  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return fullName || owner.name || "Unytea Host";
}

function formatSessionSlot(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return date.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayNameFromIndex(dayOfWeek: number | null | undefined) {
  if (dayOfWeek === null || dayOfWeek === undefined) return null;
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[dayOfWeek] || null;
}

function everySeriesLabel(series: SessionSeries) {
  if (!series || series.frequency !== "WEEKLY") return null;
  const day = dayNameFromIndex(series.dayOfWeek);
  if (!day) return null;
  if (!series.startTime) return `Every ${day}`;

  const [h, m] = series.startTime.split(":");
  const hour = Number(h);
  const minute = Number(m || "0");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return `Every ${day}`;

  const sample = new Date();
  sample.setHours(hour, minute, 0, 0);
  return `Every ${day} · ${sample.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function CommunityCard({
  community,
  locale,
  linkSrc,
  rank,
  sort,
}: CommunityCardProps) {
  const nextSessionText = community.nextSession
    ? `Next: ${formatSessionSlot(community.nextSession.scheduledAt)}`
    : "Weekly live sessions";
  const seriesIdentity = everySeriesLabel(community.nextSession?.series);

  const socialProof =
    community.nextSessionAttending > 0
      ? `${community.nextSessionAttending} attending`
      : community.sessionsThisWeek > 0
        ? "Weekly sessions"
        : community.isNew
          ? "Be one of the first members"
          : "Growing community";

  const badge = community.isNew ? "🆕 New" : "🔥 Trending";

  const coverGradient = `linear-gradient(135deg, ${
    community.primaryColor || "#8B5CF6"
  } 0%, ${community.secondaryColor || "#EC4899"} 100%)`;
  const initial = community.name.charAt(0).toUpperCase();

  const sortParam = sort ? `&sort=${sort}` : "";
  const href = `/${locale}/community/${community.slug}?src=${linkSrc}&rank=${rank}${sortParam}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
    >
      {/* Cover banner with overlapping logo */}
      <div className="relative h-28 w-full" style={{ background: coverGradient }}>
        {community.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={community.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}

        {/* Top-row badges overlay */}
        <div className="absolute left-3 top-3">
          <Badge className="shadow-sm">{badge}</Badge>
        </div>
        <div className="absolute right-3 top-3">
          <Badge variant="outline" className="bg-card/95 shadow-sm">
            {community.isPaid ? "Paid access" : "Free access"}
          </Badge>
        </div>

        {/* Community logo (overlapping bottom-left) */}
        <div className="absolute -bottom-6 left-4">
          {community.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.imageUrl}
              alt={community.name}
              className="h-12 w-12 rounded-lg border-2 border-card object-cover shadow-md"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-card text-lg font-bold text-white shadow-md"
              style={{ background: coverGradient }}
            >
              {initial}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-grow flex-col p-5 pt-8">
        <h3 className="text-lg font-semibold text-foreground">{community.name}</h3>

        {community.description?.trim() ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {community.description}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-muted-foreground/60">
            No description yet
          </p>
        )}

        {community.heroSubtitle && (
          <p className="mt-2 line-clamp-2 text-xs italic text-foreground/70">
            “{community.heroSubtitle}”
          </p>
        )}

        {/* Category + language badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs font-normal">
            {community.category}
          </Badge>
          {community.language && community.language !== "Any" && (
            <Badge variant="secondary" className="text-xs font-normal">
              🌍 {community.language}
            </Badge>
          )}
        </div>

        {/* Host with avatar */}
        <div className="mt-3 flex items-center gap-2">
          {community.owner.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.owner.image}
              alt={hostName(community.owner)}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-card"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-2 ring-card">
              {hostName(community.owner).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {hostName(community.owner)}
            </p>
            <p className="text-xs text-muted-foreground">
              Host · {community._count.members}{" "}
              {community._count.members === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {/* Session schedule */}
        <p className="mt-3 text-sm font-medium text-foreground">🟢 {nextSessionText}</p>
        {seriesIdentity && (
          <p className="text-xs text-muted-foreground">{seriesIdentity}</p>
        )}

        {/* Activity signals (only if there's recent activity) */}
        {community.recentPostCount > 0 || community.newMembersLast7d > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            📈{" "}
            {[
              community.recentPostCount > 0
                ? `${community.recentPostCount} post${
                    community.recentPostCount === 1 ? "" : "s"
                  } this week`
                : null,
              community.newMembersLast7d > 0
                ? `+${community.newMembersLast7d} new member${
                    community.newMembersLast7d === 1 ? "" : "s"
                  }`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">🔥 {socialProof}</p>
        )}

        {/* Preview post (only if community has any content) */}
        {community.previewPost && (
          <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
            💬 “{community.previewPost}”
          </p>
        )}

        <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          View community <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
