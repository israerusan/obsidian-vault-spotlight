# Vault Spotlight competitive review and build roadmap

Date: 2026-07-03
Repo reviewed: `C:\Users\iavil\obsidian-vault-spotlight`
Current local version: 2.5.0
Verification run: `npm test` passed

## 1. Current product snapshot

Vault Spotlight is no longer a basic quick switcher clone. In local 2.5.0 it already combines:

- free file launcher + tags/properties filters
- command, symbols, editors, folders, links modes
- Pro content search with ripgrep fallback worker index
- Pro heading search, preview, profiles, aliases, smart collections
- Pro action palette, batch actions, export, MOC builder, Bases/Canvas/PDF discovery
- offline one-time Pro license flow

Evidence from codebase:

- `src/spotlight/SpotlightModal.ts` is the core orchestrator and is large at 1650 lines
- source size is about 49 source files / 5729 lines
- tests exist for search, metadata, worker index, licensing, profiles, links, workflow core, and vault integration
- `npm test` passed successfully

## 2. Market category and direct competitors

Vault Spotlight sits in the Obsidian search / launcher / quick-switcher category.

Most relevant competitors reviewed:

1. Omnisearch
   - Community downloads: 1,572,185
   - GitHub stars: 2,071
   - Positioning: full-text search leader
   - Key strengths: OCR/images/PDF indexing, typo resistance, quote/exclusion syntax, in-file search, local HTTP server / external integrations

2. Quick Switcher++
   - Community downloads: 394,575
   - GitHub stars: 620
   - Positioning: navigation power-user upgrade to core switcher
   - Key strengths: headings search, symbols, open editors, workspaces, bookmarks, related items, open vaults, quick filters

3. Another Quick Switcher
   - Community downloads: 136,660
   - GitHub stars: 397
   - Positioning: dialog-heavy keyboard workflow tool
   - Key strengths: custom searches, in-file search, backlink/link dialogs with context, grep, preview, multi-select, move file, many dialog commands

4. Vantage / visual search-builder niche
   - Vantage downloads: 29,769; 114 GitHub stars
   - Advanced Search UI is smaller, but the niche matters
   - Positioning: visual advanced query builder instead of keyboard-first launcher
   - Key strengths: structured boolean search construction, grouped conditions, easier discoverability for non-power users

## 3. Where Vault Spotlight is strong today

Against the category, Vault Spotlight already has a strong differentiated bundle:

- better monetization shape than most competitors: useful free tier plus one-time Pro
- strong keyboard action layer after search, not just search itself
- search profiles + aliases + smart collections are good workflow primitives
- batch organizer + MOC builder make it a workflow tool, not just a finder
- offline license verification is privacy-friendly and operationally simple
- Bases support is differentiated because most switchers do not treat `.base` as a first-class result type
- URL scheme + `globalThis.vaultSpotlight` API create automation potential

Important strategic takeaway:

Vault Spotlight should not try to beat Omnisearch at pure search indexing depth. Its strongest wedge is:

"find things fast, then act on them without leaving the keyboard"

That is closer to Raycast / command-center positioning than to "search engine for your vault."

## 4. Where Vault Spotlight is weaker than top competitors

### A. Search depth gap vs Omnisearch

Gaps:

- no OCR / image text search
- no true PDF text indexing workflow called out as first-class value
- no local HTTP server / CLI-grade external search endpoint
- no strong story for non-Markdown attachments beyond discovery

Impact:

Users comparing against Omnisearch will still choose Omnisearch for "search everything everywhere" jobs.

### B. Navigation depth gap vs Quick Switcher++

Gaps:

- no workspace switching mode
- no open-vault switching
- no explicit related-items mode like backlinks + outgoing + structural relations in one cluster
- no result priority controls for users who want to tune ranking behavior

Impact:

Power users who live in complex workspace switching and navigation may still prefer Quick Switcher++.

### C. Discoverability gap for less technical users

Gaps:

- product is increasingly feature-rich, but much of the value depends on learning prefixes and advanced operators
- there is no visual query builder / saved workflow wizard / onboarding flow
- action palette and profiles are powerful but likely under-discovered

Impact:

Users may underuse the Pro tier and conclude the plugin is "good search with lots of hidden features" instead of a must-have command center.

### D. Maintainability risk inside the codebase

Gaps:

- `SpotlightModal.ts` is 1650 lines and still central to most behavior
- feature velocity is good, but future changes will get riskier if more UX/state logic stays concentrated there

Impact:

Shipping the next set of premium workflows will get slower and bug risk will rise unless modal logic continues to be split into smaller modules.

## 5. What users are asking for in this category

Signals from open issue queues of direct competitors:

### Omnisearch users are asking for

- CLI / external automation access
- PDF filename and richer attachment search behavior
- better open-in-new-tab behavior
- better image/PDF extraction reliability

Interpretation:

The search-heavy market wants search to escape the modal and become infrastructure: callable externally, reliable on attachments, and precise about where results open.

### Quick Switcher++ users are asking for

- result priority adjustment / ranking control
- more flexible trigger characters
- hide deleted files reliably
- better persistence for recent commands
- heading depth limits
- better symbol labeling using aliases / alternate titles
- exclusion patterns
- ignore-diacritics support

Interpretation:

Navigation users want control and customization more than raw new modes. They want the switcher to match how their vault is named and organized.

### Another Quick Switcher users are asking for

- synonym search
- move selected files from search
- full-path insertion / richer path operations
- wildcard excludes
- tags shown under results
- sorting controls
- more hotkey customization

Interpretation:

The market likes command-heavy dialogs, but asks for better semantic matching, better metadata visibility, and more direct file operations.

### What this means for Vault Spotlight

The highest-demand feature clusters are:

1. better ranking / matching control
2. richer attachment and cross-file search
3. more direct actions from results
4. better discoverability and customization
5. more automation / external entry points

## 6. Recommended product changes

## Priority 1: Ship a "Command Center" upgrade, not a generic search upgrade

This is the best next sellable move.

### 1. Workflow presets with one-key actions

Build on existing profiles, aliases, smart collections, and actions.

Add:

- named workflow presets that package query + mode + action set
- examples like `Client review`, `Weekly review`, `Inbox cleanup`, `Research triage`
- optional "recommended next actions" panel when a result set is active
- ability to run a saved workflow directly from command palette or hotkey

Why:

This makes Vault Spotlight feel like a reusable work cockpit, not just a modal.

Free vs Pro:

- Free: 2 starter workflows
- Pro: unlimited workflows, editable templates, pinning, export/automation actions

### 2. Result ranking controls

Add user-tunable ranking profiles:

- filename-heavy
- recency-heavy
- metadata-heavy
- exact-match-first
- alias-heavy

Advanced toggles:

- ignore diacritics
- prefer open files
- prefer starred files
- demote archived folders
- hide deleted/unresolved entries aggressively

Why:

This directly matches active demand in Quick Switcher++ issue queues and reduces the "why didn’t this rank first?" frustration.

Free vs Pro:

- Free: basic ranking mode selector
- Pro: custom ranking weights per profile

### 3. Better result metadata and path intelligence

Add:

- optional second line under each result with tags / aliases / folder trail / modified date
- badges for PDF, Canvas, Base, starred, bookmarked, alias match, heading match
- show why a result matched: filename / alias / tag / property / content / heading

Why:

This improves trust and makes advanced features feel visible instead of hidden.

Free vs Pro:

- Free: badges + basic metadata line
- Pro: match-reason explanations and richer metadata rendering per profile

## Priority 2: Close the most important competitive gaps

### 4. External automation pack

Build on the existing URL scheme and global API.

Add:

- stable command API docs in README
- richer API methods: `runAction`, `listProfiles`, `runWorkflow`, `exportResults`
- optional local HTTP bridge plugin mode for desktop users only
- companion examples for Raycast, Keyboard Maestro, AutoHotkey, Alfred, browser extensions

Why:

Omnisearch users are explicitly asking for CLI/external access. Vault Spotlight is well positioned to own the automation niche because it already supports actions, not just search.

Monetization:

Strong Pro feature, especially for power users.

### 5. Attachment intelligence, but scoped

Do not attempt full Omnisearch parity immediately.

Instead ship a narrow, practical version:

- better PDF result previews
- search PDF filenames, aliases, and extracted text if available from Text Extractor / external helpers
- image/file handoff actions: reveal linked note, open source note, copy file link, open in system app
- explicit attachment badges and filtering operators (`ext:pdf`, `ext:canvas`, `kind:base`)

Why:

This captures the real demand without committing to maintaining a full OCR/indexing engine.

### 6. Workspace and session navigation pack

Add:

- workspace switching
- reopen saved working set / previous batch set
- session collections like "recently touched in last 24h", "notes opened this week", "current project cluster"

Why:

This is one of Quick Switcher++'s strongest areas and fits Vault Spotlight's launcher identity.

Free vs Pro:

- Free: workspace switcher
- Pro: saved working sets and session collections

## Priority 3: Improve discoverability and conversion

### 7. Guided onboarding and in-product education

Add:

- first-run interactive tour
- prefix cheat sheet with clickable examples
- sample workflows users can import with one click
- "unlock this with Pro" examples tied to actual use cases, not generic upsell copy

Why:

The plugin is already feature-rich enough that better onboarding may improve adoption faster than another major search mode.

### 8. Visual query builder lite

Do not turn the whole product into Vantage.

Add a lightweight builder for saved searches only:

- choose folder, tags, property, date window, file type, starred/bookmarked
- preview generated query string live
- save as alias / smart collection / workflow

Why:

This makes advanced queries accessible without changing the keyboard-first core UX.

Monetization:

Excellent Pro feature because it creates reusable workflows and collections.

## 7. Concrete build plan

### Phase 1: Highest ROI, lowest technical risk

1. Ranking controls
2. richer result metadata + match reasons
3. workflow presets on top of existing profiles/custom searches
4. onboarding/examples for profiles, aliases, action palette

Reason:

This uses existing architecture and immediately improves perceived power and conversion.

### Phase 2: Power-user moat

1. external automation pack
2. workspace/session navigation
3. saved working sets
4. action/API expansion

Reason:

This is where Vault Spotlight becomes a command center and separates from plain search plugins.

### Phase 3: Selective search-depth upgrades

1. better PDF/attachment handling
2. integration-based extracted text support
3. optional desktop-only local bridge / server

Reason:

This addresses Omnisearch pressure without chasing full search-engine complexity too early.

## 8. Recommended free / Pro packaging

Keep free generous enough to grow installs:

### Free

- file launcher
- commands
- symbols
- editors
- folders
- basic metadata filters
- workspace switcher
- badges / metadata line
- simple ranking mode toggle
- 2 example workflows

### Pro ($8 one-time still looks credible)

- content + headings + links power modes
- preview pane
- aliases, profiles, smart collections
- workflow presets unlimited
- action palette advanced actions
- batch organizer / MOC / export
- ranking weight customization
- session collections and saved working sets
- external automation pack
- visual query builder for saved searches
- advanced attachment handling

## 9. Important operational note

There is a go-to-market problem separate from product quality.

Community plugin stats currently show only 34 downloads for `vault-spotlight`, and public community stats appear to reflect only versions up to 1.4.0, while GitHub releases already go to 2.5.0.

Before adding too many more features, verify distribution visibility:

- community listing is indexing the current releases correctly
- manifest/release assets/community metadata are aligned
- README/store copy reflects the real current feature set
- screenshots/GIFs demonstrate the action-palette + workflow value clearly

If discoverability/distribution is broken, feature work alone will not move adoption.

## 10. Recommended next builds

If building immediately, I would start in this order:

1. ranking controls + match reasons
2. workflow presets with example templates
3. workspace/session navigation
4. lightweight saved-search builder
5. external automation pack

That sequence best strengthens differentiation, user demand fit, and monetizable value without turning Vault Spotlight into an Omnisearch clone.
