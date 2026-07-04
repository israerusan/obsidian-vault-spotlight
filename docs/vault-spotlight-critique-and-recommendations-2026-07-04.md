# Vault Spotlight: Critique and Recommendations

**Date:** July 4, 2026  
**Version reviewed:** 2.8.1  
**Review scope:** Product positioning, user experience, architecture, maintainability, performance, testing, and release readiness  
**Constraint:** Assessment only; no source code was changed

## Executive summary

Vault Spotlight has a technically capable core, but it currently feels like several plugins combined inside one modal. Its engineering quality is stronger than its product clarity.

The plugin already demonstrates careful handling of asynchronous search, lifecycle cleanup, accessibility, offline privacy, licensing, and large-vault performance. Its primary weakness is not a lack of features. It is a lack of consolidation. Search modes, profiles, workflows, aliases, collections, custom searches, batch operations, snippets, capture, calculators, dates, and integrations compete for attention and create overlapping concepts.

The strongest product position is already present in the Phase 1 PRD:

> Find things fast, then act on them without leaving the keyboard.

Future work should reinforce that promise rather than expand the feature inventory indiscriminately.

### Overall assessment

| Area | Score | Assessment |
| --- | ---: | --- |
| Technical capability | 8/10 | Broad, thoughtful, and unusually defensive implementation |
| Maintainability | 5/10 | Large central classes and too many implicit UI states |
| UX and discoverability | 5/10 | Powerful, but conceptually crowded and dependent on learned syntax |
| Product positioning | 4/10 | Differentiation exists, but is buried under feature volume |
| Release readiness | 6/10 | Static checks pass, but real Obsidian integration coverage is weak |

## Verification performed

The full `npm test` command completed successfully, including TypeScript, ESLint, shared-source synchronization, and all current test scripts.

However, the vault integration test reported that it performed bundle checks only because no test vault was available. The passing suite therefore does not demonstrate that complete user journeys work correctly inside Obsidian.

## Critical findings

### 1. The starter workflows contain unsupported query syntax

The built-in starter workflows use queries such as:

```text
#waiting OR #followup
"action item" OR "next step"
```

The advanced query parser does not implement Boolean `OR`. In file search, `OR` becomes an ordinary required text token while both tags are treated as required filters. In content search, quotes and `OR` are also passed into a simple token-based search that requires every token on one line.

The result is that prominent starter workflows can return incorrect results or no results. This is especially damaging because starter workflows are intended to demonstrate Pro value during the user's first experience.

**Recommendation:** Either implement and test explicit Boolean query semantics or replace the starter queries with syntax the current engines actually support. Do not advertise Boolean examples until every relevant search engine handles them consistently.

### 2. The Free/Pro workflow policy is contradictory

The workflow core defines a free allowance of two presets, and the Phase 1 PRD specifies the same policy. The current interface makes that allowance inaccessible:

- The save-workflow shortcut is registered only for Pro users.
- Browse displays workflows only for Pro users.
- Settings describes workflows as locked behind Pro.
- The README comparison table classifies workflows as Pro-only.

This leaves dead policy code and makes it unclear which commercial model is intentional.

**Recommendation:** Choose one policy and enforce it consistently in the core, modal, settings, tests, README, and PRD. A two-workflow free allowance is likely the stronger conversion funnel because users can experience the recurring-workflow benefit before purchasing.

### 3. `SpotlightModal.ts` is an architectural bottleneck

`SpotlightModal.ts` is approximately 2,551 lines. It owns:

- Mode resolution
- Search orchestration
- Result transformation
- Rendering and empty states
- Keyboard handling
- Selection and drill-down state
- Action menus
- Capture and snippet behavior
- Workflow and profile execution
- File opening
- Preview coordination
- Pro feature gates

This concentration creates a large implicit state machine. Mode, query generation, action-palette state, drill-down state, checked results, active workflow, preview state, license state, and pending asynchronous searches can interact without explicit transition rules.

The class may work today, but every additional feature increases regression risk and makes isolated testing harder.

**Recommendation:** Extract controllers around behavior rather than splitting the file arbitrarily:

- `SearchController`: query generation, cancellation, engine dispatch, and result production
- `ModeController`: prefixes, mode transitions, drill-down, and mode-specific state
- `KeyboardController`: shortcut registration and intent dispatch
- `ActionController`: action availability, execution, and batch selection
- `WorkflowController`: saved workflow creation, execution, validation, and limits

Keep the modal responsible for composition and rendering, not for every business rule.

### 4. Tests validate helpers more than the actual product

The current tests provide useful coverage for parsers, ranking helpers, licensing, natural dates, calculator behavior, snippets, workers, and other pure logic. They do not sufficiently cover complete interactions such as:

- Opening, closing, and reopening the modal
- Rapid typing and stale-result cancellation
- Keyboard navigation and IME composition
- Running starter and user-created workflows
- Changing license state while Obsidian is running
- Capture into real notes and headings
- Batch actions, partial failure, and undo behavior
- Pop-out windows
- Mobile behavior
- Plugin unload during indexing or preview rendering

The unsupported starter workflow syntax passed the suite because tests confirm that workflow objects exist, not that executing their queries produces the advertised behavior.

**Recommendation:** Add a small integration harness with a deterministic fixture vault. Test complete journeys and observable outcomes, not just helper return values.

### 5. The product surface is too broad

Vault Spotlight currently presents itself as all of the following:

- File launcher
- Command palette
- Full-text search engine
- Heading and symbol navigator
- Link browser
- Calculator and converter
- Natural-language date launcher
- Quick-capture tool
- Snippet manager
- Workflow system
- Search profile manager
- Saved collection system
- Batch organizer
- MOC builder
- Canvas, PDF, and Bases discovery tool
- Integration hub

Each feature is individually defensible. Together, they obscure the core reason to install or purchase the plugin. The README communicates inventory more clearly than value.

**Recommendation:** Organize the product around three jobs:

1. Find a note, command, or vault object.
2. Understand why it was returned.
3. Act on it without leaving the keyboard.

Calculator, dates, capture, and snippets can remain, but should be presented as secondary quick actions rather than equal pillars of the product.

## Important findings

### Overlapping saved-search concepts

Workflows, profiles, custom searches, aliases, and smart collections partially solve the same user need: avoid repeatedly reconstructing search context.

The distinctions make sense internally, but users should not need to understand five persistence models.

**Recommendation:** Use one user-facing concept—`Saved workflows`—with optional advanced properties for mode, query, profile, ranking, pinning, and command registration. Aliases can remain a query-language convenience rather than another workflow category.

### Settings are too dense

`settings.ts` is approximately 825 lines and renders a long sequence of controls. This makes important defaults difficult to locate and increases the apparent complexity of the plugin.

**Recommendation:** Divide settings into navigable sections:

- General
- Search and ranking
- Workflows
- Capture and snippets
- Integrations
- License and Pro

Show advanced options progressively rather than presenting every control at once.

### Query behavior is not sufficiently explicit

Content search uses same-line AND semantics: every token must appear on the same line. Many users will assume normal document-level full-text search.

**Recommendation:** Explain the semantics in the content-search empty state and documentation. Longer term, support selectable line, block, and document scopes.

### Workflow identifiers can collide

Workflow IDs are generally derived from normalized names. Two workflows with the same name can receive the same ID, creating ambiguity for activation, pinning, or future editing.

**Recommendation:** Generate opaque unique IDs independently of display names. Treat names as editable labels only.

### Repository review noise is excessive

The working tree currently shows 9,639 insertions and 9,639 deletions across 25 files, strongly suggesting widespread line-ending or formatting churn. This makes meaningful review difficult and can conceal accidental changes.

**Recommendation:** Normalize line endings with `.gitattributes`, separate formatting-only changes from behavioral work, and require reviewable diffs before release.

### Mobile positioning needs clarification

The manifest declares the plugin as mobile-compatible. The implementation safely falls back when desktop process APIs and ripgrep are unavailable, which is good. Nevertheless, performance and capabilities differ materially between desktop and mobile.

**Recommendation:** Publish a small desktop/mobile capability table and benchmark the fallback index on representative mobile vaults.

### License-key persistence is too eager

License verification and persistence occur on every license input change. The writes are serialized correctly, but saving every keystroke is unnecessary.

**Recommendation:** Debounce persistence and verification, or verify on blur/paste completion while keeping immediate status feedback where practical.

## Engineering strengths

The critique should not obscure several areas of strong implementation:

- Search generations prevent stale asynchronous results from replacing current results.
- Timers, workers, child processes, listeners, previews, and global APIs receive explicit cleanup.
- Ripgrep uses `execFile` with separated arguments rather than constructing shell commands.
- Ripgrep failures fall back safely to worker or in-process indexing.
- Index maintenance handles create, modify, rename, and delete events.
- Settings loading validates malformed persisted data and defends against prototype pollution.
- Settings writes are serialized to prevent stale writes from winning.
- Accessibility receives serious attention, including ARIA roles, stable live regions, keyboard navigation, and IME handling.
- File search defers expensive display metadata until after ranking and result limiting.
- Offline operation, local data, and Ed25519 license verification are meaningful privacy advantages.

These strengths justify refactoring rather than rewriting the plugin.

## Prioritized recommendations

### Immediate: correctness and release hygiene

1. Fix or remove unsupported `OR` starter queries.
2. Resolve the Free/Pro workflow contradiction.
3. Add execution tests for every built-in workflow.
4. Generate collision-resistant workflow IDs.
5. Normalize line endings and produce reviewable diffs.
6. Verify the current build inside a fixture Obsidian vault on desktop and mobile.

### Near term: product consolidation

1. Unify workflows, collections, and custom searches under `Saved workflows`.
2. Reduce the default modal hint density after onboarding.
3. Reorganize settings into clear sections.
4. Rewrite the first part of the README around three concrete user journeys.
5. Make line-level content-search semantics explicit.
6. Add lightweight onboarding that demonstrates one free recurring workflow.

### Medium term: architecture and quality

1. Extract search, mode, keyboard, action, and workflow controllers from the modal.
2. Model modal transitions explicitly and test them as state transitions.
3. Add integration tests against a deterministic fixture vault.
4. Benchmark cold start, first search, incremental search, and memory use with approximately 1,000, 10,000, and 50,000 notes.
5. Define compatibility tests for Obsidian desktop, mobile, and pop-out windows.

## Recommended new features

New features should deepen the command-center position rather than create additional unrelated categories.

### 1. Composable action workflows

Allow a saved workflow to contain a short sequence of existing actions. For example, a `Weekly review` workflow could:

1. Search for notes modified in the last seven days.
2. Apply a pending-task or tag filter.
3. Open the resulting working set or export it to a review note.

This builds on current search, saved workflow, batch, and export infrastructure. It should be an extension of Saved Workflows, not a new user-facing object type.

Safety boundaries should be explicit: destructive steps require confirmation, while read-only search and open actions can execute immediately.

### 2. Interactive “Why this result?” inspection

Provide a keyboard-accessible score explanation for the selected result:

```text
Filename match       +820
Recently opened      +240
Starred             +3000
Alias match          +180
```

The existing match-reason badges are useful but shallow. A detailed explanation would make ranking predictable, help users tune settings, and give Vault Spotlight a visible differentiator from opaque quick switchers.

## Features not recommended yet

Do not prioritize semantic search, OCR, AI summarization, a visual query builder, or additional attachment indexers until the current workflow model and modal architecture are consolidated. Those additions would expand operational and UX complexity before the existing product surface is coherent.

## Suggested success metrics

Technical and product changes should be evaluated using a small set of measurable outcomes:

- Median time from opening Spotlight to activating a result
- Percentage of searches completed without switching to another search plugin
- Percentage of users who create and rerun a saved workflow
- Starter workflow success rate
- Search latency at the 50th and 95th percentiles by vault size
- Number of concepts a new user must understand before saving a recurring search
- Rate of empty or zero-result searches caused by unsupported syntax
- Regression count in keyboard, capture, and batch-action flows

## Final recommendation

Vault Spotlight does not need a larger feature list. It needs a more coherent system.

The highest-value next release would:

1. Make every starter workflow correct.
2. Establish one consistent Free/Pro workflow policy.
3. Replace overlapping saved-search concepts with one clear Saved Workflows model.
4. Reduce the responsibility of `SpotlightModal`.
5. Test complete user journeys inside Obsidian.
6. Present the product as a keyboard-first command center rather than an inventory of utilities.

At present, the plugin is most impressive when reading its README. The goal should be for its value to become equally obvious during the first 30 seconds of actual use.
