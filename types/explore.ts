import type { CommunityCategory } from "@prisma/client";

export type ExploreSort = "newest" | "most-active" | "most-members";

export type ExploreSize = "all" | "small" | "medium" | "large";
// small = <100 members, medium = 100-999, large = 1000+

export type ExploreType = "all" | "free" | "paid";

export type ExploreFilters = {
  category?: CommunityCategory;
  language?: string;
  size?: ExploreSize;
  type?: ExploreType;
  search?: string;
  sort?: ExploreSort;
};

export type ExplorePagination = {
  page?: number; // 1-indexed
  pageSize?: number; // default 24
};

export type ExploreLiveStatus = {
  status: "live_now" | "live_soon" | "live_today" | "live_this_week" | "none";
  nextSessionStartsAt: Date | null;
  nextSessionTitle: string | null;
};

export type ExploreActivityStatus =
  | "very_active" // ≥10 actions/week on avg over last 30d
  | "active" // 5-9 actions/week
  | "moderate" // 1-4 actions/week
  | "quiet"; // <1 action/week

export type ExploreSampleMember = {
  id: string;
  name: string;
  image: string | null;
  initials: string;
};

export type ExploreCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverImageUrl: string;
  imageUrl: string | null;
  category: CommunityCategory;
  language: string | null;
  isPaid: boolean;
  memberCount: number;
  pricing: unknown; // shape varies, casted at display time
  primaryColor: string | null;
  secondaryColor: string | null;
  owner: {
    id: string;
    name: string;
    image: string | null;
    title: string | null;
  };
  activityHistory: number[]; // 30 ints, total actions per day (oldest first)
  activityStatus: ExploreActivityStatus;
  sampleMembers: ExploreSampleMember[];
  liveStatus: ExploreLiveStatus;
};

export type ExploreResponse = {
  communities: ExploreCommunity[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
