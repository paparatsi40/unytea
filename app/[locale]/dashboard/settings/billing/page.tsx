"use client";

import { UsageDashboard } from "@/components/usage/UsageDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CreditCard, Download, ExternalLink, Crown, Zap, Sparkles } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { CurrentPlanBadge } from "@/components/subscription/CurrentPlanBadge";

export default function BillingPage() {
  const { user } = useCurrentUser();
  
  const currentPlan = (user as any)?.subscriptionPlan || "FREE";
  const subscriptionStatus = (user as any)?.subscriptionStatus;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Billing & Usage</h2>
        <p className="text-base text-muted-foreground">
          Manage your subscription, view usage, and access billing history
        </p>
        <div className="mt-3 flex items-center gap-3">
          <CurrentPlanBadge />
          {subscriptionStatus && subscriptionStatus !== "ACTIVE" && (
            <Badge variant="destructive">{subscriptionStatus}</Badge>
          )}
        </div>
      </div>

      {/* Current Plan Details Card */}
      {currentPlan !== "FREE" && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-600/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Your Subscription</CardTitle>
                <CardDescription>
                  {currentPlan === "PROFESSIONAL" && "Professional Plan - For serious community builders"}
                  {currentPlan === "SCALE" && "Scale Plan - For growing businesses"}
                  {currentPlan === "ENTERPRISE" && "Enterprise Plan - For large organizations"}
                </CardDescription>
              </div>
              {currentPlan === "PROFESSIONAL" && <Zap className="h-8 w-8 text-purple-600" />}
              {currentPlan === "SCALE" && <Crown className="h-8 w-8 text-blue-600" />}
              {currentPlan === "ENTERPRISE" && <Sparkles className="h-8 w-8 text-gradient" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="default">
                <Link href="/pricing">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View All Plans
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/settings/billing/manage">
                  Manage Subscription
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Free Plan Upgrade CTA */}
      {currentPlan === "FREE" && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-purple-600/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Upgrade Your Plan</CardTitle>
                <CardDescription>
                  Unlock more communities, members, and features
                </CardDescription>
              </div>
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/pricing">
                  <Sparkles className="mr-2 h-4 w-4" />
                  View Plans & Pricing
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Dashboard - Main Feature */}
      <UsageDashboard />

      {/* Billing Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Billing Management</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Payment Method</CardTitle>
                  <CardDescription>Manage your payment details</CardDescription>
                </div>
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-background">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">•••• 4242</div>
                      <div className="text-xs text-muted-foreground">Expires 12/2025</div>
                    </div>
                  </div>
                  <Badge>Default</Badge>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                Update Payment Method
              </Button>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Billing History</CardTitle>
                  <CardDescription>View and download invoices</CardDescription>
                </div>
                <Download className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {/* Mock invoices */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium">December 2024</div>
                    <div className="text-xs text-muted-foreground">$129.00</div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium">November 2024</div>
                    <div className="text-xs text-muted-foreground">$129.00</div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                View All Invoices
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Manage your plan, billing frequency, and cancellation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/pricing">
                <ExternalLink className="mr-2 h-4 w-4" />
                View All Plans
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/settings/billing/manage">
                Manage Subscription
              </Link>
            </Button>
            <Button variant="outline" disabled>
              Cancel Subscription
            </Button>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <div className="text-amber-600">ℹ️</div>
              <div>
                <div className="font-medium text-amber-900">Fair Usage Policy</div>
                <p className="mt-1 text-sm text-amber-800">
                  Our usage-based pricing ensures you only pay for what you use. 
                  Base plans include generous limits, and overage charges are calculated 
                  fairly and transparently. View your real-time usage above.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Have questions about billing or your subscription?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/help">
                Visit Help Center
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:billing@unytea.com">
                Contact Billing Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}