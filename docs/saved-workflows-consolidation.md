# Saved-search consolidation — design & migration plan

Status: **groundwork landed, migration deferred to its own release.**

## Problem

Five overlapping concepts each let a user "save some search context": **workflow
presets**, **search profiles**, **custom searches / smart collections**, **pinned
collection ids**, and **search aliases**. Users shouldn't have to learn five
persistence models to reuse a search.

## Unified model — `SavedWorkflow`

One list replaces four of the five concepts (aliases stay separate — they're an
inline query-expansion macro, not a runnable search). Advanced properties are
optional, so a casual row is just name + query + mode:

```ts
interface SavedWorkflow {
  id: string;
  name: string;
  query: string;
  mode: string;
  pinned?: boolean;
  starter?: boolean;
  rankingMode?: string;
  scope?: {                 // folds SearchProfile
    includeCanvas: boolean;
    includePdf: boolean;
    includeBases: boolean;
    excludeFolders: string[];
    showPreview: boolean;
  };
  sticky?: boolean;         // scope persists after apply (old active-profile) vs one-shot
  exposeAsCommand?: boolean;// keep registering custom-search-<id> so hotkeys survive
}
```

`activeProfileId` → `activeWorkflowId` (the runtime `activeWorkflowId` already exists
in the modal). Settings shows a single **Saved workflows** list; scope / sticky /
command / ranking are collapsed "Advanced" toggles per row.

## Migration (pure, implemented, NOT yet wired)

`src/core/savedWorkflows.mjs` `buildSavedWorkflows(legacy)` performs the merge and is
unit-tested in `tests/saved-workflows.test.mjs`:

- **workflow presets → workflows**, inlining the referenced profile's scope so one
  apply reproduces the old profile+preset combo.
- **custom searches → workflows** with `exposeAsCommand: true`, **reusing their exact
  id** so `custom-search-<id>` command ids and any user hotkeys stay valid; pin state
  comes from `pinnedCustomSearchIds`.
- **profiles referenced by no workflow → standalone `sticky` scope workflows** so
  nothing is lost; a referenced profile is not also emitted standalone.
- colliding ids across the concepts are re-minted unique.
- `migratedActiveWorkflowId(legacy)` remaps `activeProfileId`.

## Why the activation is deferred

The only remaining step — wiring this into `loadSettings` — is the risky one, so it
ships separately with review:

1. Add a `savedWorkflows: SavedWorkflow[]` field; in `loadSettings`, when it's
   absent/empty, build it from the legacy arrays. **Do not delete** the legacy arrays.
2. **Read-through both** new + legacy for 1–2 releases; the settings UI writes only
   `savedWorkflows`. Remove legacy fields only after a deprecation window.
3. Raise the per-array caps during the merge so `slice()` never truncates entries.
4. Guards: command-id stability for hotkeys; caps must not truncate; do not convert
   aliases; preserve starter "Hide" state; preserve sticky-scope vs one-shot exactly.

`schemaVersion` (already added to settings, default `1`) is the marker a future
`loadSettings` branches on to run this once.
