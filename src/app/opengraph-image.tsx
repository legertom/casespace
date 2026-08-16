import { ImageResponse } from "next/og";

/**
 * The card behind every link unfurl (Slack, iMessage, social). Applies to
 * all routes from the root segment, /signin included — which matters, since
 * anonymous fetches of any page land there. Colors mirror globals.css.
 */
export const alt =
  "Casespace — Clever's AI use-case casebook and program scoreboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#faf8f3";
const INK = "#22201c";
const INK_MUTED = "#5c564c";
const ACCENT = "#9a4520";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          backgroundColor: PAPER,
          color: INK,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
          Casespace
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 38,
            lineHeight: 1.35,
            color: INK_MUTED,
            maxWidth: 900,
          }}
        >
          Clever&rsquo;s casebook of AI use cases — and the live scoreboard
          for the H2 2026 AI Enablement program.
        </div>
        <div
          style={{
            marginTop: 56,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 30,
            color: ACCENT,
          }}
        >
          <div style={{ display: "flex" }}>45 documented workflows</div>
          <div style={{ display: "flex", color: INK_MUTED }}>·</div>
          <div style={{ display: "flex" }}>15 with confirmed positive ROI</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
