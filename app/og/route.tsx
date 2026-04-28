import { ImageResponse } from "next/og";

export const runtime = "edge";

// OG image dinámica 1200x630 para compartir en redes sociales.
// Sirve como fallback hasta que tengas un diseño definitivo en /public/og-default.png.
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
        }}
      >
        <div
          style={{
            fontSize: 110,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          Unytea
        </div>
        <div style={{ fontSize: 48, marginTop: 12, opacity: 0.95 }}>
          Where Communities Unite
        </div>
        <div style={{ fontSize: 28, marginTop: 36, opacity: 0.85 }}>
          unytea.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
