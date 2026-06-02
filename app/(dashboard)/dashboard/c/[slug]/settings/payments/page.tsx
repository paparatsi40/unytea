"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CreditCard, Check, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

export default function CommunityPaymentsPage() {
  const t = useTranslations("dashboard.communityAdmin.settings.payments");
  const { toast } = useToast();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

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
    defaultTier: "pro" as "free" | "pro" | "vip",
    tierPricing: {
      free: "0",
      pro: "29",
      vip: "99",
    },
    tierStripePriceIds: {
      free: "",
      pro: "",
      vip: "",
    },
  });

  // Fetch Stripe Connect status and community settings
  useEffect(() => {
    if (!slug) return;

    async function loadData() {
      try {
        // Check Stripe Connect status
        const statusRes = await fetch("/api/stripe/connect/status");
        if (statusRes.ok) {
          const status = await statusRes.json();
          setStripeStatus(status);
        }

        const settingsRes = await fetch(`/api/communities/${slug}/payments`, {
          cache: "no-store",
        });

        if (settingsRes.ok) {
          const payload = await settingsRes.json();
          if (payload?.settings) {
            setSettings({
              isPaid: !!payload.settings.isPaid,
              monthlyPrice: String(payload.settings.monthlyPrice ?? "29"),
              yearlyPrice: String(payload.settings.yearlyPrice ?? "290"),
              defaultTier:
                payload.settings.defaultTier === "free" || payload.settings.defaultTier === "vip"
                  ? payload.settings.defaultTier
                  : "pro",
              tierPricing: {
                free: String(payload.settings.tierPricing?.free ?? "0"),
                pro: String(
                  payload.settings.tierPricing?.pro ?? payload.settings.monthlyPrice ?? "29"
                ),
                vip: String(payload.settings.tierPricing?.vip ?? "99"),
              },
              tierStripePriceIds: {
                free: String(payload.settings.tierStripePriceIds?.free ?? ""),
                pro: String(payload.settings.tierStripePriceIds?.pro ?? ""),
                vip: String(payload.settings.tierStripePriceIds?.vip ?? ""),
              },
            });
          }
        }
      } catch (_error) {
        console.error("Error loading payment data:", _error);
      }
      setIsLoading(false);
    }

    loadData();
  }, [slug]);

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
        throw new Error(errorData.details || errorData.error || t("toasts.connectLinkFailed"));
      }
    } catch (error) {
      console.error("Connect error:", error);
      toast({
        title: t("toasts.errorTitle"),
        description: error instanceof Error ? error.message : t("toasts.connectFailed"),
        variant: "destructive",
      });
    }
    setIsConnecting(false);
  };

  const handleSaveSettings = async () => {
    if (!slug) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/communities/${slug}/payments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error || t("toasts.saveServerFailed"));
      }

      if (payload?.settings) {
        setSettings({
          isPaid: !!payload.settings.isPaid,
          monthlyPrice: String(payload.settings.monthlyPrice ?? settings.monthlyPrice),
          yearlyPrice: String(payload.settings.yearlyPrice ?? settings.yearlyPrice),
          defaultTier:
            payload.settings.defaultTier === "free" || payload.settings.defaultTier === "vip"
              ? payload.settings.defaultTier
              : "pro",
          tierPricing: {
            free: String(payload.settings.tierPricing?.free ?? settings.tierPricing.free),
            pro: String(payload.settings.tierPricing?.pro ?? settings.tierPricing.pro),
            vip: String(payload.settings.tierPricing?.vip ?? settings.tierPricing.vip),
          },
          tierStripePriceIds: {
            free: String(
              payload.settings.tierStripePriceIds?.free ?? settings.tierStripePriceIds.free
            ),
            pro: String(
              payload.settings.tierStripePriceIds?.pro ?? settings.tierStripePriceIds.pro
            ),
            vip: String(
              payload.settings.tierStripePriceIds?.vip ?? settings.tierStripePriceIds.vip
            ),
          },
        });
      }

      toast({
        title: t("toasts.successTitle"),
        description: t("toasts.saved"),
      });
    } catch (error) {
      toast({
        title: t("toasts.errorTitle"),
        description: error instanceof Error ? error.message : t("toasts.saveFailed"),
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t("title")}</h2>
        <p className="mt-1 text-gray-500">{t("subtitle")}</p>
      </div>

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("connect.cardTitle")}
          </CardTitle>
          <CardDescription>{t("connect.cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!stripeStatus?.isConnected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {t("connect.notConnected.alertTitle")}
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    {t("connect.notConnected.alertBody")}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConnectStripe}
                disabled={isConnecting}
                className="bg-[#635BFF] text-white hover:bg-[#4f48cc]"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("connect.notConnected.connecting")}
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t("connect.notConnected.button")}
                  </>
                )}
              </Button>
            </div>
          ) : stripeStatus.status === "active" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    {t("connect.active.alertTitle")}
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    {t("connect.active.accountId", { id: stripeStatus.accountId ?? "" })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("connect.active.openDashboard")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    {t("connect.pending.alertTitle")}
                  </p>
                  <p className="mt-1 text-sm text-blue-700">{t("connect.pending.alertBody")}</p>
                </div>
              </div>
              <Button onClick={handleConnectStripe} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("connect.pending.loading")}
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("connect.pending.completeButton")}
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
          <CardTitle>{t("pricing.title")}</CardTitle>
          <CardDescription>{t("pricing.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paid Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="isPaid" className="text-base font-medium">
                {t("pricing.paidToggle")}
              </Label>
              <p className="text-sm text-gray-500">{t("pricing.paidToggleHint")}</p>
            </div>
            <input
              type="checkbox"
              id="isPaid"
              checked={settings.isPaid}
              onChange={(e) => setSettings((prev) => ({ ...prev, isPaid: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
          </div>

          {/* Pricing Fields */}
          {settings.isPaid && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthlyPrice">{t("pricing.monthlyLabel")}</Label>
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
                          tierPricing: {
                            ...prev.tierPricing,
                            pro: e.target.value || prev.tierPricing.pro,
                          },
                        }))
                      }
                      className="pl-7"
                      placeholder={t("pricing.monthlyPlaceholder")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearlyPrice">{t("pricing.yearlyLabel")}</Label>
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
                      placeholder={t("pricing.yearlyPlaceholder")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultTier">{t("pricing.defaultTierLabel")}</Label>
                  <select
                    id="defaultTier"
                    value={settings.defaultTier}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultTier: e.target.value as "free" | "pro" | "vip",
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="free">{t("tier.free")}</option>
                    <option value="pro">{t("tier.pro")}</option>
                    <option value="vip">{t("tier.vip")}</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="tierFree">
                      {t("pricing.tierAmountLabel", { tier: t("tier.free") })}
                    </Label>
                    <Input
                      id="tierFree"
                      type="number"
                      min="0"
                      value={settings.tierPricing.free}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          tierPricing: { ...prev.tierPricing, free: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tierPro">
                      {t("pricing.tierAmountLabel", { tier: t("tier.pro") })}
                    </Label>
                    <Input
                      id="tierPro"
                      type="number"
                      min="1"
                      value={settings.tierPricing.pro}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          tierPricing: { ...prev.tierPricing, pro: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tierVip">
                      {t("pricing.tierAmountLabel", { tier: t("tier.vip") })}
                    </Label>
                    <Input
                      id="tierVip"
                      type="number"
                      min="1"
                      value={settings.tierPricing.vip}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          tierPricing: { ...prev.tierPricing, vip: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="stripePriceFree">
                      {t("pricing.priceIdLabel", { tier: t("tier.free") })}
                    </Label>
                    <Input
                      id="stripePriceFree"
                      value={settings.tierStripePriceIds.free}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          tierStripePriceIds: { ...prev.tierStripePriceIds, free: e.target.value },
                        }))
                      }
                      placeholder={t("pricing.priceIdPlaceholderOptional")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="stripePricePro">
                      {t("pricing.priceIdLabel", { tier: t("tier.pro") })}
                    </Label>
                    <Input
                      id="stripePricePro"
                      value={settings.tierStripePriceIds.pro}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          tierStripePriceIds: { ...prev.tierStripePriceIds, pro: e.target.value },
                        }))
                      }
                      placeholder={t("pricing.priceIdPlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="stripePriceVip">
                      {t("pricing.priceIdLabel", { tier: t("tier.vip") })}
                    </Label>
                    <Input
                      id="stripePriceVip"
                      value={settings.tierStripePriceIds.vip}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          tierStripePriceIds: { ...prev.tierStripePriceIds, vip: e.target.value },
                        }))
                      }
                      placeholder={t("pricing.priceIdPlaceholder")}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {t("pricing.revenuePreview", {
                  monthly: (parseFloat(settings.monthlyPrice || "0") * 0.95).toFixed(2),
                  yearly: (parseFloat(settings.yearlyPrice || "0") * 0.95).toFixed(2),
                  fee: 5,
                })}
              </p>
            </div>
          )}

          {/* Save Button */}
          <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("pricing.saving")}
              </>
            ) : (
              t("pricing.save")
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Revenue Info */}
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <h3 className="mb-2 font-semibold text-gray-900">{t("revenueSplit.title")}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-green-600">95%</p>
              <p className="text-sm text-gray-600">{t("revenueSplit.youKeep")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-600">5%</p>
              <p className="text-sm text-gray-600">{t("revenueSplit.platformFee")}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">{t("revenueSplit.footer")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
