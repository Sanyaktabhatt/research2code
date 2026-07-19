import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen / bookmark icon: same brand mark as icon.tsx, scaled up. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(322, 81%, 60%) 52%, hsl(189, 94%, 50%) 100%)",
        }}
      >
        <svg width="108" height="108" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="13" width="5" height="8" rx="1.6" fill="white" />
          <rect x="9" y="8" width="5" height="13" rx="1.6" fill="white" />
          <rect x="16" y="3" width="5" height="18" rx="1.6" fill="white" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
