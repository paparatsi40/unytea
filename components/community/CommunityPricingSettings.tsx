"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  enablePaidCommunity,
  disablePaidCommunity,
  getStripeConnectStatus,
} from "@/app/actions/community-payments";

interface CommunityPricingSettingsProps {
  communityId: string;
  isPaid: boolean;
  membershipPrice: number | null;
}

export function CommunityPricingSettings({
  communityId,
  isPaid: initialIsPaid,
  membershipPrice: initialPrice,
}: CommunityPricingSettingsProps) {
  const [isPaid, setIsPaid] = useState(initialIsPaid);
  const [price, setPrice] = useState(
    initialPrice ? (initialPrice / 100).toFixed(2) : "29.00"
  );
  const [loading, setLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [checkingStripe, setCheckingStripe] = useState(false);

  // Check Stripe status
  async function checkStripeStatus() {
    setCheckingStripe(true);
    try {
      const result = await getStripeConnectStatus();
      if (result.success) {
        setStripeStatus(result.status);
      }
    } catch (error) {
      console.error("Error checking Stripe:", error);
    } finally {
      setCheckingStripe(false);
    }
  }

  async function handleTogglePaid(enabled: boolean) {
    if (enabled) {
      // Check if Stripe is connected first
      await checkStripeStatus();
      if (!stripeStatus) {
        const result = await getStripeConnectStatus();
        if (result.success) {
          setStripeStatus(result.status);
        }
      }

      if (!stripeStatus?.hasAccount || !stripeStatus?.chargesEnabled) {
        toast.error("Please connect your Stripe account first", {
          description: "Go to Settings → Payments to set up",
          action: {
            label: "Go to Settings",
            onClick: () => {
              window.location.href = "/dashboard/settings/payments";
            },
          },
        });
        return;
      }

      // Enable paid
      await handleEnablePaid();
    } else {
      // Disable paid
      await handleDisablePaid();
    }
  }

  async function handleEnablePaid() {
    setLoading(true);
    try {
      const priceInCents = Math.round(parseFloat(price) * 100);

      if (isNaN(priceInCents) || priceInCents < 100) {
        toast.error("Price must be at least $1.00");
        return;
      }

      const result = await enablePaidCommunity(communityId, priceInCents);

      if (result.success) {
        setIsPaid(true);
        toast.success("Paid community enabled! 🎉", {
          description: `Members will pay $${price}/month`,
        });
      } else if (result.needsOnboarding) {
        toast.error("Complete Stripe setup first", {
          description: "Go to Settings → Payments",
          action: {
            label: "Go to Settings",
            onClick: () => {
              window.location.href = "/dashboard/settings/payments";
            },
          },
        });
      } else {
        toast.error(result.error || "Failed to enable paid community");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisablePaid() {
    setLoading(true);
    try {
      const result = await disablePaidCommunity(communityId);

      if (result.success) {
        setIsPaid(false);
        toast.success("Community is now free");
      } else {
        toast.error(result.error || "Failed to disable paid community");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePrice() {
    await handleEnablePaid();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Paid Memberships
        </CardTitle>
        <CardDescription>
          Charge a monthly fee for members to join this community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">
                  {isPaid ? "Paid Community" : "Free Community"}
                </div>
                {isPaid && (
                  <Badge variant="default" className="bg-green-500">
                    Active
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {isPaid
                  ? `Members pay $${price}/month to join`
                  : "Anyone can join for free"}
              </div>
            </div>
          </div>
          <Switch
            checked={isPaid}
            onCheckedChange={handleTogglePaid}
            disabled={loading || checkingStripe}
          />
        </div>

        {/* Pricing Configuration */}
        {isPaid && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="price">Monthly Membership Price</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="1.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-9"
                    placeholder="29.00"
                  />
                </div>
                <Button
                  onClick={handleUpdatePrice}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Update Price"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum: $1.00/month
              </p>
            </div>

            {/* Earnings Breakdown */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Member Pays</div>
                <div className="font-semibold">${price}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Stripe Fee (~2.9%)</div>
                <div className="font-semibold text-muted-foreground">
                  ${(parseFloat(price) * 0.029).toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-green-600 font-medium">You Receive</div>
                <div className="font-bold text-green-600">
                  ${(parseFloat(price) * 0.971).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                0% Unytea Commission
              </div>
              <div className="text-blue-800 dark:text-blue-200">
                We charge <strong>0% transaction fee</strong>. You keep 100% of your earnings (minus standard Stripe processing fees). Payments go directly to your Stripe account.
              </div>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-blue-600 dark:text-blue-400"
                onClick={() => window.location.href = "/dashboard/settings/payments"}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Manage Stripe Account
              </Button>
            </div>
          </div>
        </div>

        {/* Warning for existing members */}
        {isPaid && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Existing Members
                </div>
                <div className="text-yellow-800 dark:text-yellow-200">
                  Current members remain free. New members joining after this change will be charged the monthly fee.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}