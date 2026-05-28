import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CommunityCategory } from "@prisma/client";
import { getExploreCommunities } from "@/lib/explore-query";
import { localizedAlternates } from "@/lib/seo/locale-metadata";
import { ExploreFilters as ExploreFiltersComponent } from "@/components/explore/ExploreFilters";
import { ExploreInfiniteFeed } from "@/components/explore/ExploreInfiniteFeed";
import type {
  ExploreFilters,
  ExplorePagination,
  ExploreResponse,
  ExploreSize,
  ExploreSort,
  ExploreType,
} from "@/types/explore";

type SearchParams = {
  q?: string;
  category?: string;
  language?: string;
  size?: string;
  type?: string;
  sort?: string;
  page?: string;
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<SearchParams>;
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE = 1000;
const MAX_SEARCH_LENGTH = 100;
const VALID_SIZES = new Set<ExploreSize>(["all", "small", "medium", "large"]);
const VALID_TYPES = new Set<ExploreType>(["all", "free", "paid"]);
const VALID_SORTS = new Set<ExploreSort>(["newest", "most-active", "most-members"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "explore.page" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...localizedAlternates({ path: "/explore", locale }),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `https://www.unytea.com/${locale}/explore`,
      type: "website",
    },
  };
}

function isCommunityCategory(value: unknown): value is CommunityCategory {
  return typeof value === "string" && value in CommunityCategory;
}

function parseSearchParams(sp: SearchParams): {
  filters: ExploreFilters;
  pagination: ExplorePagination;
} {
  // Defensive parse — drop unknowns, never throw on user input.
  const filters: ExploreFilters = {};

  if (typeof sp.q === "string") {
    const trimmed = sp.q.trim().slice(0, MAX_SEARCH_LENGTH);
    if (trimmed.length > 0) filters.search = trimmed;
  }

  if (sp.category && isCommunityCategory(sp.category)) {
    filters.category = sp.category;
  }

  if (typeof sp.language === "string" && /^[a-zA-Z-]{2,8}$/.test(sp.language)) {
    filters.language = sp.language;
  }

  if (sp.size && VALID_SIZES.has(sp.size as ExploreSize)) {
    filters.size = sp.size as ExploreSize;
  }

  if (sp.type && VALID_TYPES.has(sp.type as ExploreType)) {
    filters.type = sp.type as ExploreType;
  }

  if (sp.sort && VALID_SORTS.has(sp.sort as ExploreSort)) {
    filters.sort = sp.sort as ExploreSort;
  }

  let page = 1;
  if (typeof sp.page === "string") {
    const parsed = parseInt(sp.page, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      page = Math.min(MAX_PAGE, parsed);
    }
  }

  return {
    filters,
    pagination: { page, pageSize: DEFAULT_PAGE_SIZE },
  };
}

const EMPTY_RESPONSE: ExploreResponse = {
  communities: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  hasMore: false,
};

export default async function ExplorePage(props: Props) {
  const params = await props.params;
  const searchParamsRaw = (await props.searchParams) ?? {};
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "explore.page" });
  const { filters, pagination } = parseSearchParams(searchParamsRaw);

  // Server-side fetch initial page. Soft-fail if DB unavailable so the page
  // still renders the filter bar + empty state instead of a 500.
  let initialData: ExploreResponse;
  try {
    initialData = await getExploreCommunities(filters, pagination);
  } catch (error) {
    console.error("[explore] Failed to fetch initial communities:", error);
    initialData = EMPTY_RESPONSE;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>

      <ExploreFiltersComponent currentFilters={filters} totalResults={initialData.total} />

      <div className="mt-6">
        <ExploreInfiniteFeed
          initialData={initialData}
          currentFilters={filters}
          locale={locale}
        />
      </div>
    </div>
  );
}
