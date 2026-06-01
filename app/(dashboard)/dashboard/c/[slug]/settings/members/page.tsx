"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MemberDirectory } from "@/components/members/MemberDirectory";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CommunitySettingsMembers() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const t = useTranslations("dashboard.communityAdmin.settings.members");
  const tDir = useTranslations("dashboard.communityAdmin.settings.memberDirectory");
  const [communityId, setCommunityId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCommunity = async () => {
      try {
        const response = await fetch(`/api/communities/${slug}`);
        const data = await response.json();
        if (data?.id) {
          setCommunityId(data.id);
        }
      } catch (error) {
        console.error("Error loading community:", error);
      }
      setIsLoading(false);
    };

    loadCommunity();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!communityId) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-gray-600">{tDir("notFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>
      <MemberDirectory communityId={communityId} />
    </div>
  );
}
