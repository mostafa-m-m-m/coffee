import React from "react";

// Bricolage Grotesque is the wordmark's typeface (loaded in the root layout).
// Colors come from the --logo-* variables generated from src/lib/brand.ts. The light-mode "ROASTERY"
// tagline (taupe) is a hair darker than the artwork in public/logo-*.svg, because 9px text must
// reach 4.5:1 on white and crema.
const BRAND_FONT = "var(--font-brand), var(--font-plex-sans), system-ui, sans-serif";

interface LogoProps {
  variant?: "horizontal" | "stacked" | "mark";
  mode?: "auto" | "light" | "dark";
  className?: string;
}

export function Logo({ variant = "horizontal", mode = "auto", className = "" }: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 80 80"
        className={`h-9 w-9 shrink-0 ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Ember Roastery Mark"
      >
        <g transform="translate(40, 40) rotate(28)">
          <ellipse
            cx="0"
            cy="0"
            rx="20"
            ry="33"
            className={
              mode === "dark"
                ? "fill-(--logo-crema)"
                : mode === "light"
                  ? "fill-(--logo-espresso)"
                  : "fill-(--logo-espresso) dark:fill-(--logo-crema) transition-colors"
            }
          />
          <path
            d="M 0 -27 C 10 -13 -10 13 0 27"
            className="stroke-(--logo-ember)"
            strokeWidth="5.2"
            strokeLinecap="round"
          />
          <path
            d="M 0 -19 C 7 -9 -7 9 0 19"
            className="stroke-(--logo-glow)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  }

  if (variant === "stacked") {
    return (
      <svg
        viewBox="0 0 200 170"
        className={`h-auto w-36 ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Ember Roastery Logo"
      >
        <g transform="translate(100, 52) rotate(28)">
          <ellipse
            cx="0"
            cy="0"
            rx="22"
            ry="36"
            className={
              mode === "dark"
                ? "fill-(--logo-crema)"
                : mode === "light"
                  ? "fill-(--logo-espresso)"
                  : "fill-(--logo-espresso) dark:fill-(--logo-crema) transition-colors"
            }
          />
          <path
            d="M 0 -30 C 11 -15 -11 15 0 30"
            className="stroke-(--logo-ember)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M 0 -21 C 8 -11 -8 11 0 21"
            className="stroke-(--logo-glow)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(100, 114)">
          <text
            x="0"
            y="24"
            textAnchor="middle"
            style={{ fontFamily: BRAND_FONT }}
            fontWeight="900"
            fontSize="38"
            letterSpacing="-0.04em"
            className={
              mode === "dark"
                ? "fill-(--logo-crema)"
                : mode === "light"
                  ? "fill-(--logo-espresso)"
                  : "fill-(--logo-espresso) dark:fill-(--logo-crema) transition-colors"
            }
          >
            ember
          </text>
          <text
            x="0"
            y="44"
            textAnchor="middle"
            style={{ fontFamily: BRAND_FONT }}
            fontWeight="700"
            fontSize="9.5"
            letterSpacing="0.45em"
            className={
              mode === "dark"
                ? "fill-(--logo-ember)"
                : mode === "light"
                  ? "fill-(--logo-taupe)"
                  : "fill-(--logo-taupe) dark:fill-(--logo-ember) transition-colors"
            }
          >
            ROASTERY
          </text>
        </g>
      </svg>
    );
  }

  // Horizontal variant (default)
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Coffee Bean Mark */}
      <svg
        viewBox="0 0 80 80"
        className="h-8 w-8 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g transform="translate(40, 40) rotate(28)">
          <ellipse
            cx="0"
            cy="0"
            rx="20"
            ry="33"
            className={
              mode === "dark"
                ? "fill-(--logo-crema)"
                : mode === "light"
                  ? "fill-(--logo-espresso)"
                  : "fill-(--logo-espresso) dark:fill-(--logo-crema) transition-colors"
            }
          />
          <path
            d="M 0 -27 C 10 -13 -10 13 0 27"
            className="stroke-(--logo-ember)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 0 -19 C 7 -9 -7 9 0 19"
            className="stroke-(--logo-glow)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Typography */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-black tracking-[-0.04em] text-xl ${
            mode === "dark"
              ? "text-(--logo-crema)"
              : mode === "light"
                ? "text-(--logo-espresso)"
                : "text-(--logo-espresso) dark:text-(--logo-crema)"
          }`}
          style={{ fontFamily: BRAND_FONT }}
        >
          ember
        </span>
        <span
          className={`font-bold tracking-[0.38em] text-[9px] mt-0.5 ${
            mode === "dark"
              ? "text-(--logo-ember)"
              : mode === "light"
                ? "text-(--logo-taupe)"
                : "text-(--logo-taupe) dark:text-(--logo-ember)"
          }`}
          style={{ fontFamily: BRAND_FONT }}
        >
          ROASTERY
        </span>
      </div>
    </div>
  );
}
