# 0017. Our own primitives instead of shadcn on Base UI

**Status:** accepted

## Context

A small, consistent set of controls with the brand's states, radii and 44 px targets, usable in server and client components, with Storybook and an accessibility check.

## Alternatives considered

- shadcn/ui generated on Base UI.

## Decision

`Button`, `Field`, `Badge`, `Card`, `Sheet` and `Tabs` are written directly with `cva` and Tailwind tokens, following the accessible patterns (roles, focus return, arrow keys that follow the reading direction). ESLint forbids physical directions, palette colors and one-off spacing.

## Consequences

No generated code to adopt or upgrade, and every behaviour is covered by a story and a test. A headless library would be the move if we needed complex widgets such as comboboxes or date pickers.
