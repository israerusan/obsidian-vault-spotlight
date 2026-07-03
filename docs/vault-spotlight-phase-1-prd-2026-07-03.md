# Vault Spotlight Phase 1 PRD

Date: 2026-07-03
Product: Vault Spotlight
Repo: `C:\Users\iavil\obsidian-vault-spotlight`
Current version reviewed: 2.5.0
Phase theme: Command Center Upgrade

## 1. Executive summary

Vault Spotlight already has a strong search-and-action foundation, but the current value is still partially hidden behind prefixes, advanced operators, and power-user habits. Phase 1 should convert the plugin from "very capable search modal" into a clearly differentiated command center.

This phase should improve three things at once:

1. make search results easier to trust and understand
2. make repeated workflows reusable and obvious
3. give users control over ranking so Spotlight feels personalized instead of opaque

This phase intentionally avoids trying to out-Omnisearch Omnisearch on OCR or deep attachment indexing. Instead, it sharpens the product's best wedge:

"Find things fast, then act on them without leaving the keyboard."

## 2. Product goal

Ship a Phase 1 upgrade that materially improves:

- user understanding of why results appear
- repeat usage of Spotlight for common vault workflows
- perceived intelligence and control of ranking
- Pro conversion through tangible workflow value instead of abstract feature volume

## 3. Goals

### Primary goals

- Introduce workflow presets as a first-class concept built on top of existing profiles, aliases, and custom searches.
- Add ranking controls so users can choose how results are prioritized.
- Add richer result metadata and match-reason visibility.
- Improve discoverability of advanced features inside the product.

### Secondary goals

- Increase the percentage of users who use Pro-only workflow features repeatedly.
- Reduce user confusion about why a result ranked highly.
- Make Vault Spotlight easier to demo, market, and explain in screenshots/GIFs.

## 4. Non-goals

This phase will not include:

- OCR
- image text extraction
- full PDF indexing engine
- local HTTP server
- open-vault switching
- complete visual query-builder product
- major rewrite of the entire modal architecture

Those may be Phase 2 or 3 items.

## 5. Target users

### Primary persona: keyboard-first Obsidian power user

Characteristics:
- medium to large vault
- already uses search, command palette, quick switchers, or Omnisearch
- wants speed and fewer context switches
- values reusable workflows, not just discovery

Jobs to be done:
- jump to the right note quickly
- run repeated vault workflows without retyping complex queries
- understand why a result appeared
- act on results immediately

### Secondary persona: advanced but less technical organizer

Characteristics:
- willing to pay for time savings
- not excited about memorizing search syntax
- benefits from guided presets and visible metadata

Jobs to be done:
- use saved workflows for recurring tasks
- trust the ranking and filters
- discover Pro value without reading long docs

## 6. Product positioning

### Positioning statement

Vault Spotlight is a keyboard-first command center for Obsidian that helps users find notes, understand results, and act on them immediately.

### Category position

- Not primarily a full-text indexer like Omnisearch
- Not only a switcher/navigation enhancer like Quick Switcher++
- Not only an advanced query builder like Vantage
- Best positioned as a Raycast-style vault command center

## 7. Problem statement

Today Vault Spotlight already supports powerful workflows, but users face three adoption barriers:

1. Ranking is smart but not user-steerable.
2. Result reasoning is mostly invisible.
3. Repeated workflows exist in pieces (profiles, aliases, custom searches, collections) rather than as one obvious reusable object.

This makes the plugin stronger than it first appears, but also harder to sell, demo, and learn.

## 8. Phase 1 scope

Phase 1 includes four deliverables:

1. Workflow presets
2. Ranking controls
3. Richer result metadata and match reasons
4. Discoverability/onboarding improvements

## 9. Feature requirements

## 9.1 Workflow presets

### Summary

Introduce a first-class reusable workflow object that packages a query, mode, and optional behavior preferences into a single named command-center preset.

### Why

Vault Spotlight already has pieces of this behavior in:
- custom searches
- smart collections
- search profiles
- aliases

But users should not need to understand all four concepts to get value. Phase 1 should unify them into one user-facing concept: workflow presets.

### User stories

- As a user, I want to save my current Spotlight setup as a reusable workflow so I can run it again instantly.
- As a user, I want a workflow to include a mode and default query so it feels like a custom workspace entry point.
- As a user, I want a small set of starter workflows so I understand what this feature is for.
- As a Pro user, I want unlimited workflows and the ability to pin them.

### Functional requirements

- Users can create a workflow preset from the current query + mode.
- A workflow preset stores at minimum:
  - id
  - name
  - query
  - mode
  - optional profile association
  - pinned state
  - created timestamp
  - updated timestamp
- Workflow presets appear:
  - in empty-state browse results
  - in command palette/search results when relevant
  - in settings management UI
- Users can run a workflow preset from Spotlight.
- Users can pin/unpin workflow presets.
- Users can rename and delete workflow presets.
- Users can ship with starter presets like:
  - Inbox cleanup
  - Weekly review
  - Client notes
  - Research triage
- Free tier supports up to 2 workflow presets.
- Pro tier supports unlimited workflow presets.

### Acceptance criteria

- A user can save the current Spotlight state as a named workflow in under 3 interactions.
- Running a workflow restores the intended mode and query reliably.
- Pinned workflows appear prominently in the empty-state browse view.
- Free users clearly understand the 2-workflow limit without a hostile lockout UX.

## 9.2 Ranking controls

### Summary

Give users explicit control over how results are prioritized.

### Why

A search tool feels "smart" only if users can predict and influence results. Competitor demand strongly suggests users want ranking control.

### User stories

- As a user, I want to choose whether filenames, recency, aliases, or metadata matter more.
- As a user, I want Spotlight to prioritize files that match my actual workflow style.
- As a Pro user, I want ranking behavior to be customizable per profile or workflow.

### Functional requirements

- Add built-in ranking modes:
  - Balanced
  - Filename-first
  - Recency-first
  - Alias-first
  - Metadata-first
- Add toggles for:
  - prefer open files
  - prefer starred files
  - demote excluded/archive-like paths
  - ignore diacritics when matching
- Ranking mode can be configured globally.
- Pro users can override ranking mode per search profile/workflow preset.
- UI must explain the current ranking mode in plain language.

### Acceptance criteria

- Users can change ranking mode from settings.
- Search results change measurably according to the selected ranking mode.
- The current ranking mode is discoverable without opening documentation.
- Diacritics-insensitive matching works when enabled.

## 9.3 Rich result metadata and match reasons

### Summary

Expose why a result matched and add optional metadata lines/badges so users can trust results faster.

### Why

Search confidence is part of product quality. If the user can see why something matched, they are more likely to trust and adopt advanced workflows.

### User stories

- As a user, I want to see whether a note matched by filename, alias, heading, property, tag, or content.
- As a user, I want helpful secondary metadata below results so I do not have to open notes blindly.
- As a user, I want visual cues for file types like PDF, Canvas, Base, or starred notes.

### Functional requirements

- Result row supports an optional secondary metadata line.
- Metadata line can show combinations of:
  - folder trail
  - tags
  - aliases
  - modified time
  - file type
- Result badges can indicate:
  - PDF
  - Canvas
  - Base
  - starred
  - bookmarked
  - alias match
  - heading match
  - content match
- Match reason text should be available at least in Pro mode or expanded detail mode.
- Match reason examples:
  - matched filename
  - matched alias
  - matched tag
  - matched property
  - matched heading
  - matched content

### Acceptance criteria

- Users can visually distinguish why two similar results differ.
- Metadata display does not noticeably degrade modal responsiveness.
- Match-reason rendering works consistently across file, heading, and content result types.

## 9.4 Discoverability and onboarding

### Summary

Surface advanced value in-product so users do not need the README to understand why Vault Spotlight is special.

### Why

This plugin now has enough depth that discoverability may be a bigger growth constraint than missing features.

### User stories

- As a new user, I want to understand the main modes and power features quickly.
- As a free user, I want to see concrete examples of Pro workflows.
- As a Pro user, I want easy examples I can adapt instead of building everything from scratch.

### Functional requirements

- Add first-run or first-open guidance panel.
- Add clickable examples in the hint/help area.
- Add starter workflow presets.
- Add clear, non-intrusive Pro examples tied to actual use cases.
- Add improved settings copy for workflows, ranking, and match reasons.

### Acceptance criteria

- A new user can discover at least 3 advanced capabilities within the first session.
- Starter workflows can be run without manual configuration.
- Free-to-Pro upsell references real workflow outcomes, not generic upgrade language.

## 10. Proposed data model

## WorkflowPreset

```ts
interface WorkflowPreset {
  id: string;
  name: string;
  query: string;
  mode: "files" | "content" | "headings" | "symbols" | "links" | "editors" | "folders" | "commands";
  profileId?: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}
```

## RankingSettings

```ts
interface RankingSettings {
  mode: "balanced" | "filename" | "recency" | "alias" | "metadata";
  preferOpenFiles: boolean;
  preferStarredFiles: boolean;
  demoteArchivePaths: boolean;
  ignoreDiacritics: boolean;
}
```

Possible future extension:

```ts
interface WorkflowRankingOverride {
  rankingMode?: RankingSettings["mode"];
}
```

## 11. UX requirements

### Empty-state browse view

Must prominently show:
- recent files
- bookmarks
- pinned smart collections
- pinned workflow presets
- starter workflows if the user has none

### Result row design

Each result row should support:
- primary title
- optional subtitle/metadata line
- badges
- selection state
- match reason state

### Settings UX

Need dedicated sections for:
- Workflow presets
- Ranking
- Result metadata display
- Onboarding/examples

## 12. Free vs Pro packaging

### Free

- up to 2 workflow presets
- built-in ranking modes
- metadata line basics
- badges
- starter workflows

### Pro

- unlimited workflow presets
- pinned workflow presets
- ranking overrides per profile/workflow
- full match reasons
- richer metadata configuration
- premium workflow examples and action integrations

## 13. Technical requirements

### Architecture direction

Because `src/spotlight/SpotlightModal.ts` is already large, Phase 1 implementation should avoid piling more logic into it directly.

Preferred extraction areas:
- `src/core/workflows.*` for workflow preset normalization and helpers
- `src/core/ranking.*` for ranking mode logic and scoring helpers
- `src/core/matchReasons.*` for result explanation helpers
- small UI helpers for result-row metadata/badges

### Performance requirements

- No visible lag increase during normal typing in the modal.
- Metadata and match-reason rendering must not block search responsiveness.
- Ranking controls should reuse current scoring paths where practical.

### Compatibility requirements

- Preserve existing settings migration behavior.
- Existing custom searches, profiles, and pinned collection data must remain intact.
- Free/Pro feature gates must continue to work offline.

## 14. Migration requirements

- Existing `customSearches`, `searchProfiles`, and `pinnedCustomSearchIds` must load unchanged.
- Workflow presets should be introduced as a new layer, not a breaking replacement.
- If starter workflows are added automatically, they should only appear when the user has none.

## 15. Success metrics

### Product metrics

- increase repeat usage of Spotlight workflows per active user
- increase share of users who use more than one mode
- increase number of saved workflows per Pro user
- increase Pro conversion rate from active free users

### Behavioral metrics

- users run starter workflows
- users change ranking mode
- users interact with pinned workflows in browse state
- users use action palette after running a workflow

Because the plugin is privacy-first and offline-first, metrics should be local-only unless a future opt-in analytics model is introduced. For now, use local counters for UX decisions, not remote telemetry.

## 16. Risks

### Product risks

- Too many new concepts could increase complexity instead of reducing it.
- If workflow presets overlap too much with custom searches/profiles, users may be confused.
- Poor free/Pro packaging could make the upgrade feel artificial.

### Technical risks

- More modal state in `SpotlightModal.ts` could increase regressions.
- Ranking changes may produce surprising result shifts if not tested carefully.
- Metadata rendering may clutter the interface if not visually restrained.

## 17. Mitigations

- Present workflow presets as the user-facing concept; keep profiles/custom searches as lower-level building blocks.
- Extract core logic into testable modules before wiring UI.
- Add focused tests for ranking behavior, workflow serialization, and match-reason formatting.
- Keep metadata line optional/configurable.

## 18. Test plan

Add or update tests for:
- workflow preset creation/normalization/migration
- workflow preset limits for free tier
- ranking mode scoring differences
- ignore-diacritics matching
- result metadata formatting helpers
- match-reason formatting helpers
- feature gates and settings persistence

Required verification before release:

```bash
npm run build
npm test
```

## 19. Release checklist for Phase 1

1. Implement feature set with helper extraction first.
2. Add tests for new core modules.
3. Update README screenshots/examples.
4. Bump version files consistently.
5. Run build and test.
6. Install locally into the test vault if doing end-to-end delivery.
7. Push and create release assets when ready.

## 20. Recommended implementation order

### Milestone A
- ranking settings model
- basic ranking mode UI
- scoring helper extraction

### Milestone B
- workflow preset model
- save/run/pin/delete flows
- starter workflows

### Milestone C
- result metadata line
- badges
- match reasons

### Milestone D
- onboarding/help improvements
- README/demo update
- final polish and packaging

## 21. Final recommendation

Phase 1 should be marketed and built as:

"Vault Spotlight Command Center"

not as:

"more search features"

The sellable story is not that it searches more things than everyone else. The sellable story is that it turns repeated vault navigation and organization work into reusable keyboard workflows.
