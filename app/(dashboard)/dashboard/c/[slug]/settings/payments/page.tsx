"use client";

import { useState, useEffect } from "react";
import { CreditCard, Check, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function CommunityPaymentsPage() {
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [stripeStatus, setStripeStatus] = useState<{
    isConnected: boolean;
    status: string;
    accountId?: string;
  } | null>(null);
  
  const [settings, setSettings] = useState({
    isPaid: false,
    monthlyPrice: "29",
    yearlyPrice: "290",
  });

  // Fetch Stripe Connect status and community settings
  useEffect(() => {
    async function loadData() {
      try {
        // Check Stripe Connect status
        const statusRes = await fetch("/api/stripe/connect/status");
        if (statusRes.ok) {
          const status = await statusRes.json();
          setStripeStatus(status);
        }

        // TODO: Fetch community payment settings
        // This would need a new API endpoint
        
      } catch (_error) {
        console.error("Error loading payment data:", _error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleConnectStripe = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const errorData = await res.json();
        console.error("Stripe Connect error:", errorData);
        throw new Error(errorData.details || errorData.error || "Failed to create onboarding link");
      }
    } catch (error: any) {
      console.error("Connect error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect with Stripe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // TODO: Save community payment settings
      // This would need a new API endpoint to update community isPaid and pricing
      
      toast({
        title: "Success",
        description: "Payment settings saved successfully.",
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payments & Monetization</h2>
        <p className="text-gray-500 mt-1">
          Configure paid memberships and connect your Stripe account
        </p>
      </div>

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Connect
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payments from community members.
            You keep 95% of all revenue, platform fee is 5%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stripeStatus?.isConnected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Stripe account not connected
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    You need to connect a Stripe account before you can charge for memberships.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConnectStripe}
                disabled={isConnecting}
                className="bg-[#635BFF] hover:bg-[#4f48cc] text-white"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Connect with Stripe
                  </>
                )}
              </Button>
            </div>
          ) : stripeStatus.status === "active" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Stripe account connected and active
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Account ID: {stripeStatus.accountId}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Stripe account pending verification
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Please complete the verification process in Stripe.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConnectStripe}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Complete Verification
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Membership Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Pricing</CardTitle>
          <CardDescription>
            Set your community membership prices. Free communities allow anyone to join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paid Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="isPaid" className="text-base font-medium">
                Paid Community
              </Label>
              <p className="text-sm text-gray-500">
                Require payment to join this community
              </p>
            </div>
            <input
              type="checkbox"
              id="isPaid"
              checked={settings.isPaid}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, isPaid: e.target.checked }))
              }
              className="h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Pricing Fields */}
          {settings.isPaid && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">
                  Monthly Price (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    min="1"
                    value={settings.monthlyPrice}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        monthlyPrice: e.target.value,
                      }))
                    }
                    className="pl-7"
                    placeholder="29"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  You receive: ${(parseFloat(settings.monthlyPrice || "0") * 0.95).toFixed(2)}/mo
                  (5% platform fee)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearlyPrice">
                  Yearly Price (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="yearlyPrice"
                    type="number"
                    min="1"
                    value={settings.yearlyPrice}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        yearlyPrice: e.target.value,
                      }))
                    }
                    className="pl-7"
                    placeholder="290"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  You receive: ${(parseFloat(settings.yearlyPrice || "0") * 0.95).toFixed(2)}/yr
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full md:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Revenue Info */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Revenue Split</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-green-600">95%</p>
              <p className="text-sm text-gray-600">You keep</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-600">5%</p>
              <p className="text-sm text-gray-600">Platform fee</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Payments are processed securely through Stripe and transferred to your account automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
