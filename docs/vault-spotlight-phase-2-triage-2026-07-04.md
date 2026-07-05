# Vault Spotlight Phase 2: Ruthless Product Triage

Date: 2026-07-04
Repo: `C:\Users\iavil\obsidian-vault-spotlight`
Version reviewed locally: 2.10.0
Verification basis: `npm test` passed, `npm run build` passed

## Executive summary

Vault Spotlight has already crossed the line from "interesting plugin" to "real product." The problem is not lack of capability. The problem is lack of hierarchy.

Phase 2 should not be a feature-expansion phase.
Phase 2 should be a product-consolidation phase.

The goal is to make Vault Spotlight feel inevitable:

> Find things fast, understand why they surfaced, and act on them without leaving the keyboard.

Everything that deepens that promise stays.
Everything that duplicates it, distracts from it, or forces users to learn your internal model gets merged, demoted, or cut.

---

## The product law for Phase 2

Every feature must answer yes to at least one of these:

1. Does it help the user find the right thing faster?
2. Does it help the user understand the result better?
3. Does it help the user do something useful immediately after finding it?

If the answer is no, the feature is either:
- presentation garnish,
- concept debt,
- or a side quest.

That does not always mean delete the code. It often means stop featuring it.

---

## Current product problem in one sentence

Vault Spotlight currently behaves like a command center, but markets itself like a bundle.

---

## Keep / Merge / Cut framework

## KEEP: core identity features

These are the product. Double down on them.

### 1. File launcher and keyboard-first navigation
Why keep:
- This is the entry point to everything.
- It is intuitive, high-frequency, and demo-friendly.
- It anchors the plugin in an immediately understandable job.

Phase 2 direction:
- Make this feel instantaneous and obvious.
- Keep browse state clean.
- Reduce hint noise after onboarding.

### 2. Action palette / "find then act"
Why keep:
- This is the real wedge.
- This is what makes the plugin feel closer to Raycast than to a search utility.
- This is the main reason a paid version can exist.

Phase 2 direction:
- Promote this in positioning and onboarding.
- Expand only actions that are high-frequency and reversible.
- Make action availability more legible than feature count.

### 3. Workflows
Why keep:
- Repeated intent is where paid value lives.
- Workflows are the cleanest bridge between search and action.
- They make the plugin sticky.

Phase 2 direction:
- Make workflows the primary saved object.
- Bring them forward in the browse view and README.
- Make one free workflow loop feel magical in under a minute.

### 4. Ranking controls + match reasons
Why keep:
- They increase trust.
- They explain behavior instead of asking users to infer it.
- They turn the plugin from "clever" into "controllable."

Phase 2 direction:
- Present these as confidence features, not advanced configuration.
- Default to sane presets, not raw tuning.

### 5. Content search and heading search
Why keep:
- These are high-value expansions of search depth.
- They are adjacent to the core promise.
- They are understandable and useful in demos.

Phase 2 direction:
- Keep semantics explicit.
- Continue emphasizing reliability over exotic syntax.
- Do not chase Omnisearch feature parity.

### 6. Quick capture and snippet insertion
Why keep:
- These fit the command-center thesis as "act immediately."
- They create delight and practical daily utility.
- They are monetizable without being hostile.

Phase 2 direction:
- Reposition them as quick actions, not equal product pillars.
- Keep them, but stop giving them equal narrative weight with search/workflows/actions.

---

## MERGE: overlapping concepts that should become one thing

These are not necessarily bad features. They are bad as separate user-facing concepts.

### 1. Workflow presets + custom searches + smart collections
Verdict: Merge into `Saved workflows`

Problem:
- These all represent saved retrieval intent.
- Users do not care why one saved query is a command, another is a collection, and another is a workflow.
- Multiple persistence concepts create cognitive friction and settings sprawl.

Phase 2 move:
- User-facing concept: `Saved workflows`
- Internal fields may include:
  - name
  - mode
  - query
  - pinned
  - profile
  - ranking mode
  - expose as command
  - browse visibility
- Existing custom searches become legacy workflows on migration.
- "Smart collection" becomes a display style of a saved workflow, not its own concept.

Positioning impact:
- Dramatically simpler story.
- Better monetization story.
- Easier onboarding.

### 2. Search profiles + workflow context
Verdict: Merge partially

Problem:
- Profiles are useful but abstract.
- Most users think in terms of jobs, not environment presets.
- A workflow that depends on a profile feels like two layers of indirection.

Phase 2 move:
- Keep profiles as advanced context templates.
- But present them as an optional property of a workflow, not as a peer concept.
- In UI copy: avoid presenting profiles early.
- In README: mention profiles only in advanced sections.

Positioning impact:
- Fewer concepts in the main pitch.
- Profiles become power-user depth instead of front-door clutter.

### 3. Calculator + date jump + capture + snippets
Verdict: Merge narratively into `Quick actions`

Problem:
- These are currently described like separate features.
- That inflates perceived complexity.
- The user experiences them as "things Spotlight can do instantly from the input bar."

Phase 2 move:
- Group these as `Quick actions` or `Inline actions`.
- They stay distinct in code, but not in positioning hierarchy.

Positioning impact:
- Simpler mental model.
- Cleaner README.
- Better screenshots/demos.

---

## CUT OR DEMOTE: things that should stop being first-class in the pitch

These are not necessarily code deletions. Many should remain implemented, but be demoted in copy, onboarding, and default UI prominence.

### 1. The plugin-as-kitchen-sink README style
Verdict: Cut

Problem:
- The current README reads like a thorough inventory, not a sharp sales page.
- It is accurate but not persuasive.
- It makes the plugin look harder to learn than it is.

Phase 2 move:
- Rewrite around 3 user journeys:
  1. Jump anywhere fast
  2. Reopen recurring work instantly
  3. Take action without leaving the keyboard
- Reduce long feature bullets on top.
- Push deep capability lists below the fold.

### 2. Equal billing for every mode
Verdict: Demote

Problem:
- Files, content, headings, links, editors, folders, snippets, capture, calculator, dates all compete for top-level attention.
- That dilutes the core story.

Phase 2 move:
- Top-level framing:
  - Search
  - Workflows
  - Actions
- Modes become implementation detail.

### 3. Legacy custom-search management as visible product surface
Verdict: Demote hard, then sunset

Problem:
- Legacy concepts create narrative drag.
- They force explanation of history the user does not care about.

Phase 2 move:
- Keep only as migration/compatibility layer.
- Hide from most users once migrated.
- Remove from pitch entirely.

### 4. Over-dense hints and onboarding copy
Verdict: Cut down

Problem:
- Too many hints creates UI anxiety.
- Heavy hinting signals complexity.

Phase 2 move:
- First-run: helpful and explicit.
- Post-onboarding: minimal, contextual, confidence-building.

### 5. Features that exist mainly because they are possible
Verdict: Apply hostile scrutiny

Examples to evaluate brutally:
- low-frequency integrations that do not deepen the main command-center loop
- specialized browse surfaces with low repeat value
- anything that adds a new noun to the product

Rule:
If a feature is cool but rarely demoed, rarely used, and hard to explain in one breath, it should not occupy premium mental real estate.

---

## Recommended Phase 2 product hierarchy

This is the hierarchy the plugin should present everywhere.

### Pillar 1: Search
- files
- content
- headings
- links
- ranking
- match reasons

Promise:
Find the right note, command, or vault object fast.

### Pillar 2: Workflows
- saved workflows
- pinned workflows
- recurring contexts
- optional advanced profile behavior

Promise:
Reopen repeated work instantly.

### Pillar 3: Actions
- action palette
- batch actions
- quick actions
- capture/snippets/calc/date as instant actions

Promise:
Do useful work immediately after search.

Everything else belongs under one of those pillars or gets demoted.

---

## Feature-by-feature verdict list

### Strong keep
- Fuzzy file launcher
- Command palette mode
- Heading jump
- Content search
- Action palette
- Workflow saving/running
- Ranking modes
- Match reasons
- Batch actions that are high-frequency and safe
- Quick capture
- Snippets
- URL scheme and API

### Keep but stop over-selling
- Folder mode
- Open editors mode
- Link browsing
- Calculator/converter
- Date jump
- Preview pane
- Canvas/PDF/Bases support

### Merge into broader concepts
- Custom searches -> Saved workflows
- Smart collections -> Saved workflows
- Search profiles -> advanced workflow context
- Capture/snippets/calc/date -> Quick actions

### Demote from top-level marketing
- Detailed trigger/prefix taxonomy
- Low-frequency integrations
- Legacy command-registration story for old saved searches
- Any feature whose main value is "also supports X file type" unless it is core to conversion

### Sunset candidates if maintenance cost grows
- Any integration-specific action with tiny usage and non-trivial support burden
- Any mode that adds complexity but weakens the main browse/search/action flow
- Any feature that can only be explained after 3 other concepts are explained first

---

## The one thing to kill first

Kill the idea that Vault Spotlight must explain itself through completeness.

That instinct is making the product feel bigger than it feels useful.

You do not need to sound comprehensive.
You need to sound inevitable.

---

## Recommended README structure for Phase 2

# Vault Spotlight
One-line pitch:
A Raycast-style command center for Obsidian: find notes fast, reopen recurring workflows, and act on results without leaving the keyboard.

## Why people install it
Three short user journeys:
1. Jump to the right note instantly
2. Reopen repeated work in one keystroke
3. Take action from search results

## Core capabilities
- Search
- Saved workflows
- Actions

## Quick actions
- capture
- snippets
- calculator
- date jump

## Free vs Pro
Short, clear, honest

## Advanced capabilities
- profiles
- aliases
- integrations
- API
- file-type expansion

## Install
## Activate Pro
## Privacy
## Automation/API

That structure is much sharper than the current catalog-first approach.

---

## Homepage / community listing positioning

### Best headline direction
Option A:
- Your vault’s command center

Option B:
- Find it. Understand it. Act on it.

Option C:
- Raycast for Obsidian workflows

### Best short description direction
- Keyboard-first launcher for Obsidian with saved workflows, result actions, and fast search.

or

- Search your vault, reopen recurring work, and act on results without leaving the keyboard.

### Positioning to avoid
Avoid leading with:
- calculators
- converters
- snippets
- file-type support breadth
- number of modes
- operator syntax depth

Those are supporting details, not the reason to care.

---

## Monetization direction

Current shape is good:
- free core
- low one-time Pro
- offline activation

Phase 2 monetization rule:
Charge for repeated leverage, not basic competence.

That means:
- Keep core search generous.
- Charge for workflow scale, richer action power, advanced saved intent, and higher-order convenience.
- Do not paywall basic file operations users perceive as table stakes.

Best paid story:
Pro is not "more search."
Pro is "Spotlight becomes your reusable work cockpit."

---

## Recommended Phase 2 implementation order

### Step 1: Messaging cleanup
- Rewrite README around Search / Workflows / Actions
- Align all free/pro copy
- Remove or demote old concept language

### Step 2: Product-surface cleanup
- Present workflows as the main saved object
- Push profiles deeper into advanced UI
- Group quick actions together in copy and onboarding

### Step 3: Settings cleanup
- Reorganize settings into smaller sections:
  - General
  - Search
  - Workflows
  - Actions
  - Advanced
  - License
- Hide legacy concepts unless data exists

### Step 4: Modal hierarchy cleanup
- Reduce hint density after first-run
- Make workflow/action affordances more obvious than niche modes
- Make the browse surface feel like a work dashboard, not a feature sampler

### Step 5: Codebase cleanup in support of the product
- Continue extracting stateful subsystems from `SpotlightModal.ts`
- Convert remaining overlapping saved-search paths into unified workflow plumbing
- Treat legacy custom searches as migration compatibility, not active architecture

---

## Ruthless rules for future roadmap decisions

Before shipping a new feature, ask:

1. Is this a new capability or just a new noun?
2. Does it strengthen Search, Workflows, or Actions?
3. Can I explain it in one sentence without using internal vocabulary?
4. Will users discover it naturally, or will it become one more hidden power feature?
5. Does it improve the paid story without making the free tier feel crippled?

If the answers are weak, do not ship it yet.

---

## Final recommendation

Phase 2 should not be "add more." It should be:

- compress the concept model
- sharpen the hierarchy
- make workflows the center of gravity
- make actions the emotional hook
- make search the trusted entry point

In short:

Vault Spotlight should feel like one great product with depth,
not five good products sharing a modal.
