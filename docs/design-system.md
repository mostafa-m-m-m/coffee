# Design system

Every screen is assembled from a small set of tokens, primitives and patterns, so nothing is styled twice and a change in one place reaches the whole product. Storybook shows all of it, in light and dark and in English and Arabic: `npm run storybook` (or `npm run build-storybook`).

## Layers

| Layer      | Where                                                                                      | What lives there                                                                                   | Rule                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Tokens     | `src/lib/brand.ts` → CSS variables, mapped to Tailwind in `src/app/globals.css` (`@theme`) | Colors, status colors, chart series, fonts, radii                                                  | The only place a color value is written. A unit test fails on a hex value anywhere else.     |
| Primitives | `src/components/ui`                                                                        | `Button`, `Input` / `Select` / `Textarea` / `Field`, `Badge`, `Card` / `Skeleton`, `Sheet`, `Tabs` | Know nothing about the store. One component with `cva` variants instead of many look-alikes. |
| Patterns   | `src/components/patterns`                                                                  | `KpiCard`, `EmptyState`, `PageHeader`, `Timeline`, `StatusBadge` / `PaymentBadge`                  | Built from primitives only.                                                                  |
| Features   | `src/components/store`, `src/components/admin`, page folders                               | Product card, filters, order table, customer panel...                                              | Hold the logic and the translated text.                                                      |
| Pages      | `src/app`                                                                                  | Routes                                                                                             | Compose features; no rules.                                                                  |

## Tokens

Colors are written once, as hex, in `src/lib/brand.ts`, and emitted to the page as **OKLCH** custom properties for the light and the dark theme. Names describe the job, not the color:

| Token (Tailwind class)                                                   | Job                                                                                                       |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `background`, `card` (`surface`), `surface-2`, `border`                  | Page, raised surface, secondary surface, hairlines                                                        |
| `foreground`, `muted` (`muted-foreground`)                               | Text and secondary text                                                                                   |
| `accent` (`primary`), `accent-fg` (`primary-foreground`), `accent-hover` | Brand action color and the text on it                                                                     |
| `success`, `warning`, `danger`, `info`                                   | Status colors for borders and icons                                                                       |
| `*-soft`                                                                 | The soft background for that status (a mix of the status color into the card, so it follows the theme)    |
| `*-ink`                                                                  | Text on a soft background: the status color pulled toward the foreground so it keeps 4.5:1 in both themes |
| `chart-1` ... `chart-5`                                                  | Chart series, in order                                                                                    |
| `hero`, `hero-fg`, `scrim`, `glow`                                       | Landing hero, modal backdrop, highlight                                                                   |

The light theme uses the darker ember (`#c2410c`, 5.2:1 with white) for buttons and links; the dark theme uses the true ember with espresso text (4.9:1). Both themes are the same names with different values, switched by the `dark` class (next-themes), defaulting to the visitor's system setting.

## Type, shape and motion

- **Fonts** (`next/font`): Bricolage Grotesque for English headings, IBM Plex Sans for English text, IBM Plex Sans Arabic for every Arabic text (bold for headings), IBM Plex Mono for numbers, prices and identifiers (Arabic digits fall back to Plex Arabic because Plex Mono has none).
- **Radius**: 12 px for buttons and inputs (`rounded-xl`), 16 px for cards and sheets (`rounded-2xl`), 8 px for small chips. Thin 1 px borders instead of heavy shadows.
- **Controls** are at least 44 px tall (`min-h-11`); icon buttons are 44 × 44 and need an `aria-label`.
- **Focus** is always visible (a 2 px accent outline); disabled and busy states are built into `Button`.
- Motion is limited to small transitions, and respects `prefers-reduced-motion`.

## Rules the linter enforces

`eslint.config.mjs` reads the class names written in `src/` and fails on:

- physical directions: `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l`, `rounded-r`... Use `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, `border-s`, `rounded-e`, so the layout mirrors in Arabic by itself;
- Tailwind palette colors (`bg-red-500`, `text-amber-700`) and color values in a class (`bg-[#c2410c]`): use a token;
- one-off spacing such as `p-[13px]`: use the scale.

## Accessibility

- A control always has a text label (or an `aria-label` for icon-only buttons); a field is tied to its label and its error with `htmlFor` / `role="alert"`.
- Color is never the only signal: statuses carry an icon and text, trends an arrow and a screen-reader word.
- Every story is scanned by axe in both themes and both languages (`npm run test:stories`), and every screen of the application is scanned the same way by `tests/e2e/screens.spec.ts`. Lighthouse accessibility is measured with `npm run lighthouse`.

## Adding a component

1. Decide whether it is a primitive (no store knowledge), a pattern (made of primitives) or a feature part.
2. Build variants with `cva` and join classes with `cn()`; use only tokens.
3. Write a story that shows every state (default, hover or focus, disabled, loading, error, empty) and check it in the toolbar's dark and Arabic modes.
4. Run `npm run test:stories` and `npm run lint`.
