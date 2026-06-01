"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Users, Target, Heart, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function BuddyPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const t = useTranslations("dashboard.communityMember.buddy");
  const [communityId, setCommunityId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const hasBuddy = false;

  useEffect(() => {
    loadCommunity();
  }, [slug]);

  const loadCommunity = async () => {
    try {
      const response = await fetch(`/api/communities/${slug}`);
      const data = await response.json();
      if (data && data.id) {
        setCommunityId(data.id);
      }
    } catch (error) {
      console.error("Error loading community:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!communityId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">{t("notFound")}</p>
      </div>
    );
  }

  if (!hasBuddy) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 md:h-16 md:w-16">
              <Users className="h-7 w-7 text-purple-600 md:h-8 md:w-8" />
            </div>
            <h2 className="mt-3 text-xl font-bold text-gray-900 md:mt-4 md:text-2xl">
              {t("comingSoonTitle")}
            </h2>
            <p className="mt-2 px-4 text-sm text-gray-600 md:text-base">
              {t("comingSoonDescription")}
            </p>

            <button
              onClick={() => alert("Match functionality coming - for now showing you matched!")}
              className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 md:mt-6 md:px-6 md:py-3 md:text-base"
            >
              <Users className="h-4 w-4 md:h-5 md:w-5" />
              <span>{t("findBuddyButton")}</span>
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 md:mt-12 md:gap-6">
            <div className="text-center">
              <Target className="mx-auto h-6 w-6 text-purple-600 md:h-8 md:w-8" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 md:text-base">
                {t("features.setGoals.title")}
              </h3>
              <p className="mt-1 hidden text-xs text-gray-600 sm:block md:text-sm">
                {t("features.setGoals.description")}
              </p>
            </div>
            <div className="text-center">
              <Heart className="mx-auto h-6 w-6 text-purple-600 md:h-8 md:w-8" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 md:text-base">
                {t("features.checkIns.title")}
              </h3>
              <p className="mt-1 hidden text-xs text-gray-600 sm:block md:text-sm">
                {t("features.checkIns.description")}
              </p>
            </div>
            <div className="text-center">
              <Users className="mx-auto h-6 w-6 text-purple-600 md:h-8 md:w-8" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 md:text-base">
                {t("features.growTogether.title")}
              </h3>
              <p className="mt-1 hidden text-xs text-gray-600 sm:block md:text-sm">
                {t("features.growTogether.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reachable only once the buddy feature ships (hasBuddy is currently a
  // hardcoded false). The matched-buddy dashboard will render here.
  return null;
}
