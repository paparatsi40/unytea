"use server";

import { z } from "zod";
import { CommunityCategory } from "@prisma/client";
import { defineAction } from "@/lib/actions/define-action";
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
// Object.values(enum) excludes prototype methods, so the Set is safe to
// query with untrusted strings. `value in CommunityCategory` would have
// returned true for "hasOwnProperty" and friends.
const VALID_CATEGORIES = new Set<CommunityCategory>(
  Object.values(CommunityCategory) as CommunityCategory[]
);

function isCommunityCategory(value: unknown): value is CommunityCategory {
  return typeof value === "string" && VALID_CATEGORIES.has(value as CommunityCategory);
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

/**
 * PUBLIC: this backs the anonymous /explore directory, which exists to be browsed
 * without an account. It reads only communities that have opted in to discovery
 * (`excludeFromExplore = false`) and returns no member data.
 *
 * The pre-existing sanitizeFilters/sanitizePagination clamp every field, so the
 * Zod schemas below only need to reject the wrong shape; the value clamping stays
 * where it was.
 */
export const loadMoreCommunitiesAction = defineAction(
  {
    name: "loadMoreCommunitiesAction",
    auth: "public",
    args: [
      z.object({
        category: z.string().max(64).optional(),
        language: z.string().max(8).optional(),
        size: z.string().max(16).optional(),
        type: z.string().max(16).optional(),
        search: z.string().max(100).optional(),
        sort: z.string().max(32).optional(),
      }),
      z.object({
        page: z.number().finite().optional(),
        pageSize: z.number().finite().optional(),
      }),
    ],
    rateLimit: "api",
  },
  async (_ctx, filters, pagination): Promise<ExploreResponse> => {
    const safeFilters = sanitizeFilters(filters as ExploreFilters);
    const safePagination = sanitizePagination(pagination as ExplorePagination);
    return getExploreCommunities(safeFilters, safePagination);
  }
);
