---
name: Ember Roastery
colors:
  surface: "#fff8f6"
  surface-dim: "#e8d6cf"
  surface-bright: "#fff8f6"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#fff1eb"
  surface-container: "#fdeae3"
  surface-container-high: "#f7e4dd"
  surface-container-highest: "#f1dfd8"
  on-surface: "#231a15"
  on-surface-variant: "#59413a"
  inverse-surface: "#392e2a"
  inverse-on-surface: "#ffede6"
  outline: "#8d7168"
  outline-variant: "#e1bfb5"
  surface-tint: "#ac3400"
  primary: "#9b2f00"
  on-primary: "#ffffff"
  primary-container: "#c2410c"
  on-primary-container: "#ffece7"
  inverse-primary: "#ffb59d"
  secondary: "#7d562d"
  on-secondary: "#ffffff"
  secondary-container: "#ffca98"
  on-secondary-container: "#7a532a"
  tertiary: "#0051af"
  on-tertiary: "#ffffff"
  tertiary-container: "#0069de"
  on-tertiary-container: "#ecf0ff"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#ffdbd0"
  primary-fixed-dim: "#ffb59d"
  on-primary-fixed: "#390c00"
  on-primary-fixed-variant: "#832600"
  secondary-fixed: "#ffdcbd"
  secondary-fixed-dim: "#f0bd8b"
  on-secondary-fixed: "#2c1600"
  on-secondary-fixed-variant: "#623f18"
  tertiary-fixed: "#d8e2ff"
  tertiary-fixed-dim: "#adc6ff"
  on-tertiary-fixed: "#001a41"
  on-tertiary-fixed-variant: "#004494"
  background: "#fff8f6"
  on-background: "#231a15"
  surface-variant: "#f1dfd8"
typography:
  display-hero:
    fontFamily: Bricolage Grotesque
    fontSize: 56px
    fontWeight: "700"
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 36px
    fontWeight: "700"
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 40px
    fontWeight: "600"
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: "600"
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Bricolage Grotesque
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: "400"
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 20px
    letterSpacing: 0.01em
  label-data-lg:
    fontFamily: IBM Plex Mono
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 24px
    letterSpacing: 0em
  label-data-md:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
    letterSpacing: 0.01em
  label-data-sm:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies the sensory craft of specialty coffee roasting through an editorial, warm-minimalist aesthetic. It serves both discerning retail customers seeking origin-specific coffee and roastery managers operating a high-density administrative back-office.

The interface prioritizes restraint, generous whitespace, deliberate structural alignment, and tangible warmth. Rejecting ephemeral trends—such as glowing gradients, saturated glassmorphism, floating drop shadows, and ornamental iconography—the system achieves depth and distinction through flat, tonal planes, tactile neutral contrasts, and millimeter-precise 1px boundaries. The resulting visual tone is grounded, architectural, and unhurried.

## Colors

The palette draws directly from the roasting lifecycle: unbleached paper filters, green bean moisture, caramelization, and terminal heat.

### Light Theme (Default)

- **Background**: `#FAF6F1` (Canvas foundational wash)
- **Cards & Surfaces**: `#FFFFFF` (Foreground panels and focus areas)
- **Secondary Surface**: `#F1E9DF` (Muted blocks, table headers, sidebar canvas)
- **Borders & Dividers**: `#E4D9CC` (1px structural rule lines)
- **Text (Primary)**: `#1F1612` (High-contrast deep roast tone)
- **Text (Muted)**: `#6B5E55` (Secondary metadata, captions, inactive hints)
- **Primary Action**: `#C2410C` (Warm ember terracotta; text on primary is strictly `#FFFFFF`)
- **Accent**: `#D4A373` (Golden caramel for secondary highlights and featured tags)

### Dark Theme

- **Background**: `#15100D` (Charred bean canvas)
- **Cards & Surfaces**: `#211915` (Elevated dark surfaces)
- **Secondary Surface**: `#2B211C` (Inset modules and header controls)
- **Borders & Dividers**: `#3A2E27` (Crisp separation lines)
- **Text (Primary)**: `#F3ECE4` (Parchment white)
- **Text (Muted)**: `#B8ABA0` (Warm medium grey)
- **Primary Action**: `#F07B4F` (High-visibility ember; text on primary is strictly `#1F1612`)
- **Accent**: `#D4A373` (Uniform caramel tone)

### Data Visualization

Strictly calibrated categorical chart palette for administrative dashboards:

- Roastery Primary: `#C2410C`
- Caramel Accent: `#D4A373`
- Green Bean Herbaceous: `#5B7F6A`
- Washed Processing Slate: `#4C6A92`
- Natural Ferment Plum: `#8C5A7A`

### Semantic Feedback Badges

All status pills use solid text on low-saturation tinted backings:

- **Success**: `#2F7D4F` text on `#E3F1E8` background
- **Warning**: `#9A6A12` text on `#FBF0D9` background
- **Error**: `#B42318` text on `#FBE4E2` background
- **Info**: `#2F6690` text on `#E2EDF6` background

## Typography

Typography establishes an intentional dichotomy between craft and roasting science:

- **Headings (Bricolage Grotesque)**: Used for brand storytelling, editorial titles, category hero banners, and dashboard module titles. Brings personality and human warmth without sacrificing legibility.
- **Body & UI (IBM Plex Sans)**: Used for all primary descriptions, buttons, tooltips, form labels, and interactive states. Clean, structural, and neutral.
- **Tabular & Operational Data (IBM Plex Mono)**: Deployed strictly for prices, order IDs, SKU tracking numbers, cupping scores, roast profile times, and currency displays.

### Currency Formatting Rules

All product pricing and financial records must be formatted using `IBM Plex Mono` with the strict structure `EGP 0.00` (e.g., `EGP 420.00`). The currency prefix `EGP` is separated by a non-breaking space and shares the weight and color of the numeral value.

## Layout & Spacing

The layout is built upon an architectural grid with deliberate, generous margins.

- **Desktop (1200px and above)**: A 12-column grid with a maximum content container width of 1440px. Gutters are fixed at `1.5rem` (`24px`), with outer margins set to `3rem` (`48px`). The admin console uses a persistent 260px left sidebar and a fluid workspace container.
- **Tablet (768px - 1199px)**: An 8-column layout with `1.5rem` gutters and `2rem` outer page margins. Dashboard navigation collapses into an off-canvas drawer.
- **Mobile (Up to 767px)**: A 4-column layout with `1rem` (`16px`) gutters and `1.25rem` (`20px`) outer canvas margins. Multi-column inventory grids collapse into a single vertical stream.

Whitespace is never filled purely for density. Sections breathe through predictable `space-xl` and `space-lg` rhythm boundaries.

## Elevation & Depth

This design system explicitly rejects drop shadows, diffusion blurs, and glassmorphic depth. Visual hierarchy is established entirely through **Tonal Layering** paired with **Low-Contrast Structural Outlines**:

- **Hierarchy by Plane**:
  1. Base canvas background (`#FAF6F1` in Light, `#15100D` in Dark).
  2. Secondary structural containers (`#F1E9DF` in Light, `#2B211C` in Dark) denote grouped regions, filter sidebars, and inactive segments.
  3. Active foreground surfaces and interactive cards (`#FFFFFF` in Light, `#211915` in Dark) sit visually crisp on top.
- **Border-Driven Separation**: Every card, input, table row, and modal is bounded by a crisp 1px solid border (`#E4D9CC` in Light, `#3A2E27` in Dark).
- **Interactive State Elevation**: Hovering an interactive surface never causes it to lift with shadows. Depth changes are indicated by a 1px border shift to the accent color (`#D4A373`) or a subtle background tone transition.

## Shapes

The geometry balances modern software utility with smooth craftsmanship:

- **Interactive Controls (Inputs, Buttons, Dropdowns)**: Fixed `12px` corner radius. This softens touch targets without appearing overly playful.
- **Cards, Drawers & Dashboard Modules**: Radii range from `16px` for small product cards and widgets up to `20px` for large checkout panels, primary metrics containers, and full-bleed image viewports.
- **Status Badges & Flavor Notes**: Small contextual pills use a full rounded-corner enclosure (`9999px` capsule radius).

## Components

### Buttons

- **Touch Target**: Minimum height of `44px` across all sizes (large actions scale to `48px` or `52px`). Horizontal padding is `space-lg` (`24px`).
- **Primary**: Background `#C2410C` (Dark: `#F07B4F`), border: none, text: `#FFFFFF` (Dark: `#1F1612`), font-weight: `600`, radius: `12px`.
- **Secondary (Outlined)**: Background transparent, border: 1px solid `#E4D9CC` (Dark: `#3A2E27`), text: `#1F1612` (Dark: `#F3ECE4`), radius: `12px`.
- **Tertiary (Ghost)**: Background transparent, border: none, text: `#6B5E55`, hover: background `#F1E9DF`.

### Input Fields & Controls

- **Height**: Minimum `44px` tall with horizontal padding `1rem`. Radius: `12px`.
- **Styling**: Solid card background (`#FFFFFF` in Light, `#211915` in Dark) with a 1px solid border (`#E4D9CC` in Light, `#3A2E27` in Dark).
- **Focus**: Border switches cleanly to `#C2410C` without outer glow or shadow rings.
- **Labels**: Rendered in `IBM Plex Sans` body-sm with medium weight, placed above the field.

### Checkboxes & Radios

- Size: `20px x 20px` with a 1px solid border matching layout tokens.
- Checkboxes feature a `4px` corner radius; radios are circular.
- Selected state fills with `#C2410C` featuring a pure white glyph check or inner dot.

### Cards

- Constructed with a `16px` to `20px` border radius, bounded by the uniform 1px solid border.
- Background uses pure surface color (`#FFFFFF` in Light, `#211915` in Dark).
- Internal content uses `space-lg` (`24px`) padding on desktop, scaling to `space-md` (`16px`) on mobile viewports.

### Chips & Flavor Profile Badges

- Compact pills using `label-data-sm` or `body-sm`.
- Radius is fully rounded (`9999px`).
- Background matches secondary surface (`#F1E9DF` in Light, `#2B211C` in Dark) with a 1px border in `#E4D9CC` (Light) or `#3A2E27` (Dark).

### Coffee-Specific Custom Components

- **Roast Level Meter**: A 5-segment stepped indicator bar with 1px spacing between segments, filled with `#C2410C` based on roast stage (Light to Dark).
- **Sensory Radar**: Crisp polygon chart displaying acid, sweetness, body, and balance, rendered using chart tokens `#C2410C` and `#D4A373`.
- **Admin Inventory Tables**: Clean rows separated exclusively by 1px horizontal dividers, using `IBM Plex Mono` for stock counts, batch IDs, and batch temperatures.
