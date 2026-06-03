import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

// Enabled only with ANALYZE=true (e.g. `npm run analyze`); never in CI/prod builds.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  env: {
    NEXT_PUBLIC_EXCALIDRAW_ASSET_PATH: "/",
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "framer-motion",
      "@livekit/components-react",
    ],
  },

  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  async headers() {
    // Current enforced CSP — intentionally laxa (wildcards in img/media/font/connect,
    // 'unsafe-eval' for legacy compatibility). Tightening is rolled out via the
    // Report-Only header below; once that monitoring period is clean (Phase 4c),
    // this enforced CSP will be replaced with the tightened version.
    const currentCsp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app https://*.livekit.cloud https://*.livekit.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data: https:",
      "frame-src 'self' https://vercel.live",
      // Allow all connections for WebRTC/LiveKit - simplified
      "connect-src 'self' https: ws: wss: https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
      // Phase 4c-pre: capture real-user violations against the enforced CSP.
      // Persisted to the csp_violations table by app/api/csp-report.
      "report-uri /api/csp-report",
    ].join("; ");

    // Phase 4b — Report-Only CSP with tightened directives.
    // - 'unsafe-eval' → 'wasm-unsafe-eval' (Excalidraw WASM only)
    // - https: wildcards in img/media/font/connect → explicit allowlists
    // - Orphans removed: img.clerk.com (legacy Clerk auth), cdn.discordapp.com (no Discord OAuth)
    // - 'unsafe-inline' kept in script-src (deferred to Phase 4d via nonces) and
    //   style-src (Tailwind JIT requires it).
    // Browser reports violations to console without blocking; promote to enforced
    // CSP in Phase 4c after monitoring period (3-7 days) shows no relevant violations.
    const reportOnlyCsp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline' https://js.stripe.com https://vercel.live https://*.vercel.app https://*.livekit.cloud https://*.livekit.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://utfs.io https://*.uploadthing.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://images.unsplash.com",
      "media-src 'self' blob: https://utfs.io https://*.livekit.cloud",
      "font-src 'self' data:",
      "frame-src 'self' https://js.stripe.com https://vercel.live",
      "connect-src 'self' https://api.stripe.com https://*.uploadthing.com https://utfs.io https://*.livekit.cloud wss://*.livekit.cloud https://*.pusher.com wss://*.pusher.com wss://ws-*.pusher.com wss://sockjs-*.pusher.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
      // Phase 4c-pre: capture real-user violations against the tightened CSP.
      // Persisted to the csp_violations table by app/api/csp-report.
      "report-uri /api/csp-report",
    ].join("; ");

    return [
      {
        // Service worker must not be cached by CDN
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:all*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=*, microphone=*, autoplay=*",
          },
          {
            key: "Content-Security-Policy",
            value: currentCsp,
          },
          {
            // Phase 4b: parallel Report-Only header. Browser reports violations
            // to console (and to report-uri if added later) without blocking.
            // Monitor for ~3-7 days, then promote to enforced CSP in Phase 4c.
            key: "Content-Security-Policy-Report-Only",
            value: reportOnlyCsp,
          },
          // Note on Vary: Accept-Encoding — we tried setting it here but
          // Next.js' framework overwrites the Vary header with its own
          // RSC-routing values after `headers()` runs. The fix lives in
          // middleware.ts, which appends Accept-Encoding to whatever Vary
          // the framework already set.
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(
  withNextIntl(
    withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: "carlos-alfaro-mk",

      project: "unytea",

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      // tunnelRoute: "/monitoring",

      webpack: {
        // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
        // See the following for more information:
        // https://docs.sentry.io/product/crons/
        // https://vercel.com/docs/cron-jobs
        automaticVercelMonitors: true,

        // Tree-shaking options for reducing bundle size
        treeshake: {
          // Automatically tree-shake Sentry logger statements to reduce bundle size
          removeDebugLogging: true,
        },
      },
    })
  )
);
