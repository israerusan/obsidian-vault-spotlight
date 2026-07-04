# Vault Spotlight

Spotlight-style vault launcher for [Obsidian](https://obsidian.md). Open notes, run commands, filter by metadata, and turn repeated searches into reusable workflows — all from a keyboard-first modal.

## What it does

Vault Spotlight is a fast command center for large vaults: type a few letters to jump to notes, search by tags/properties, run commands, reopen recent work, and use Pro tools for content search, saved collections, workflow presets, ranking controls, result export, and batch actions.

## New: the launcher that also *does* things

Most Obsidian switchers stop at finding notes. Vault Spotlight now brings the Raycast/Alfred "delight layer" into your vault — the quick actions you'd otherwise leave Obsidian for:

- **Inline calculator & converter (Free)** — type `1234*0.19`, `20% of 250`, `10 km to mi`, `72f to c`, or `40 USD to EUR` right in the search bar; the answer appears on top, press `Enter` to copy or `Shift+Enter` to insert it at your cursor. Currency uses offline rates you control — no network, ever.
- **Natural-language date jump (Free)** — type `today`, `tomorrow`, `next friday`, `in 3 weeks`, or `2026-07-24` to open (or create) that day's daily note. Honors your Daily Notes / Periodic Notes settings.
- **Quick capture (Free)** — press `+`, jot a thought, and `Enter` appends it to today's daily note *without opening it*. Pro adds an inbox target, prepend, and append-under-a-heading placement.
- **Snippet insertion (Pro)** — press `;` to fuzzy-find reusable snippets and insert them at the cursor, with `{{date}}`, `{{time}}`, `{{clipboard}}`, `{{selection}}`, and `{{cursor}}` placeholders.

## Paid-workflow layer

- Browse mode can surface reusable workflow presets before you type.
- Search profiles and workflow presets can work together, so a workflow can reopen a saved context and query in one step.
- Ranking is now configurable, with optional match-reason badges so users can understand why a result surfaced.
- Result rows carry richer metadata such as alias/tag signals and decorated badges.
- Settings now make the free vs Pro packaging more explicit for workflows, ranking, and reusable search tools.

## Free features

- **Inline calculator & converter** — evaluate math, percentages, unit conversions, temperatures, and offline currency right in the query bar; `Enter` copies the answer, `Shift+Enter` inserts it at the cursor.
- **Natural-language date jump** — open or create a daily note by typing `today`, `next friday`, `in 3 weeks`, or an ISO date.
- **Quick capture** — press the capture trigger (`+`), type a thought, and `Enter` appends it to today's daily note without opening it.
- **Fast fuzzy file launcher** — find notes by partial names, initials, or light typos, with recent files and open editors boosted automatically.
- **Tag and property filters** — narrow results with queries like `#work`, `@status:done`, or a filename plus metadata filters.
- **Command palette mode** — prefix with `:` or press `Tab` / `Shift+Tab` to cycle modes and search commands; recently run commands resurface on an empty query.
- **Symbol outline mode** — prefix with `$` to jump to headings, links, tags, embeds, and block ids in the active note.
- **Open editors mode** — prefix with `=` to switch between open tabs and panes, most-recently-used first.
- **Folder mode** — prefix with `/` to find a folder, then press Enter to browse its files (folders with spaces work via `in:"My Folder"`).
- **Drill into results** — arrow onto any file result, then press `$` for its outline or `~` for its links without opening it; Escape returns.
- **Open shortcuts** — `Cmd/Ctrl+Enter` new tab, `Cmd/Ctrl+Alt+Enter` split, `Shift+Enter` create note from the query, `Alt+Enter` context menu; optional open-in-new-tab default.
- **Switch to last file** — a command that flips between your two most recent files, ready for a hotkey.
- **Customizable triggers** — every mode prefix is configurable, and an escape character (`!`) searches trigger characters literally.
- **Bookmarks in browse view** — core Bookmarks appear alongside recent files so important notes are available before typing.
- **Keyboard-first navigation** — open from the ribbon icon or bind a hotkey to *Open spotlight*, cycle modes with `Tab` / `Shift+Tab`, navigate with arrows, and open with Enter. A trigger cheatsheet inside the modal keeps every mode prefix discoverable.
- **Accessible result list** — ARIA combobox/listbox attributes and visible modified-time labels keep the modal usable and readable.
- **Free starter experience** — browse hints and settings copy explain how to discover triggers, profiles, and paid workflow upgrades without leaving the modal.

## Pro features ($8 one-time)

- **Snippet insertion** — prefix with `;` to fuzzy-find reusable text snippets and insert them at the cursor, resolving `{{date}}`, `{{time}}`, `{{clipboard}}`, `{{selection}}`, and `{{cursor}}` placeholders.
- **Capture targets** — add an inbox note, choose prepend vs append, and append captures beneath a specific heading.
- **Content search** — prefix with `>` to search inside note bodies; multi-word queries require every word on the matching line. Without ripgrep, the built-in index runs in a background web worker, so typing stays smooth even on very large vaults.
- **Ripgrep acceleration** — use `rg` when available for faster full-vault content search, with safe fallback to the built-in vault index. Common install locations (winget, scoop, chocolatey, Homebrew, VS Code's bundled rg) are auto-detected when `rg` isn't on your PATH.
- **Heading jump** — search headings across the vault (`^` prefix) and open directly at the matching section; scope with `file#heading` and filter depth with `level:1-2`.
- **Live preview pane** — show rendered Markdown beside results and auto-scroll to the matched heading or passage.
- **Search history** — recently used content searches resurface so repeated research queries are one Enter away.
- **Keyboard action palette** — press `Cmd/Ctrl+K` on a result to search actions like open, copy link/path, rename, star, export, or batch tag.
- **Search profiles** — save workspace-style modes for writing, research, clients, PDFs, or any repeated vault context.
- **Workflow presets** — save a mode + query + optional profile combination and reopen it directly from Browse.
- **Starter workflows** — seed the workflow list with reusable defaults like recent work, follow-ups, and meetings.
- **Ranking controls** — choose balanced, filename-first, recency-first, metadata-first, or alias-aware ranking from settings.
- **Match-reason badges** — show why a result ranked well, including alias hits, starred boosts, and metadata signals.
- **Advanced query language** — combine quoted phrases, exclusions, `in:folder`, `name:`, `path:`, `modified:7d`, `created:30d`, and `is:starred` filters.
- **Search aliases** — define personal shortcuts such as `crm = in:Clients @type:client` for repeated vault queries.
- **Links mode** — browse backlinks to the active/matching note or prefix with `->` to inspect outlinks.
- **Frontmatter alias matching** — note `alias`/`aliases` values participate in file search so alternate names work naturally.
- **Omnisearch/Text Extractor handoff** — when those plugins are installed, Pro actions can hand off to their search/extraction commands.
- **Bases Power Pack handoff** — with [Bases Power Pack](https://github.com/israerusan/bases-power-pack) 1.2.0+ installed, `Cmd/Ctrl+K` on a `.base` result offers "Open in Kanban/Calendar/Gantt view".
- **Smart collections** — saved searches become reusable vault views in the browse screen; pin the ones you use daily.
- **Starred pins** — press `Cmd/Ctrl+D` to keep high-value files at the top of browse and search results.
- **Canvas & PDF discovery** — include Canvas files and PDFs in file search, plus text search inside Canvas nodes.
- **Bases discovery** — include Bases (`.base`) in file search and open them straight into their database view; content search also looks inside base view/filter definitions, so `> status active` finds the base that queries it.
- **Batch open** — select multiple results with `Cmd/Ctrl+Space` and open the whole working set at once.
- **Export results** — copy selected/current results as Markdown links or create a search-results note for handoff and review.
- **Batch actions** — apply actions such as adding a tag to selected Markdown notes directly from Spotlight.
- **Batch organizer** — move files, star/unstar results, remove tags, and set frontmatter properties across selected notes.
- **MOC builder** — turn selected/current results into a grouped map-of-content note or append links to the active note.
- **Custom search commands** — save a useful query with `Cmd/Ctrl+S` and run it later from the command palette.

### Advanced query examples

```text
"launch plan" -archive in:Projects modified:7d
name:roadmap tag:client prop:status=active
is:starred ext:md
-> roadmap
crm waiting
```

Purchase: [Buy Me a Coffee — Vault Spotlight Pro](https://buymeacoffee.com/vaultspotlight)

License keys are verified **offline** (Ed25519). No account, server, or subscription.

## Free vs Pro at a glance

| Area | Free | Pro |
| --- | --- | --- |
| File launcher, commands, symbols, editors, folders | Yes | Yes |
| Inline calculator, converters, currency | Yes | Yes |
| Natural-language date jump to daily notes | Yes | Yes |
| Quick capture to daily note | Yes | Yes |
| Capture to inbox / under a heading | No | Yes |
| Snippet insertion with placeholders | No | Yes |
| Metadata filters in file search | Yes | Yes |
| Browse hints and trigger discoverability | Yes | Yes |
| Body content search (`>`) | No | Yes |
| Heading search across the vault (`^`) | No | Yes |
| Search profiles | No | Yes |
| Workflow presets | 2 | Unlimited |
| Starter workflow presets | No | Yes |
| Ranking controls and match-reason badges | No | Yes |
| Smart collections / saved searches | No | Yes |
| Batch open / export / organizer actions | No | Yes |
| Canvas / PDF / Bases expansion | Limited | Yes |
| Offline license verification | n/a | Yes |

## Automation & API

Other plugins, scripts, and external tools can build on Vault Spotlight:

- **URL scheme** — `obsidian://vault-spotlight?vault=YourVault&query=launch%20plan&mode=content` opens the modal with a prefilled query and mode (`files`, `content`, `headings`, `symbols`, `commands`, `links`, `editors`, `folders`).
- **Global API** — `globalThis.vaultSpotlight` exposes:
  - `open(query?, mode?)` — open the modal programmatically.
  - `search(query)` — Promise of content-search results (`{ path, basename, line, snippet, score, engine }`). Pro license required; resolves `[]` on the free tier.
  - `isProActive()` — whether a Pro license is active.

## Privacy & data

Vault Spotlight never phones home. All state lives in the plugin's local `data.json`, which stores your settings plus usage data used for ranking: recent file paths, starred paths, per-file open counts (frecency), and recent search queries. These contain note paths and query text, so if you commit or share your `.obsidian` folder, that folder history is included. To keep it out, add `.obsidian/plugins/vault-spotlight/data.json` to your `.gitignore`.

## Install (manual)

1. Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/vault-spotlight/`
2. Enable **Vault Spotlight** in Settings → Community plugins
3. Open with the search ribbon icon, or bind a hotkey to *Open spotlight* (no default hotkey is set, per Obsidian plugin guidelines)

## Install (community directory)

Search **Vault Spotlight** in Obsidian Settings → Community plugins after submission is approved.

## Activate Pro

1. Purchase on [Buy Me a Coffee](https://buymeacoffee.com/vaultspotlight)
2. You will receive a license key by email (usually within 24 hours)
3. Open Obsidian → Settings → Vault Spotlight
4. Paste your license key — Pro unlocks immediately (offline verification)
5. Use the new Workflow presets and Ranking sections in settings to configure your paid workflow layer

## Development

```bash
npm install
npm run build
npm test
```

## Pricing label

Listed as **Optional payments** in the Obsidian Community directory (free core + paid Pro unlock).

## Author

Built for the Obsidian community. Issues and feature requests welcome on GitHub.