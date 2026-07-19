# Changelog

All notable changes to Vault Spotlight are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## [2.15.0] - 2026-07-19

### Added

- **Home quick actions.** Opening the launcher on an empty query now leads with a
  *Quick actions* row — **Quick capture** (drops you into capture mode to jot a line
  into your daily note or inbox) and **Today's daily note** (opens or creates it) —
  so Spotlight offers something to *do* the moment it opens, not just a list to scroll.
  Capture sits first so a reflexive `↵` on an empty launcher does nothing destructive.
  Toggle it under Settings → *Home quick actions*; the daily-note action follows your
  existing date-jump setting.

## [2.14.0] - 2026-07-18

### Added

- **In-modal keyboard-shortcut overlay.** Press `Cmd/Ctrl+/` (or the new keyboard
  button in the header) to open a full cheatsheet of every shortcut and mode trigger.
  It builds the trigger list from your *live, configured* prefixes, so the whole
  vocabulary stays one keystroke away instead of disappearing from the header hints
  after the first few opens. The overlay also carries a real "Hide inline hints"
  control — finally making the first-run hints genuinely dismissible.

### Changed

- **The search field prompt now tracks the active mode** — Capture mode says "Capture
  to your daily note…", Commands says "Search commands…", and so on, instead of always
  advertising "Search notes, tags, or properties…".
- **Result rows scan more cleanly.** Long badges ellipsise themselves instead of
  squeezing the note title; multi-word state labels ("Recent search", "Create daily
  note") are sentence-case rather than cramped uppercase; content-search rows show the
  parent folder instead of a full path that just restated the title.
- **Clearer selection.** The keyboard-selected row is never out-shouted by a checked
  (multi-select) row, and its icon keeps proper contrast on pale accent colours.
- **A "Create <name>" row is now offered on filtered dead-ends** (e.g. `roadmap
  #project` with no match), not only on plain-text misses.

### Fixed

- The un-starred control now shows a hollow star (a click-to-favourite affordance)
  instead of the slashed "star-off" icon that read as "starring disabled".
- File and heading results now have a stable, deterministic order when scores tie, so
  repeating a similar search no longer reshuffles rows.
- A passive metadata re-index can no longer steal a racing keystroke's selection reset.
- Removed a stray `console` warning emitted on a normal free-tier API call.
- Preview copy button now has a visible keyboard focus ring.

### Performance

- Faster fuzzy matching: the common ASCII case skips the per-character index-map
  allocation on every keystroke (with the full, correct mapping still used for
  accented / non-ASCII text so highlights stay aligned).

## [2.13.0] - 2026-07-14

### Added

- **Live preview: clickable links and a copy menu.** In the Pro preview pane you can
  now act on a result without opening the note first. Links in the previewed body are
  clickable — internal `[[links]]` jump to the target (Cmd/Ctrl-click opens it in a new
  pane), external URLs open in the browser. A copy button in the preview header offers
  "Copy contents", "Copy link to note" (honoring your wikilink/markdown link setting),
  and "Copy path".

## [2.12.1] - 2026-07-13

### Security

- **A working Pro license key was committed to this public repository.**
  `tests/fixtures/test-license.key` held a real, production-signed `vault-spotlight`
  license that verified against the public key shipped in every release. Anyone who
  opened that file on GitHub could paste the string into the plugin and unlock Pro for
  free, permanently. It was found by a security review of a sibling project that had
  inherited the same test-fixture pattern.

  The leaked key is now **revoked by value** (`src/core/revokedLicenses.mjs`), and the
  fixture has been re-minted under a product id the plugin never requests, so it is inert
  twice over.

  **The signing keypair was deliberately NOT rotated.** Rotating it would have revoked Pro
  for every paying customer, since their keys are signed by that same private key. If you
  bought Vault Spotlight Pro, your key is unaffected and needs no action. The only key that
  stops working is the one that was published in this repository.

## [2.12.0] - 2026-07-05

Boolean `OR` search, one unified saved-object model, a smaller bundle, and a
large internal refactor of the modal — all behind a green test gate.

### Changed
- **One saved object.** Workflows, Search profiles, and Custom searches are
  consolidated into a single **Saved workflows** list. Your existing entries are
  migrated automatically on first load (nothing is lost; command hotkeys on
  migrated custom searches keep working), and Settings now shows one list instead
  of three. A profile's file-type/exclude/preview context survives as optional
  per-workflow *scope*. `schemaVersion` is now a real migration marker rather than
  unused groundwork.

### Fixed
- **Ranking controls & match-reason badges are now correctly labeled Free.** They
  have always shipped free (the settings section is ungated and the modal applies
  ranking + match reasons on any tier), but the README table and the Search
  section called them Pro. The docs now match the code.

### Added
- **Boolean `OR` in advanced queries** — `foo OR bar`, `tag:a OR tag:b`,
  `"launch plan" OR kickoff` return the union of either alternative. `OR` must be
  uppercase and unquoted (a lowercase `or` or a quoted `"OR"` stays a literal
  term), and it is honored consistently across the file, content, ripgrep, worker,
  canvas, and base engines. Queries without `OR` behave exactly as before.

### Internal
- **`SpotlightModal` was split into a dumb view plus `SearchController` (query
  execution + result set) and `ModeController` (mode state + activations)**, with
  view-tier DOM helpers. The modal dropped from ~1940 to under 600 lines with no
  behavior change, guarded by the modal harness and five new end-to-end journeys.
- **Added five end-to-end journey tests** (`tests/journeys.test.mjs`) driving the
  real modal through complete flows — save-and-rerun a workflow, the free cap +
  upgrade path, the `Cmd/Ctrl+K` action palette, copy-to-clipboard, and an OR
  content search — instead of more parser unit tests.
- **Feature gating now has one source of truth** (`src/core/featureGates.mjs`).
  The Pro-only mode set, the free workflow cap, and the "what Pro unlocks" copy
  used by the settings blurb and the modal CTA all derive from it, replacing three
  hand-maintained definitions that had drifted apart.
- **Production bundle is now minified** (`main.js` ~339 KB → ~186 KB, ~45%
  smaller). Dev/watch builds stay unminified for debugging. Lazy-loading the
  content/ripgrep path was evaluated and rejected: an Obsidian plugin ships a
  single `main.js`, so code-splitting can't reduce what's on disk, and the heavy
  content work (worker + ripgrep) is already deferred to first use.

## [2.11.4] - 2026-07-05

Make the local gate mirror Obsidian's automated review, so a review failure can't
reach the reviewer (a failed review delists the plugin).

### Internal
- **`npm run lint` now runs `eslint-plugin-obsidianmd` — the exact ruleset
  Obsidian's automated community-plugin review uses** — as a hard gate
  (`eslint . --max-warnings 0`). This catches the review bot's checks locally
  (static-style assignment, problematic settings headings, forbidden HTML
  elements, command naming, etc.) before a release instead of after. Our own
  type-aware rules stay layered on top of the plugin source.
- Added a **manifest-contract test** that locks the manifest checks eslint can't
  lint on the JSON file: the description/name/id must not contain "Obsidian" or
  "plugin", the version must match `package.json`, and it must have a
  `versions.json` entry.

## [2.11.3] - 2026-07-05

Follow-ups from a review of 2.11.2.

### Fixed
- The Pro **preview pane's modal width is now themeable too**: it uses a new
  `--vs-modal-preview-width` variable instead of a hardcoded width, so a theme's
  `--vs-modal-*` overrides apply in preview mode as advertised (previously only
  normal mode honored the variable).

### Internal
- The release workflow now installs **ripgrep**, so the ripgrep search assertions
  run in the tag-time gate (matching PR CI) instead of being skipped.
- Added a **styles-contract test** that locks the modal sizing/scaling invariants
  (themeable size variables, no literal-px font sizes, viewport-safe height/width) so
  a regression the harness can't screenshot still fails CI.

## [2.11.2] - 2026-07-05

Readable, resizable modal on large / high-DPI displays (thanks @OlivierPS, #3).

### Changed
- **The modal's text now scales with your Obsidian "Interface font size."** The type
  ramp is based on Obsidian's `--font-ui-*` variables instead of fixed pixels, so the
  launcher grows with the rest of the app rather than staying tiny on a 14" MacBook /
  Retina display. Fixed-px fallbacks preserve the previous look if a theme drops the
  base variables.
- **Larger, steadier modal.** It's wider on big screens (`clamp(680px, 56vw, 1040px)`)
  and can grow taller (up to `min(80dvh, 760px)`), with a comfortable min-height so it
  no longer resizes jarringly as the result count changes while typing. All three are
  exposed as `--vs-modal-width` / `--vs-modal-min-height` / `--vs-modal-max-height`
  variables, so a theme or CSS snippet can retune the size directly.
- Every remaining hardcoded font size (modal keycaps, the settings Pro pill and a few
  settings rows) now scales with the interface font too.

### Fixed
- A few settings-tab labels referenced the modal-scoped type ramp out of context, so
  their intended font size was silently dropped; they now size correctly.

## [2.11.1] - 2026-07-05

Obsidian community-review compliance fixes.

### Fixed
- Removed the redundant word "Obsidian" from the plugin description (it's implied by
  the plugin directory).
- Renamed the settings "General" section to "Display" (community guidelines advise
  against a generic "General" heading).
- The Undo link in the snippet-removed notice now gets its pointer cursor from a CSS
  class instead of an inline style.
- The input handler tracks IME composition via `compositionstart`/`compositionend`
  events instead of an unnecessary `InputEvent` type assertion.

## [2.11.0] - 2026-07-05

Phase 2 — a product-consolidation pass: present Vault Spotlight as one command
center (**Search / Workflows / Actions**) with Workflows as the center of gravity,
plus a maintainability refactor of the modal. No changes to search results.

### Changed
- **Reframed around three pillars.** The README and store description now lead with
  Search / Workflows / Actions; quick actions (calculator, date jump, capture,
  snippets) and advanced capabilities (profiles, aliases, integrations, API) sit
  below the fold. The pitch reads as one product, not a feature catalog.
- **Workflows are the primary saved object.** In Browse, saved Workflows now sort
  above search profiles and the legacy "Smart collections"; the Settings section is
  named **Workflows**, and profiles are framed as an advanced, optional context a
  workflow can restore.
- **Post-onboarding hints lead with the core.** The persistent footer hints now
  surface Actions (`Cmd/Ctrl+K`) and Workflows (`Cmd/Ctrl+S`) instead of niche mode
  triggers; the escape-literal hint shows only during first-run.

### Fixed
- Corrected now-inaccurate README/store copy (fact-checked against the code): the
  retired custom-search create path, the action palette being free (open/copy/rename)
  with only star/export/batch Pro, and Canvas/PDF/Bases search being Pro-only.

### Internal
- **SpotlightModal decomposition.** The ~2,400-line modal is down ~20% (to ~1,900),
  with its keyboard layer, search result-building, actions palette, and result
  context menu extracted into four focused modules (`keymap`, `resultBuilders`,
  `actionBuilders`, `contextMenu`) — all behavior-preserving and covered by the
  fixture-vault and modal interaction harnesses.
- CI now runs the full gate (typecheck + lint + build + both harnesses, with ripgrep
  installed) on every push to `master` and every PR, not only on a release tag.
- Added recall-boundary test coverage; aligned ripgrep line scoring to the 0-based
  basis the worker/in-process scorers use; documented the per-platform `npm ci`
  requirement for the esbuild-based harnesses.

## [2.10.0] - 2026-07-04

A robustness and polish pass driven by a full multi-agent audit of the plugin.

### Fixed
- **Free users can actually save a workflow now.** `Mod+S` was registered only
  after the Pro gate in the modal, so pressing it did nothing on the free tier even
  though Settings advertised it — the free "save up to two workflows" feature was
  unreachable. `Mod+S` now saves a workflow for every tier (the free limit is
  enforced with an upgrade notice), and it always saves a *workflow* rather than
  falling through to a dead custom-search branch.
- **Content search no longer drops legitimate matches under ripgrep.** The per-file
  match cap was as low as four results, so a dense note could be truncated below the
  requested result count — ripgrep returned fewer matches than the in-process
  fallback for the same query. The cap is now sized to the requested limit.
- **Search results are identical whether or not ripgrep truncates long lines.**
  ripgrep's column cap is aligned to the in-process/worker line cap (2000), so a
  match in columns 501–2000 no longer exists on mobile/fallback yet vanishes with
  ripgrep installed.
- Tie-broken content ordering is now truly engine-independent: ripgrep sorts by the
  same (score, path, line) comparator as the worker and in-process paths, so equal
  scores order identically even when no Canvas/Base results are merged.
- **Rename now works on the free tier.** The action palette locked "Rename" behind
  Pro while the right-click / Alt+Enter menu offered it ungated — the two paths are
  now consistent and rename is free everywhere (it's a basic file operation).
- Content-search result ordering no longer depends on whether ripgrep is installed:
  a Canvas or Base match and a deep-line note match now sort the same way with or
  without `rg`, so Pro/desktop and free/mobile see the same order for a query.
- "Ignore diacritics" now applies to heading, symbol, open-editor, and command
  search too — previously only filename search honored it, so with the setting on,
  `cafe` matched `Café.md` but not a `## Café` heading. All modes now agree.
- The off-thread content index is no longer abandoned for the rest of the session
  after a single slow scan on a very large vault. A transient timeout (a GC/OS pause
  or one heavy scan) now falls back in-process for just that query and keeps the
  worker; it's only retired after several consecutive timeouts.
- A mode-trigger prefix like `!!` no longer becomes silently unreachable when the
  escape character is `!` (the escape is matched first, so it shadowed the trigger).
  The escape character now reconciles against prefix overlaps, not just exact
  matches.
- Adding a search profile right after removing one no longer mints a duplicate id
  (the "Profile N" name reuses a number by list length), so removing, pinning, or
  activating one profile can't act on another.
- `level:` heading filters accept multi-digit levels predictably — `level:10` is
  parsed and clamped (dropping the filter) instead of leaking in as a search word.
- Touch: a scroll-drag that starts on a result no longer activates it and closes the
  launcher before you lift your finger (activation moved from press to click).
- IME: composing CJK text is no longer interrupted by drill-in navigation or the
  Enter-family and Pro shortcuts (`Mod`/`Shift`/`Alt`+Enter, `Mod`+`K`/`D`/`S`/Space).
- A preserved selection (e.g. after a passive background re-index) now stays scrolled
  into view instead of sitting off-screen until the next arrow key.
- Screen readers: result section labels are marked presentational so they're no
  longer exposed as stray, roleless items inside the results listbox.

### Performance
- Content search stays responsive (and uses less memory) on notes containing
  pathologically long machine-generated lines: each indexed line is capped in both
  the off-thread and in-process indexes, mirroring ripgrep's column cap. This most
  helps mobile, where the in-process index is the only content-search path.

### Changed
- Saved-search concepts are being consolidated toward **Workflows**. Creating new
  *custom searches* is retired (it overlapped heavily with workflows and its only
  entry point was broken); existing custom searches keep running as commands and are
  still managed in Settings. `Mod+S` saves a workflow.

### Internal
- **New fixture-vault interaction harness** (`tests/vault-harness.test.mjs`): bundles
  the real search modules and drives them over an on-disk fixture vault — typing
  queries and asserting the actual results (AND semantics, ranking, exclusions,
  diacritic folding, canvas/base, and ripgrep-vs-fallback recall/column/ordering
  parity when `rg` is installed). Unlike the prior source-string checks, it exercises
  production code end-to-end and is verified to fail when a search fix is reverted.
- **New modal interaction harness** (`tests/modal-harness.test.mjs`): runs the real
  `SpotlightModal` over a fake Obsidian DOM/keymap — opening the modal, checking the
  registered shortcuts, typing a query to results, activating with Enter to open a
  note, and saving a workflow end-to-end on the free tier. It is verified to fail
  when the free-workflow-save regression is reintroduced.
- Ripgrep line scoring now uses the same 0-based line basis as the worker/in-process
  scorers (was 1-based), so scores no longer drift by one at every tenth line.
- Repository hygiene: a `.gitattributes` pins line endings to LF so a Windows clone
  can't produce phantom CRLF churn, and `npm run lint` now fails on any ESLint
  warning (`--max-warnings 0`) instead of letting warnings ship green.
- Settings load is hardened further: an oversized `fileFrecency` map is pruned to its
  cap on load, the remaining boolean toggles are coerced against corrupt values, and
  the recent/starred caps are clamped to a sane maximum.
- Popout-window safety: the modal's focus-retry timers/rAF now run on the modal's own
  window.
- Full TypeScript `strict` mode is enabled, plus `noImplicitReturns` and
  `noFallthroughCasesInSwitch`.
- New unit tests cover profile-id de-duplication, escape/prefix reconciliation,
  multi-digit `level:` parsing, and the empty-query matcher contract.

## [2.9.1] - 2026-07-04

Follow-ups from a product critique of 2.9.0.

### Fixed
- The built-in "Follow-ups" and "Meeting notes" starter workflows used Boolean
  `OR`, which the query language does not support (it treated `OR` as a required
  word), so they returned no results. They now use working single-filter queries.

### Changed
- Workflows are genuinely usable on the free tier: you can now save **and re-run**
  up to two of your own workflows from Browse. Previously the 2-workflow free
  allowance existed in code but Browse only ever showed workflows to Pro users, so
  a saved free workflow was invisible. Pro remains unlimited and can load the
  curated starter presets. Settings and the README now state the policy clearly.
- The content-search empty state now notes that every word must appear on the same
  line (line-level AND matching), so results match expectations.

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
