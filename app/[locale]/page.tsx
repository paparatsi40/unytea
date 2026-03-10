"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  LayoutDashboard,
  ArrowRight,
  Play,
  Star,
  CheckCircle,
  Users,
  Zap,
  Video,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Award,
  Shield,
  Globe,
  Clock,
  ChevronDown,
  Quote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Home() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const t = useTranslations("landing");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-strong border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Unytea</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.features")}
            </Link>
            <Link href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.testimonials")}
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.pricing")}
            </Link>
            <Link href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.faq")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link
              href="/dashboard"
              className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t("nav.goToDashboard")}
            </Link>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-600/5 to-background" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background/80" />
        <div className="container mx-auto px-4 relative z-10 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-7xl mx-auto">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">{t("hero.badge")}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                {t("hero.title")}
                <br />
                <span className="gradient-text">{t("hero.subtitle")}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0">
                {t("hero.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center mb-6">
                <Link
                  href="/auth/signup"
                  className="btn-hover-lift px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-semibold shadow-smooth-lg inline-flex items-center gap-2 group"
                >
                  {t("hero.cta.primary")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button 
                  onClick={() => setShowDemoModal(true)}
                  className="btn-hover-lift px-6 py-3 glass-strong rounded-xl text-base font-semibold inline-flex items-center gap-2 group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-primary fill-primary" />
                  </div>
                  {t("hero.cta.secondary")}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Avatar key={i} className="w-7 h-7 border-2 border-background">
                        <AvatarImage src={`https://i.pravatar.cc/150?img=${i + 10}`} />
                        <AvatarFallback>U{i}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span>{t("hero.socialProof.members")}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                  <span className="ml-2">{t("hero.socialProof.rating")}</span>
                </div>
              </div>
            </div>
