import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: the brand mark's three ascending bars, matching components/brand/brand-mark.tsx. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "hsl(21, 90%, 45%)",
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="13" width="5" height="8" rx="1.6" fill="white" />
          <rect x="9" y="8" width="5" height="13" rx="1.6" fill="white" />
          <rect x="16" y="3" width="5" height="18" rx="1.6" fill="white" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
