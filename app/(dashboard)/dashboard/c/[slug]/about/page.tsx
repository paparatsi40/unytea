"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Users, Calendar, BookOpen, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/i18n/date-fns-locale";

interface CommunityData {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  coverImage: string | null;
  slug: string;
  createdAt: string;
  type: string;
  _count?: {
    members: number;
    posts: number;
    courses: number;
  };
  owner?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

// community.type isn't a real column (the API never returns it), so this
// normalizes whatever may arrive and defaults to "public" — matching the
// previous hardcoded "Public" fallback. Returns a key resolved in render.
function getCommunityTypeKey(type?: string): "public" | "private" {
  return type?.toLowerCase() === "private" ? "private" : "public";
}

export default function CommunityAboutPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const t = useTranslations("dashboard.communityMember.about");
  const locale = useLocale();
  const dfLocale = getDateFnsLocale(locale);
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCommunity();
  }, [slug]);

  const loadCommunity = async () => {
    try {
      const response = await fetch(`/api/communities/${slug}`);
      const data = await response.json();

      if (data.community) {
        setCommunity(data.community);
      } else if (data.id) {
        // Fallback for simple response format
        setCommunity(data as CommunityData);
      }
    } catch (error) {
      console.error("Error loading community:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">{t("notFound")}</p>
      </div>
    );
  }

  const createdDate = format(new Date(community.createdAt), "PPP", { locale: dfLocale });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {t("title", { name: community.name })}
        </h1>
        <p className="text-gray-600">{t("subtitle")}</p>
      </div>

      {/* Cover Image */}
      {community.coverImage && (
        <div className="relative mb-8 h-64 overflow-hidden rounded-2xl">
          <Image
            src={community.coverImage}
            alt={community.name}
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      {/* Description */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{t("descriptionTitle")}</h2>
        <p className="leading-relaxed text-gray-700">
          {community.description || t("noDescription")}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{community._count?.members || 0}</p>
            <p className="text-sm text-gray-600">{t("stats.members")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{community._count?.posts || 0}</p>
            <p className="text-sm text-gray-600">{t("stats.posts")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Globe className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{community._count?.courses || 0}</p>
            <p className="text-sm text-gray-600">{t("stats.courses")}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{t("detailsTitle")}</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">{t("createdOn", { date: createdDate })}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">
              {t("communityType", { value: t(`type.${getCommunityTypeKey(community.type)}`) })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">{t("slug", { value: community.slug })}</span>
          </div>
        </div>
      </div>

      {/* Owner */}
      {community.owner && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{t("ownerTitle")}</h2>
          <div className="flex items-center gap-4">
            {community.owner.image ? (
              <Image
                src={community.owner.image}
                alt={community.owner.name || t("owner")}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {community.owner.name || t("unknownOwner")}
              </p>
              <p className="text-sm text-gray-600">{t("owner")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="flex gap-4">
        <Link href={`/dashboard/c/${slug}/chat`}>
          <Button variant="outline">{t("backButton")}</Button>
        </Link>
      </div>
    </div>
  );
}
