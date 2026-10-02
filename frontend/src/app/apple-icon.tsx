import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen / bookmark icon: the `|>` mark from app/icon.svg on a full-bleed navy square (iOS applies its own corner mask). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#16213A" }}>
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none">
          <rect x="7.5" y="8.5" width="4.2" height="15" rx="2.1" fill="#FFFFFF" />
          <path d="M15.7 9.3 22.5 16l-6.8 6.7" stroke="#F2600D" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
