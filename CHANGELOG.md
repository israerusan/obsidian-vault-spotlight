# Changelog

All notable changes to Vault Spotlight are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## [2.9.0] - 2026-07-04

A premium-feel polish pass plus a batch of correctness fixes surfaced by a
multi-agent review of the whole plugin.

### Performance
- Content search over vaults with Canvas or Bases files is smooth while typing
  again: each `.canvas`/`.base` file is now parsed once and cached (keyed by
  modified time) instead of being re-parsed on every keystroke.
- Heading search bounds its working set on very large, heading-dense vaults the
  same way content search already does, so a broad query stays responsive.

### Fixed
- The keyboard-shortcut hints in the footer now update immediately after a search
  or a mode switch, instead of continuing to advertise the previously-selected
  item's keys (some of which did nothing) until the first arrow press.
- The Pro preview pane no longer keeps showing the previous note when you switch
  into a mode with no results (e.g. Editors with no open tabs); it clears to
  "Nothing selected" to match the list.
- The Pro preview pane no longer flashes an empty body while arrowing between
  results — the previous note stays visible until the next one has rendered.
- Inline conversions of negative quantities now work (e.g. `-40 c to f`).
- A zero-padded year below 100 in a date jump (e.g. `0050-01-01`) is no longer
  silently shifted into the 1900s.
- Search-result highlights stay correctly aligned for notes containing characters
  whose lowercase form changes length (e.g. the Turkish dotted "İ").
- Two search profiles or workflow presets whose names produce the same id no
  longer share it — so removing or pinning one can't affect the other. Saving a
  workflow whose name collides with an existing one now gets a distinct id.
- Content-search results are now identical whether or not the off-thread index is
  available, via a deterministic tie-break when scores are equal.
- Home / End / Page Up / Page Down and Ctrl+N / Ctrl+P now defer to an active IME
  composition, matching the arrow keys, so composing text is never interrupted.
- The "Search aliases" setting is now shown locked (with an upgrade link) on the
  free tier instead of as an editable field whose contents were ignored.
- A mode-trigger prefix that collides with another trigger now snaps the field
  back to the value that actually took effect and explains why, instead of leaving
  a stale character on screen.
- Vault event listeners can no longer leak if the plugin is disabled during
  Obsidian's initial startup.

### Changed
- The launcher now has a subtle, deliberate entrance (a brief scale + fade), a
  reserved scrollbar gutter so rows don't shift when the list becomes scrollable,
  breathing room around the keyboard-selected row at the scroll edges, and an
  eased mode badge. All motion is disabled under "reduce motion".

## [2.8.1] - 2026-07-04

### Fixed
- Robustness hardening pass:
  - A ripgrep search for a very common word on a large vault no longer silently
    falls back to a slower full-vault scan on every keystroke; the partial
    ripgrep output is used instead, and a larger output buffer makes the overflow
    rarer.
  - If the ripgrep binary is moved or uninstalled while Obsidian is open, the
    plugin now re-discovers it on the next search instead of falling back forever.
  - Opening a content/heading/symbol hit whose file was shortened after indexing
    can no longer place the cursor past the end of the file.
  - Confirming a result whose tab was closed in the background (e.g. by sync) no
    longer fails silently — you get a clear notice instead of an unhandled error.
  - Typing a phrase like "next constructor" no longer produces an invalid date.
  - A corrupt or hand-edited `data.json` (malformed ranking data, unexpected
    types) can no longer crash the plugin on file open or during load.

## [2.8.0] - 2026-07-04

### Performance
- The launcher opens noticeably faster on large vaults: per-file tag/alias/time
  metadata is now built only for the results actually shown, instead of for every
  scored file before trimming to the visible list.
- Smoother keyboard navigation: arrowing through a long result list now restyles
  only the two rows that change (and rebuilds the footer only when the selected
  item's type changes) instead of re-touching every row on each keypress.
- Row hover/click/star/menu handlers are attached once to the list rather than
  re-bound to every row on each keystroke, cutting per-keystroke work.

### Added / Changed
- Content search now highlights the matched terms inside each snippet, so the
  hit reads the same way it already does in filenames and the preview pane.
- The Pro preview pane's empty and error states are now a proper icon + title +
  guidance card (matching the results list) instead of a single faint line.
- Badges, pills, and glyphs that render the accent colour on an accent tint now
  stay legible under pale accent themes (mint, yellow, pale blue).
- A more refined feel: a theme-aware modal shadow that reads on dark backgrounds,
  the selection bar glides with the cursor instead of popping, and the search
  glyph lifts to the accent when the field is focused. Spacing, type, and radius
  now come from one documented token scale.

### Fixed
- Opening a content/heading/symbol result from the right-click menu now scrolls
  the note to the matched line, matching Enter's behaviour.
- Batch star/unstar now reports the number of files it actually changed.
- The action palette can no longer leave the loading skeleton on screen if it
  fails to build.

## [2.7.2] - 2026-07-04

### Changed
- The result and preview panes now use a slim, hover-revealed scrollbar in place
  of the platform default.

### Fixed
- Reaching the top or bottom of the result list or preview no longer scrolls the
  vault behind the modal (scroll is now contained to the pane).

## [2.7.1] - 2026-07-04

### Fixed
- Saving a workflow or profile with `Cmd/Ctrl+S` no longer records it as the
  `files` mode regardless of the mode you were in — the live mode and query are
  now captured correctly.
- Content-search exclude folders are matched case-insensitively by ripgrep too,
  so results no longer differ from the built-in index depending on whether
  ripgrep is installed.
- Files with a future-dated modification time (clock skew or imports) can no
  longer inflate their ranking and pin themselves to the top of results.
- IME composition (e.g. CJK input) is no longer hijacked by result-list
  navigation and activation keys (Arrow/Enter/Tab/Escape).
- Per-file usage data (frecency) can no longer leak between a disable and
  re-enable within the same session.

### Changed
- Internal robustness: contain a failing result action instead of leaving an
  unhandled rejection, kill any in-flight ripgrep process on unload/command
  change, coalesce concurrent ripgrep availability probes, and give id-less
  imported profiles unique ids.

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

[2.6.4]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.4
[2.6.3]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.3
[2.6.2]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.2
[2.6.1]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.1
[2.6.0]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.6.0
[2.5.1]: https://github.com/israerusan/obsidian-vault-spotlight/releases/tag/2.5.1
