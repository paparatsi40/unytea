import Link from "next/link";
import { ArrowRight, Video, Sparkles, Palette, Zap, Shield, Check, X, DollarSign, Users, Brain, TrendingUp } from "lucide-react";
import { HomeNav } from "@/components/HomeNav";
import { getTranslations } from 'next-intl/server';
import { Logo } from "@/components/brand/Logo";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations(); // Sin namespace, porque i18n.ts ya carga home.json como root

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Navigation */}
      <HomeNav locale={locale} />

      {/* Hero Section - KILLER */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern-animated opacity-20" />
        <div className="container mx-auto max-w-6xl text-center relative z-10">
          {/* Aggressive Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-vibrant mb-8 slide-up-fade glow-pulse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-bold">{t('hero.badge')}</span>
          </div>

          {/* KILLER Headline */}
          <h1 className="text-6xl md:text-8xl font-black mb-6 slide-up-fade leading-tight" style={{ animationDelay: "0.1s" }}>
            {t('hero.headline1')}
            <br />
            <span className="gradient-text text-shimmer">{t('hero.headline2')}</span>
          </h1>

          <p className="text-2xl md:text-3xl text-muted-foreground mb-6 max-w-3xl mx-auto slide-up-fade font-bold" style={{ animationDelay: "0.2s" }}>
            {t('hero.subtitle1')}
            <span className="text-primary"> {t('hero.subtitle2')}</span>
          </p>

          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto slide-up-fade" style={{ animationDelay: "0.25s" }}>
            {t('hero.description')}
            <strong className="text-foreground"> {t('hero.descriptionBold')}</strong>
          </p>

          {/* Price Comparison Shock */}
          <div className="glass-strong rounded-2xl p-8 mb-12 max-w-3xl mx-auto slide-up-fade" style={{ animationDelay: "0.3s" }}>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="font-bold text-red-500">{t('priceComparison.circle.name')}</span>
                </div>
                <p className="text-3xl font-bold text-red-500 mb-1">{t('priceComparison.circle.price')}<span className="text-sm">{t('priceComparison.circle.period')}</span></p>
                <p className="text-sm text-muted-foreground">{t('priceComparison.circle.description')}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="font-bold text-red-500">{t('priceComparison.skool.name')}</span>
                </div>
                <p className="text-3xl font-bold text-red-500 mb-1">{t('priceComparison.skool.price')}<span className="text-sm">{t('priceComparison.skool.period')}</span></p>
                <p className="text-sm text-muted-foreground">{t('priceComparison.skool.description')}</p>
              </div>
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-vibrant rounded-xl blur-lg opacity-30"></div>
                <div className="relative bg-background rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-primary">{t('priceComparison.unytea.name')}</span>
                  </div>
                  <p className="text-3xl font-bold text-primary mb-1">{t('priceComparison.unytea.price')}<span className="text-sm">{t('priceComparison.unytea.period')}</span></p>
                  <p className="text-sm text-foreground font-semibold">{t('priceComparison.unytea.description')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center slide-up-fade mb-8" style={{ animationDelay: "0.4s" }}>
            <Link
              href={`/${locale}/auth/signup`}
              className="btn-hover-lift px-10 py-5 bg-gradient-vibrant text-white rounded-2xl text-xl font-bold shadow-smooth-lg inline-flex items-center gap-2 group hover-glow"
            >
              {t('hero.ctaPrimary')}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#comparison"
              className="px-10 py-5 glass-strong rounded-2xl text-xl font-semibold hover:shadow-smooth-lg transition-all"
            >
              {t('hero.ctaSecondary')}
            </Link>
          </div>

          <p className="text-sm text-muted-foreground slide-up-fade" style={{ animationDelay: "0.5s" }}>
            {t('hero.trustBadges')}
          </p>
        </div>
      </section>

      {/* Why They're Failing You Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-red-500/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">
              {t('failingSection.title')} <span className="text-red-500">{t('failingSection.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('failingSection.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {['noVideo', 'noCustomization', 'noEngagement', 'overpriced', 'ancientTech', 'vendorLock'].map((key) => (
              <div
                key={key}
                className="glass-strong rounded-2xl p-8 hover:scale-105 transition-transform"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{t(`failingSection.points.${key}.title`)}</h3>
                    <p className="text-muted-foreground mb-3">{t(`failingSection.points.${key}.problem`)}</p>
                    <div className="flex items-start gap-2 text-primary">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="font-semibold">{t(`failingSection.points.${key}.solution`)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KILLER Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">
              {t('featuresSection.title')} <span className="gradient-text">{t('featuresSection.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('featuresSection.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { key: 'video', icon: Video },
              { key: 'buddy', icon: Sparkles },
              { key: 'content', icon: Brain },
              { key: 'customization', icon: Palette },
              { key: 'aiInsights', icon: TrendingUp },
              { key: 'realtime', icon: Zap },
              { key: 'pricing', icon: DollarSign },
              { key: 'security', icon: Shield },
              { key: 'matching', icon: Users },
            ].map((feature, index) => (
              <div
                key={feature.key}
                className="card-hover glass-strong rounded-2xl p-8 relative overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-vibrant blur-3xl opacity-20"></div>
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-vibrant rounded-2xl flex items-center justify-center mb-4">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{t(`featuresSection.features.${feature.key}.title`)}</h3>
                  <p className="text-muted-foreground mb-4">{t(`featuresSection.features.${feature.key}.description`)}</p>
                  <span className="inline-block px-4 py-2 bg-gradient-vibrant text-white text-xs font-bold rounded-full">
                    {t(`featuresSection.features.${feature.key}.badge`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brutal Comparison Table */}
      <section id="comparison" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">{t('comparisonSection.title')}</h2>
            <p className="text-xl text-muted-foreground">
              {t('comparisonSection.subtitle')}
            </p>
          </div>

          <div className="glass-strong rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-vibrant text-white">
                  <tr>
                    <th className="text-left p-6 font-bold text-lg">{t('comparisonSection.title')}</th>
                    <th className="text-center p-6 font-bold text-lg">Circle</th>
                    <th className="text-center p-6 font-bold text-lg">Skool</th>
                    <th className="text-center p-6 font-bold text-lg">Teachable</th>
                    <th className="text-center p-6 font-bold text-lg bg-primary">Unytea</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'videoCalls', circle: false, skool: false, teachable: false },
                    { key: 'recording', circle: false, skool: false, teachable: false },
                    { key: 'buddySystem', circle: false, skool: false, teachable: false },
                    { key: 'contentSharing', circle: false, skool: false, teachable: false },
                    { key: 'realtime', circle: false, skool: false, teachable: false },
                    { key: 'aiInsights', circle: false, skool: false, teachable: false },
                    { key: 'customDomain', circle: true, skool: true, teachable: true },
                    { key: 'branding', circle: false, skool: false, teachable: false },
                    { key: 'whiteLabel', circle: true, skool: false, teachable: true },
                    { key: 'courses', circle: true, skool: true, teachable: true },
                    { key: 'forums', circle: true, skool: true, teachable: false },
                    { key: 'profiles', circle: true, skool: true, teachable: true },
                    { key: 'mobileApp', circle: true, skool: true, teachable: true },
                    { key: 'api', circle: true, skool: false, teachable: true },
                    { key: 'usagePricing', circle: false, skool: false, teachable: false },
                    { key: 'migration', circle: false, skool: false, teachable: false },
                  ].map((feature) => (
                    <tr key={feature.key} className="border-b border-border/50 last:border-0">
                      <td className="p-6 font-semibold">{t(`comparisonSection.features.${feature.key}`)}</td>
                      <td className="p-6 text-center">
                        {feature.circle ? <Check className="w-6 h-6 text-green-500 mx-auto" /> : <X className="w-6 h-6 text-red-500 mx-auto" />}
                      </td>
                      <td className="p-6 text-center">
                        {feature.skool ? <Check className="w-6 h-6 text-green-500 mx-auto" /> : <X className="w-6 h-6 text-red-500 mx-auto" />}
                      </td>
                      <td className="p-6 text-center">
                        {feature.teachable ? <Check className="w-6 h-6 text-green-500 mx-auto" /> : <X className="w-6 h-6 text-red-500 mx-auto" />}
                      </td>
                      <td className="p-6 text-center bg-primary/5">
                        <Check className="w-6 h-6 text-primary mx-auto font-bold" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              href={`/${locale}/auth/signup`}
              className="btn-hover-lift inline-flex items-center gap-2 px-8 py-4 bg-gradient-vibrant text-white rounded-xl text-lg font-bold shadow-smooth-lg hover-glow"
            >
              {t('comparisonSection.ctaButton')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing - More Aggressive */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">
              {t('pricingSection.title')} <span className="gradient-text">{t('pricingSection.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('pricingSection.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {['professional', 'scale', 'enterprise'].map((plan, idx) => {
              const isFeatured = plan === 'professional';
              return (
                <div
                  key={plan}
                  className={`glass-strong rounded-2xl p-8 relative overflow-hidden ${
                    isFeatured
                      ? "ring-4 ring-primary shadow-smooth-xl scale-105"
                      : ""
                  }`}
                >
                  {isFeatured && (
                    <>
                      <div className="absolute inset-0 bg-gradient-vibrant opacity-5"></div>
                      <div className="text-center mb-4 relative">
                        <span className="inline-block px-4 py-2 bg-gradient-vibrant text-white text-sm font-bold rounded-full">
                          {t(`pricingSection.plans.${plan}.badge`)}
                        </span>
                      </div>
                    </>
                  )}
                  <h3 className="text-3xl font-black mb-2 relative">{t(`pricingSection.plans.${plan}.name`)}</h3>
                  <div className="mb-6 relative">
                    <span className="text-5xl font-black">${t(`pricingSection.plans.${plan}.price`)}</span>
                    <span className="text-muted-foreground text-xl">{t(`pricingSection.plans.${plan}.period`)}</span>
                  </div>
                  <div className="mb-6 text-sm text-muted-foreground relative">
                    {t(`pricingSection.plans.${plan}.comparison`)}
                  </div>
                  <ul className="space-y-4 mb-8 relative">
                    {(t.raw(`pricingSection.plans.${plan}.features`) as string[]).map((feature: string) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/${locale}/auth/signup`}
                    className={`btn-hover-lift block text-center py-4 rounded-xl font-bold relative ${
                      isFeatured
                        ? "bg-gradient-vibrant text-white shadow-smooth hover-glow"
                        : "glass-strong border-2 border-border"
                    }`}
                  >
                    {t(`pricingSection.plans.${plan}.cta`)}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Migration Made Easy */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="glass-strong rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-vibrant opacity-5"></div>
            <h2 className="text-5xl font-black mb-4 relative">
              {t('migrationSection.title')} <span className="gradient-text">{t('migrationSection.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 relative">
              {t('migrationSection.description')}
              <br />
              <strong className="text-foreground">{t('migrationSection.descriptionBold')}</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
              <Link
                href={`/${locale}/auth/signup`}
                className="btn-hover-lift inline-flex items-center gap-2 px-8 py-4 bg-gradient-vibrant text-white rounded-xl text-lg font-bold shadow-smooth-lg hover-glow"
              >
                {t('migrationSection.ctaPrimary')}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="px-8 py-4 glass-strong rounded-xl text-lg font-semibold hover:shadow-smooth-lg transition-all"
              >
                {t('migrationSection.ctaSecondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Logo iconSize={32} showText={true} />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-6">
              <Link href={`/${locale}/privacy`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('footer.links.privacy')}
              </Link>
              <Link href={`/${locale}/terms`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('footer.links.terms')}
              </Link>
              <Link href={`/${locale}/contact`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('footer.links.contact')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
