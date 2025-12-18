"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, CheckCircle, AlertCircle, ExternalLink, TrendingUp, CreditCard } from "lucide-react";
import { toast } from "sonner";
import {
  startStripeOnboarding,
  getStripeConnectStatus,
  getStripeDashboardLink,
  getEarnings,
} from "@/app/actions/community-payments";

export default function PaymentsSettingsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);

  // Check if returning from onboarding
  useEffect(() => {
    if (searchParams.get("onboarding") === "success") {
      toast.success("Stripe account connected successfully! 🎉");
      // Remove query param
      window.history.replaceState({}, "", "/dashboard/settings/payments");
    }
  }, [searchParams]);

  // Load status and earnings
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statusResult, earningsResult] = await Promise.all([
        getStripeConnectStatus(),
        getEarnings(),
      ]);

      if (statusResult.success) {
        setStatus(statusResult.status);
      }

      if (earningsResult.success) {
        setEarnings(earningsResult.earnings);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartOnboarding() {
    setActionLoading(true);
    try {
      const result = await startStripeOnboarding();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result.error || "Failed to start onboarding");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOpenDashboard() {
    setActionLoading(true);
    try {
      const result = await getStripeDashboardLink();
      if (result.success && result.url) {
        window.open(result.url, "_blank");
      } else {
        toast.error(result.error || "Failed to get dashboard link");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const isConnected = status?.hasAccount && status?.chargesEnabled;
  const needsSetup = status?.hasAccount && !status?.detailsSubmitted;

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Stripe account and earnings from paid communities
        </p>
      </div>

      {/* Stripe Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Connect Status
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payments from community members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <div className="font-semibold text-lg">
                  {isConnected ? "Connected" : needsSetup ? "Setup Required" : "Not Connected"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isConnected
                    ? "Your Stripe account is active and ready to receive payments"
                    : needsSetup
                    ? "Complete your Stripe account setup to start receiving payments"
                    : "Connect Stripe to enable paid community memberships"}
                </div>
              </div>
            </div>
            <div>
              {isConnected ? (
                <Badge variant="default" className="bg-green-500">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>

          {/* Status Details */}
          {status?.hasAccount && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Charges</div>
                <div className="flex items-center gap-2 mt-1">
                  {status.chargesEnabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Enabled</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Disabled</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Payouts</div>
                <div className="flex items-center gap-2 mt-1">
                  {status.payoutsEnabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Enabled</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Disabled</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground">Details</div>
                <div className="flex items-center gap-2 mt-1">
                  {status.detailsSubmitted ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Complete</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Incomplete</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!status?.hasAccount ? (
              <Button
                onClick={handleStartOnboarding}
                disabled={actionLoading}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Connect Stripe Account
                  </>
                )}
              </Button>
            ) : needsSetup ? (
              <Button
                onClick={handleStartOnboarding}
                disabled={actionLoading}
                size="lg"
                variant="default"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Complete Setup
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleOpenDashboard}
                disabled={actionLoading}
                size="lg"
                variant="outline"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Stripe Dashboard
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="flex gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  0% Transaction Fee
                </div>
                <div className="text-blue-800 dark:text-blue-200">
                  Unytea charges <strong>0% commission</strong> on community payments. You keep 100% of your earnings (minus standard Stripe processing fees of ~2.9% + $0.30).
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Earnings Overview
          </CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Earnings</div>
              <div className="text-3xl font-bold">
                ${earnings?.totalUSD?.toFixed(2) || "0.00"}
              </div>
              <div className="text-xs text-muted-foreground">
                {earnings?.count || 0} payments received
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">After Fees</div>
              <div className="text-3xl font-bold text-green-600">
                ${earnings?.totalUSD ? (earnings.totalUSD * 0.971).toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-muted-foreground">
                ~2.9% Stripe processing fee
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Unytea Fee</div>
              <div className="text-3xl font-bold text-purple-600">
                $0.00
              </div>
              <div className="text-xs text-green-600 font-medium">
                0% commission! 🎉
              </div>
            </div>
          </div>

          {!isConnected && (
            <div className="mt-6 p-4 border border-dashed rounded-lg text-center text-muted-foreground">
              Connect your Stripe account to start earning
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Community Payments Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 font-semibold flex-shrink-0">
                1
              </div>
              <div>
                <div className="font-semibold">Connect Stripe</div>
                <div className="text-sm text-muted-foreground">
                  Complete a quick 2-minute onboarding process with Stripe Connect
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 font-semibold flex-shrink-0">
                2
              </div>
              <div>
                <div className="font-semibold">Enable Paid Communities</div>
                <div className="text-sm text-muted-foreground">
                  Set your monthly membership price for any community you create
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 font-semibold flex-shrink-0">
                3
              </div>
              <div>
                <div className="font-semibold">Receive Payments</div>
                <div className="text-sm text-muted-foreground">
                  Members pay monthly subscriptions directly to your Stripe account
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 font-semibold flex-shrink-0">
                4
              </div>
              <div>
                <div className="font-semibold">Keep Your Earnings</div>
                <div className="text-sm text-muted-foreground">
                  Funds are deposited to your bank account automatically by Stripe
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}