# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

**Vault Spotlight** is a Spotlight/Raycast/Alfred-style launcher plugin for
[Obsidian](https://obsidian.md). A single keyboard-first modal does fuzzy file
search, command palette, heading/symbol jump, ripgrep-fast content search, an
inline calculator/converter, natural-language date jump to daily notes, quick
capture, snippet insertion, and batch actions.

- **Plugin id:** `vault-spotlight` (see `manifest.json`)
- **Runtime target:** Obsidian desktop **and** mobile (`isDesktopOnly: false`,
  `minAppVersion: 1.5.0`). Do not assume Node/Electron/`child_process` is
  available at runtime — feature-detect it (ripgrep is the main case).
- **Distribution:** ships as a single bundled `main.js` plus `manifest.json`,
  `styles.css`, and `versions.json`. There is no separate asset pipeline.
- **Licensing:** free core + a one-time **Pro** unlock. Pro is verified
  **offline** with Ed25519 signatures — no server, account, or network calls.

## Build, test, lint

```bash
npm install
npm run dev      # esbuild watch -> main.js (inline sourcemap)
npm run build    # esbuild production bundle -> main.js (no sourcemap)
npm test         # lint + sync-shared --check + full .mjs test suite (run before committing)
npm run lint     # tsc --noEmit + eslint src
```

- **`npm test` is the gate.** It runs `npm run lint`, then `sync-shared --check`,
  then every `tests/*.test.mjs` file in sequence. CI runs `npm run build && npm test`
  on every push to `master` and every PR (`.github/workflows/ci.yml`), and again on a
  release tag (`release.yml`). Always run `npm test` before committing a code change.
- **`npm ci` on the platform you run tests on.** The interaction harnesses
  (`tests/vault-harness`, `tests/modal-harness`) bundle `src` with esbuild, which
  ships a **native, per-OS binary**. A `node_modules` populated on Windows will make
  `npm test` fail under WSL/Linux (and vice-versa) when it reaches the harness — run
  `npm ci` in the same environment where you run the tests.
- The ripgrep-specific assertions in `tests/vault-harness` only run when `rg` is on
  PATH; they skip (loudly) otherwise. CI installs ripgrep so they always execute.
- There is no test runner/framework: tests are plain Node scripts using the
  built-in `assert` module, added to the `test`/`test:ci` scripts in
  `package.json` by hand. If you add a test file, wire it into **both** scripts.
- `test:ci` is the same suite without lint/sync (used where a canonical core
  checkout may be absent).

## Repository layout

```
src/
  main.ts              # Plugin entry: onload, commands, settings load/save, URL scheme, global API
  settings.ts          # Settings interface, DEFAULT_SETTINGS, VaultSpotlightSettingTab, migrations
  spotlight/           # The modal UI (TypeScript, Obsidian-facing)
    SpotlightModal.ts  # The main modal — largest file, orchestrates modes/keys/rendering
    PreviewPane.ts, resultRow.ts, resultTypes.ts, batchOps.ts, *Modal.ts
  search/              # Per-mode searchers (TypeScript, Obsidian-facing)
    FileSearcher, ContentSearcher, HeadingSearcher, SymbolSearcher,
    CommandSearcher, EditorSearcher, CanvasSearcher, BaseSearcher,
    RipgrepSearcher, WorkerIndex, fuzzy, metadata, vaultFiles
  core/                # Pure logic as .mjs + .d.mts pairs (see "The core/ convention")
  license/             # LicenseManager (product binding), publicKey (bundled Ed25519 pubkey)
  shared/              # Vendored from obsidian-plugin-core — DO NOT edit here (see sync-shared)
  types/               # Ambient .d.ts (e.g. tweetnacl)
tests/                 # Plain-Node assert tests (*.test.mjs), mostly exercising src/core
scripts/               # sync-shared.mjs, generate-license.mjs (author-only), templates
docs/                  # PRD and competitive-review markdown (background, not build inputs)
esbuild.config.mjs     # Bundler config
eslint.config.mjs      # Lint rules (mirrors Obsidian's review bot)
manifest.json          # Obsidian plugin manifest (version must match tag on release)
versions.json          # plugin version -> minAppVersion map (append on release)
CHANGELOG.md           # Keep-a-changelog style, updated every release
```

## The `core/` convention (important)

`src/core/*` holds **pure, framework-free logic** — parsing, scoring, string
transforms, normalization — with **no imports from `obsidian`**. Each module is
authored as a matched pair:

- **`foo.mjs`** — the real implementation, written in plain JavaScript (ESM).
- **`foo.d.mts`** — a hand-written TypeScript declaration describing its exports.

TypeScript in `src/` imports these as `./core/foo.mjs` and gets types from the
`.d.mts`. This split exists so **Node tests can import the exact production code**
(`tests/*.test.mjs` import `../src/core/foo.mjs` directly) without a compile step,
while the TS side stays fully typed. When you change a `.mjs` export signature,
**update its `.d.mts` to match** or `tsc` will drift from reality.

Rules of thumb:
- Put logic that can be pure in `core/` and unit-test it. Keep Obsidian API
  interaction (Vault, Workspace, MetadataCache, Modal) in `spotlight/` and
  `search/`.
- The web-worker content index (`core/workerSource.mjs`) must keep its scoring
  and snippet rules **identical** to the in-process fallback in
  `search/ContentSearcher.ts` — results must not depend on Worker support.

## The `shared/` vendored core (do not edit in place)

`src/shared/verifyLicense.mjs` / `.d.mts` and `scripts/sync-shared.mjs` are
**vendored copies** from a canonical `obsidian-plugin-core` checkout (expected at
`../obsidian-plugin-core` or `$PLUGIN_CORE_PATH`). Edit them in the canonical
repo, then run `npm run sync:shared` to copy them in. `npm test` runs
`sync-shared --check` and fails on drift. If the canonical repo is absent (CI,
fresh clones) both modes no-op silently — the committed copies are the source of
truth for builds. `LicenseManager.ts` is the thin product binding
(`PRODUCT = "vault-spotlight"`) over the shared verifier.

## Licensing model

- Pro is gated by `settings.isPro`. License keys are `payload.signature`
  (URL-safe base64), verified against the bundled public key in
  `src/license/publicKey.ts` with tweetnacl (Ed25519). Verification is **fully
  offline** — never add a network call to license checks.
- Feature gating is checked via `settings.isPro` throughout; when adding a Pro
  feature, gate its command/action and make sure it degrades cleanly on the free
  tier (e.g. the global `search()` API resolves `[]` without Pro).
- `scripts/generate-license.mjs` is an **author-only** tool needing the private
  key (`scripts/.license-private.key`, gitignored, never commit). It is not part
  of the plugin build.

## Conventions & gotchas

- **Popout-window safety.** eslint bans bare `document` and `globalThis` in
  `src/**/*.ts`. Use `ownerDocument`/`activeDocument`/`activeWindow` (or the
  element's own document) so the plugin works in Obsidian popout windows. Follow
  this even where the linter doesn't reach.
- **Lint mirrors Obsidian's review bot.** `eslint.config.mjs` enables the
  typescript-eslint `no-unsafe-*` family, `no-floating-promises`, and
  `no-misused-promises` as warnings — these are what the community-plugin review
  flags. Keep the build warning-clean; prefer real type resolution over `any`
  casts (see the `moment` pin in `SpotlightModal.ts` for the pattern). `.mjs`,
  `.d.mts`, `tests/`, and `scripts/` are excluded from lint.
- **Settings are versioned data.** `settings.ts` normalizes/migrates loaded
  `data.json` (via the `normalize*` helpers in `core/`). When you add a setting,
  add it to `DEFAULT_SETTINGS` and make sure loading old data is safe.
- **No default hotkey.** Per Obsidian guidelines the plugin registers commands
  and a ribbon icon but sets no default hotkey — don't add one.
- **Modes.** The canonical mode list is `MODE_ORDER` in `spotlight/resultTypes.ts`
  (`files`, `content`, `headings`, `symbols`, `commands`, `links`, `editors`,
  `folders`). Mode prefixes are user-configurable via `core/modeTriggers.mjs`.
- **Public surface.** The URL scheme (`obsidian://vault-spotlight?...`) and the
  `globalThis.vaultSpotlight` API (`open`, `search`, `isProActive`) in `main.ts`
  are documented in the README — treat them as stable contracts.
- **Privacy.** The plugin never phones home. All state is local `data.json`
  (settings + ranking data: recent/starred paths, frecency counts, recent
  queries). Don't introduce telemetry or network calls.

## Release process

Releases are tag-driven. The workflow triggers on tags matching
`[0-9]+.[0-9]+.[0-9]+` and requires that:

1. `manifest.json` `version` **equals the tag**.
2. `versions.json` contains an entry for that version.

So a release bumps `package.json`, `manifest.json`, and appends to
`versions.json` (version → minAppVersion) and `CHANGELOG.md`, then pushes a
matching tag. CI builds, runs the tests, verifies the files, and publishes
`main.js`, `manifest.json`, `styles.css`, `versions.json` as release assets.

## Working in this repo

- Branch: develop on the assigned feature branch; do not push to `master`.
- Match the surrounding style: the codebase is heavily commented with the
  *why* (edge cases, review-bot rationale, popout safety). Preserve that when
  editing — don't strip explanatory comments.
- After any source change, run `npm test` and keep it green before committing.
- Update `CHANGELOG.md` when you make a user-facing change.
