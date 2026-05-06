import { ImageResponse } from "next/og";

export const runtime = "edge";

const SITE_URL = "https://www.unytea.com";

/**
 * Open Graph image (1200x630) used as the share preview on every social
 * platform that reads og:image (Twitter, WhatsApp, LinkedIn, Slack, iMessage,
 * Discord, etc.). Generated dynamically at the edge so we don't have to ship
 * a static PNG.
 *
 * The logo is read from /public/unytea-logo.png via an absolute URL so the
 * edge runtime's fetcher can pull it. ImageResponse needs a fully qualified
 * URL — relative paths don't work here.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f59e0b 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 80,
        }}
      >
        {/* Logo — sits above the wordmark */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${SITE_URL}/unytea-logo.png`}
          alt="Unytea"
          width={140}
          height={140}
          style={{
            borderRadius: 24,
            marginBottom: 32,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        />

        <div
          style={{
            fontSize: 110,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          Unytea
        </div>
        <div
          style={{
            fontSize: 44,
            marginTop: 18,
            opacity: 0.95,
            textAlign: "center",
          }}
        >
          Where Communities Unite
        </div>
        <div
          style={{
            fontSize: 26,
            marginTop: 40,
            opacity: 0.85,
            letterSpacing: "0.05em",
          }}
        >
          unytea.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
