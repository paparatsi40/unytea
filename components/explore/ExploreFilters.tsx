"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type Props = {
  categories: string[];
  languages: string[];
  initial: {
    q: string;
    category: string;
    monetization: string;
    language: string;
    sessionsWeek: string;
    sort: string;
  };
};

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category !== "all") query.set("category", params.category);
  if (params.monetization !== "all") query.set("monetization", params.monetization);
  if (params.language !== "all") query.set("language", params.language);
  if (params.sessionsWeek !== "all") query.set("sessionsWeek", params.sessionsWeek);
  if (params.sort !== "trending") query.set("sort", params.sort);
  return query.toString();
}

export function ExploreFilters({ categories, languages, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [monetization, setMonetization] = useState(initial.monetization);
  const [language, setLanguage] = useState(initial.language);
  const [sessionsWeek, setSessionsWeek] = useState(initial.sessionsWeek);
  const [sort, setSort] = useState(initial.sort);

  const nonQueryUrl = useMemo(
    () =>
      buildQuery({
        q: "",
        category,
        monetization,
        language,
        sessionsWeek,
        sort,
      }),
    [category, monetization, language, sessionsWeek, sort]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      const query = buildQuery({ q, category, monetization, language, sessionsWeek, sort });
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 260);

    return () => clearTimeout(timeout);
  }, [q, category, monetization, language, sessionsWeek, sort, pathname, router]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search communities"
          className="h-11 rounded-lg border border-border bg-card px-4 text-sm lg:col-span-2"
        />

        <select
          value={monetization}
          onChange={(e) => setMonetization(e.target.value)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="all">Free + Paid</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="all">All languages</option>
          {languages.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={sessionsWeek}
          onChange={(e) => setSessionsWeek(e.target.value)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="all">Any schedule</option>
          <option value="yes">Sessions this week</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="trending">Trending</option>
          <option value="members">Most members</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setCategory("all")}>
          <Badge variant={category === "all" ? "default" : "secondary"} className="px-3 py-1">
            All Categories
          </Badge>
        </button>

        {categories.map((item) => (
          <button key={item} type="button" onClick={() => setCategory(item)}>
            <Badge
              variant={category.toLowerCase() === item.toLowerCase() ? "default" : "secondary"}
              className="px-3 py-1"
            >
              {item}
            </Badge>
          </button>
        ))}
      </div>

      <a
        href={nonQueryUrl ? `${pathname}?${nonQueryUrl}` : pathname}
        className="sr-only"
      >
        filters fallback
      </a>
    </>
  );
}
