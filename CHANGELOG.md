# Changelog

All notable changes to Vault Spotlight are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## [2.7.1] - 2026-07-04

### Fixed
- Empty states (Pro gate, symbols/editors/folders/links/snippets, and the
  search-failed message) no longer leave the search box's
  `aria-activedescendant` pointing at a removed row, and a mounted preview pane
  now clears alongside the list instead of showing a stale note beside
  "No matches".
- The snippet-removed toast's **Undo** is now a real button — keyboard-focusable
  and activatable with Enter/Space — instead of a mouse-only link.
- The "starter workflows in Browse" hint is no longer shown to Free users, who
  can't surface workflows in Browse.
- Long snippet previews now end with an ellipsis instead of a hard mid-word cut.

### Changed
- Design-system tidy-up: every font size in the launcher now references the
  shared type ramp (no ad-hoc pixel values), a checked-and-selected row keeps
  its accent selection wash, and an unused style rule was removed.

## [2.7.0] - 2026-07-04

### Changed
- Design pass across the launcher for a more polished, high-end feel: the
  keyboard selection now clearly dominates hover, result badges use a calmer,
  meaningful colour system, the loading skeleton mirrors real rows, and the
  empty state and Pro upsell were refreshed. Consistent radius/type scale and a
  single keycap style throughout.
- Settings tab reorganised with clear **License**, **General**, and feature
  sections, one consistent **Pro** badge on gated rows, and locked rows now show
  a lock and an upgrade link instead of an empty control.

### Added
- More keyboard navigation: **Home/End**, **PageUp/PageDown**, and
  **Ctrl+N / Ctrl+P** to move through results; selection now clamps at the ends
  instead of wrapping.
- A seeded query is selected on open, so the first keystroke replaces it.
- Reduced-motion and Windows High Contrast support, per-row screen-reader state,
  and result-count / "no results" announcements.

### Fixed
- Keyboard selection no longer jumps when the mouse rests over the list during
  scrolling, and a background re-index keeps your place instead of resetting to
  the top.
- A slow content search keeps the previous results visible (dimmed) instead of
  flashing to skeletons on every keystroke.
- The action palette is now contextual: calculator/date/capture/snippet rows get
  their own actions, and file-batch operations only appear when results contain
  files. The footer no longer advertises a menu shortcut on rows that have none.
- Batch export / MOC / append-links now report failures instead of failing
  silently, and a few open-file paths gained error handling.

## [2.6.4] - 2026-07-04

### Fixed
- Resolved 34 `@typescript-eslint/no-unsafe-*` findings from the Obsidian plugin
  review. These were type-resolution gaps in the build config rather than unsafe
  runtime code, so behavior is unchanged:
  - Bumped the TypeScript `lib` from ES2016 to ES2020, matching the stdlib APIs
    the code already uses (`Object.values`/`Object.entries`, `Promise.allSettled`,
    `Promise.prototype.finally`). These typed correctly locally only because
    `@types/node` backfilled them; the review environment did not.
  - Routed the `moment` call sites through a callable-typed alias so date
    formatting stays typed even under `esModuleInterop`, where Obsidian's
    `export =` re-export of moment otherwise loses its call signature.

## [2.6.3] - 2026-07-03

### Fixed
- Batch ops no longer risk mutating the wrong files: stale multi-select is pruned
  to the visible results on each search, and batch prompts show the affected count.
- Escape-char / mode-prefix collisions are reconciled live so a settings change
  can't silently disable a search mode.
- Date-jump and quick capture honor the Daily Notes / Periodic Notes template when
  creating a note instead of leaving it blank.
- Diacritic-folded fuzzy matches map highlight indices back to the original string,
  so NFD (macOS) filenames highlight the right characters.
- Pro custom-search commands are registered/revoked on runtime license changes.
- Cleared the drill-prefix timer on close so no search runs against a closed modal.
- WorkerIndex detects a silently-killed worker in ~3s (warm) instead of 15s.

### Changed
- Footer shortcut hints use the platform modifier (Cmd on macOS).
- Stable `aria-live` status node so result counts are announced.
- Use the Platform API instead of `navigator.*` for OS detection.
- Renamed the "Search commands" command to "Run action".

## [2.6.2] - 2026-07-03

### Changed
- Polished keyboard flow and preview.

## [2.6.1] - 2026-07-03

### Changed
- Polished modal UX and capture clarity.

## [2.6.0] - 2026-07-03

### Added
- Delight layer: inline calculator/converter, natural-language date jump, and
  quick capture (Free), plus Pro snippet insertion.

## [2.5.1] - 2026-07-03

### Fixed
- Search robustness, batch-op safety, and modal polish.

[2.7.1]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.7.1
[2.7.0]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.7.0
[2.6.4]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.4
[2.6.3]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.3
[2.6.2]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.2
[2.6.1]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.1
[2.6.0]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.0
[2.5.1]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.5.1
