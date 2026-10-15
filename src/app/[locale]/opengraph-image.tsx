import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = brand.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card: the brand's bean on espresso brown. Only the brand name is drawn, so no extra fonts are needed. */
export default function OpenGraphImage() {
  const { logo } = brand;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        background: logo.espresso,
        color: logo.crema,
      }}
    >
      <div
        style={{
          width: 220,
          height: 340,
          borderRadius: 170,
          background: logo.crema,
          transform: "rotate(28deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 26, height: 250, borderRadius: 13, background: logo.ember }} />
      </div>
      <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>{brand.name}</div>
    </div>,
    size,
  );
}
