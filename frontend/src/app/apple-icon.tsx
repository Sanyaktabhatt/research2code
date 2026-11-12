import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen / bookmark icon: the folded-page prompt mark from app/icon.svg on a full-bleed ink square (iOS applies its own corner mask). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111111" }}>
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none">
          <path d="M23 0V6A3 3 0 0 0 26 9H32Z" fill="#5A5A5A" />
          <path d="M8.5 12.5 13.5 17 8.5 21.5" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="16" y="19.6" width="8" height="2.8" rx="1.2" fill="#FFE14A" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
