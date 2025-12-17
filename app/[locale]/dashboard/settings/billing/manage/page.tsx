import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

export default async function ManageSubscriptionPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  const { locale } = await params;

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch user's subscription info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      subscriptionEndsAt: true,
    },
  });

  const hasActiveSubscription = user?.subscriptionStatus === "ACTIVE";
  const isPaidPlan = user?.subscriptionPlan && user.subscriptionPlan !== "FREE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/dashboard/settings/billing`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Manage Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan, payment method, and billing settings
        </p>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Your active plan and billing status</CardDescription>
            </div>
            {hasActiveSubscription ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                {user?.subscriptionStatus || "No Plan"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActiveSubscription ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Plan</div>
                  <div className="text-2xl font-bold text-foreground">
                    {user?.subscriptionPlan || "Free"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-2xl font-bold text-foreground capitalize">
                    {user?.subscriptionStatus}
                  </div>
                </div>
              </div>

              {user?.subscriptionEndsAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Renews on{" "}
                    {new Date(user.subscriptionEndsAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                You don't have an active subscription
              </div>
              <Button asChild>
                <Link href={`/${locale}/pricing`}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Plans
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Change Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Plan</CardTitle>
            <CardDescription>Upgrade or downgrade your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/${locale}/pricing`}>
                <TrendingUp className="mr-2 h-4 w-4" />
                View Plans
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Update Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Method</CardTitle>
            <CardDescription>Update your billing information</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              Update Card
            </Button>
          </CardContent>
        </Card>

        {/* Cancel Subscription */}
        {hasActiveSubscription && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base text-red-900">Cancel Subscription</CardTitle>
              <CardDescription>End your subscription at period end</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reactivate Subscription */}
        {/* Removed reactivate subscription card as there is no cancelAtPeriodEnd field in the user model */}
      </div>

      {/* Billing History Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
          <CardDescription>View past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/dashboard/settings/billing`}>
              View History
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
          <CardDescription>
            Questions about billing, plans, or payments? We're here to help.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="link" className="p-0 h-auto" asChild>
            <Link href="/help/billing">Billing FAQ</Link>
          </Button>
          <br />
          <Button variant="link" className="p-0 h-auto" asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
