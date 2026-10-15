# 0012. Bilingual content is JSON on the row

**Status:** accepted

## Context

Product names, descriptions, categories and shipping zones must exist in Arabic and English.

## Alternatives considered

- A translation table per entity.

## Decision

A `{ en, ar }` JSON value per text, validated with Zod, edited through language tabs in the dashboard, plus a combined lower-cased `searchText` column for search.

## Consequences

The languages are fixed at two, so this is simpler to query and edit. A third language is the point to introduce `ProductTranslation`.
