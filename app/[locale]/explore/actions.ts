"use server";

import { CommunityCategory } from "@prisma/client";
import { getExploreCommunities } from "@/lib/explore-query";
import type {
  ExploreFilters,
  ExplorePagination,
  ExploreResponse,
  ExploreSize,
  ExploreSort,
  ExploreType,
} from "@/types/explore";

const MAX_PAGE = 1000;
const MAX_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 100;
const MAX_LANGUAGE_LENGTH = 8; // ISO 639-1 (2) with room for region tags (e.g. "pt-BR")

const VALID_SIZES: readonly ExploreSize[] = ["all", "small", "medium", "large"];
const VALID_TYPES: readonly ExploreType[] = ["all", "free", "paid"];
const VALID_SORTS: readonly ExploreSort[] = ["newest", "most-active", "most-members"];

function isCommunityCategory(value: unknown): value is CommunityCategory {
  return typeof value === "string" && value in CommunityCategory;
}

function sanitizeFilters(input: ExploreFilters): ExploreFilters {
  const out: ExploreFilters = {};

  if (input.category && isCommunityCategory(input.category)) {
    out.category = input.category;
  }

  if (
    typeof input.language === "string" &&
    input.language.length > 0 &&
    input.language.length <= MAX_LANGUAGE_LENGTH &&
    /^[a-zA-Z-]+$/.test(input.language)
  ) {
    out.language = input.language;
  }

  if (input.size && VALID_SIZES.includes(input.size)) {
    out.size = input.size;
  }

  if (input.type && VALID_TYPES.includes(input.type)) {
    out.type = input.type;
  }

  if (typeof input.search === "string") {
    const trimmed = input.search.trim().slice(0, MAX_SEARCH_LENGTH);
    if (trimmed.length > 0) out.search = trimmed;
  }

  if (input.sort && VALID_SORTS.includes(input.sort)) {
    out.sort = input.sort;
  }

  return out;
}

function sanitizePagination(input: ExplorePagination): ExplorePagination {
  const rawPage = typeof input.page === "number" && Number.isFinite(input.page) ? input.page : 1;
  const rawPageSize =
    typeof input.pageSize === "number" && Number.isFinite(input.pageSize) ? input.pageSize : 24;

  return {
    page: Math.max(1, Math.min(MAX_PAGE, Math.floor(rawPage))),
    pageSize: Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(rawPageSize))),
  };
}

export async function loadMoreCommunitiesAction(
  filters: ExploreFilters,
  pagination: ExplorePagination
): Promise<ExploreResponse> {
  const safeFilters = sanitizeFilters(filters);
  const safePagination = sanitizePagination(pagination);
  return getExploreCommunities(safeFilters, safePagination);
}
