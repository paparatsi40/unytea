"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Video, 
  Users, 
  HardDrive, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  DollarSign,
  ArrowUpRight 
} from "lucide-react";
import Link from "next/link";

interface UsageData {
  plan: string;
  videoHours: number;
  videoLimit: number;
  videoOverage: number;
  memberCount: number;
  memberLimit: number;
  memberOverage: number;
  estimatedCost: {
    basePrice: number;
    memberOverage: number;
    videoOverage: number;
    storageOverage: number;
    totalCost: number;
    breakdown: string[];
  };
  usagePercent: {
    video: number;
    members: number;
  };
  billingCycleEnd?: string;
}

export function UsageDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await fetch("/api/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error("Error loading usage:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!usage) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Unable to load usage data</p>
        </CardContent>
      </Card>
    );
  }

  const daysUntilReset = usage.billingCycleEnd
    ? Math.ceil((new Date(usage.billingCycleEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const hasOverage = usage.videoOverage > 0 || usage.memberOverage > 0;
  const isApproachingLimit = usage.usagePercent.video >= 80 || usage.usagePercent.members >= 80;

  return (
    <div className="space-y-6">
      {/* Billing Cycle Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usage Dashboard</h2>
          <span className="text-sm text-muted-foreground">
            Current Plan: <Badge variant="default">{usage.plan}</Badge>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Resets in {daysUntilReset} days</span>
        </div>
      </div>

      {/* Alerts */}
      {hasOverage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>You've exceeded your plan limits.</strong> Additional charges will apply this billing cycle.
            {usage.estimatedCost.breakdown.map((item, i) => (
              <div key={i} className="mt-1 text-sm">• {item}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {isApproachingLimit && !hasOverage && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Approaching plan limits.</strong> Consider upgrading to avoid overage charges.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Video Usage */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Video className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Video Hours</CardTitle>
                  <CardDescription>Live sessions & recordings</CardDescription>
                </div>
              </div>
              {usage.videoOverage > 0 && (
                <Badge variant="destructive">Overage</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-foreground">
                  {usage.videoHours.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  of {usage.videoLimit} hours
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-muted-foreground">
                  {usage.usagePercent.video.toFixed(0)}%
                </div>
              </div>
            </div>

            <Progress 
              value={Math.min(usage.usagePercent.video, 100)} 
              className="h-2"
            />

            {usage.videoOverage > 0 && (
              <div className="rounded-lg bg-red-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-900">Overage:</span>
                  <span className="font-semibold text-red-900">
                    {usage.videoOverage.toFixed(1)} hours
                  </span>
                </div>
                <div className="mt-1 text-xs text-red-700">
                  +${usage.estimatedCost.videoOverage.toFixed(2)} this cycle
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Usage */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Total Members</CardTitle>
                  <CardDescription>Across all communities</CardDescription>
                </div>
              </div>
              {usage.memberOverage > 0 && (
                <Badge variant="destructive">Overage</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-foreground">
                  {usage.memberCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  of {usage.memberLimit} members
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-muted-foreground">
                  {usage.usagePercent.members.toFixed(0)}%
                </div>
              </div>
            </div>

            <Progress 
              value={Math.min(usage.usagePercent.members, 100)} 
              className="h-2"
            />

            {usage.memberOverage > 0 && (
              <div className="rounded-lg bg-red-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-900">Overage:</span>
                  <span className="font-semibold text-red-900">
                    {usage.memberOverage} members
                  </span>
                </div>
                <div className="mt-1 text-xs text-red-700">
                  +${usage.estimatedCost.memberOverage.toFixed(2)} this cycle
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estimated Bill */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Estimated Bill</CardTitle>
                <CardDescription>For this billing cycle</CardDescription>
              </div>
            </div>
            {hasOverage && (
              <Badge variant="destructive" className="gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Over Budget
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Base Price */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base Plan ({usage.plan})</span>
              <span className="font-medium">${usage.estimatedCost.basePrice.toFixed(2)}</span>
            </div>

            {/* Overages */}
            {usage.estimatedCost.memberOverage > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Member Overage</span>
                <span className="font-medium text-red-600">
                  +${usage.estimatedCost.memberOverage.toFixed(2)}
                </span>
              </div>
            )}

            {usage.estimatedCost.videoOverage > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Video Overage</span>
                <span className="font-medium text-red-600">
                  +${usage.estimatedCost.videoOverage.toFixed(2)}
                </span>
              </div>
            )}

            {usage.estimatedCost.storageOverage > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Storage Overage</span>
                <span className="font-medium text-red-600">
                  +${usage.estimatedCost.storageOverage.toFixed(2)}
                </span>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">Total</span>
                <span className="text-3xl font-bold text-foreground">
                  ${usage.estimatedCost.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Charged on cycle end
              </div>
            </div>

            {hasOverage && (
              <Button asChild className="w-full">
                <Link href="/dashboard/settings/billing">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Upgrade to Save Money
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings/billing">
            View Billing History
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings/billing">
            Manage Subscription
          </Link>
        </Button>
        {isApproachingLimit && (
          <Button asChild>
            <Link href="/pricing">
              <TrendingUp className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}