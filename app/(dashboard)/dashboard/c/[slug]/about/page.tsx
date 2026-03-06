"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Users, Calendar, BookOpen, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export default function CommunityAboutPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
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
    } finally {
      setIsLoading(false);
    }
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
        <p className="text-gray-600">Community not found</p>
      </div>
    );
  }

  const createdDate = new Date(community.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">About {community.name}</h1>
        <p className="text-gray-600">Learn more about this community</p>
      </div>

      {/* Cover Image */}
      {community.coverImage && (
        <div className="mb-8 rounded-2xl overflow-hidden h-64 relative">
          <img
            src={community.coverImage}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
        <p className="text-gray-700 leading-relaxed">
          {community.description || "No description available."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{community._count?.members || 0}</p>
            <p className="text-gray-600 text-sm">Members</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{community._count?.posts || 0}</p>
            <p className="text-gray-600 text-sm">Posts</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Globe className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{community._count?.courses || 0}</p>
            <p className="text-gray-600 text-sm">Courses</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Community Details</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">Created on {createdDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">Type: {community.type || "Public"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">Slug: {community.slug}</span>
          </div>
        </div>
      </div>

      {/* Owner */}
      {community.owner && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Community Owner</h2>
          <div className="flex items-center gap-4">
            {community.owner.image ? (
              <img
                src={community.owner.image}
                alt={community.owner.name || "Owner"}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{community.owner.name || "Unknown"}</p>
              <p className="text-gray-600 text-sm">Owner</p>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="flex gap-4">
        <Link href={`/dashboard/c/${slug}/chat`}>
          <Button variant="outline">
            Back to Community
          </Button>
        </Link>
      </div>
    </div>
  );
}
