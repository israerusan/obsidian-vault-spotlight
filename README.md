# Vault Spotlight

Spotlight-style vault launcher for [Obsidian](https://obsidian.md). Open notes, run commands, filter by metadata, and turn repeated searches into reusable Pro workflows — all from a keyboard-first modal.

## What it does

Vault Spotlight is a fast command center for large vaults: type a few letters to jump to notes, search by tags/properties, run commands, reopen recent work, and use Pro tools for content search, saved collections, result export, and batch actions.

## Free features

- **Fast fuzzy file launcher** — find notes by partial names, initials, or light typos, with recent files and open editors boosted automatically.
- **Tag and property filters** — narrow results with queries like `#work`, `@status:done`, or a filename plus metadata filters.
- **Command palette mode** — prefix with `:` or press `Tab` to search and run commands; recently run commands resurface on an empty query.
- **Symbol outline mode** — prefix with `$` to jump to headings, links, tags, embeds, and block ids in the active note.
- **Open editors mode** — prefix with `=` to switch between open tabs and panes, most-recently-used first.
- **Folder mode** — prefix with `/` to find a folder, then press Enter to browse its files (folders with spaces work via `in:"My Folder"`).
- **Drill into results** — arrow onto any file result, then press `$` for its outline or `~` for its links without opening it; Escape returns.
- **Open shortcuts** — `Ctrl+Enter` new tab, `Ctrl+Alt+Enter` split, `Shift+Enter` create note from the query, `Alt+Enter` context menu; optional open-in-new-tab default.
- **Switch to last file** — a command that flips between your two most recent files, ready for a hotkey.
- **Customizable triggers** — every mode prefix is configurable, and an escape character (`!`) searches trigger characters literally.
- **Bookmarks in browse view** — core Bookmarks appear alongside recent files so important notes are available before typing.
- **Keyboard-first navigation** — open from the ribbon icon or bind a hotkey to *Open spotlight*, cycle modes with `Tab`, navigate with arrows, and open with Enter. A trigger cheatsheet inside the modal keeps every mode prefix discoverable.
- **Accessible result list** — ARIA combobox/listbox attributes and visible modified-time labels keep the modal usable and readable.

## Pro features ($8 one-time)

- **Content search** — prefix with `>` to search inside note bodies; multi-word queries require every word on the matching line.
- **Ripgrep acceleration** — use `rg` when available for faster full-vault content search, with safe fallback to the built-in vault index. Common install locations (winget, scoop, chocolatey, Homebrew, VS Code's bundled rg) are auto-detected when `rg` isn't on your PATH.
- **Heading jump** — search headings across the vault (`^` prefix) and open directly at the matching section; scope with `file#heading` and filter depth with `level:1-2`.
- **Live preview pane** — show rendered Markdown beside results and auto-scroll to the matched heading or passage.
- **Search history** — recently used content searches resurface so repeated research queries are one Enter away.
- **Keyboard action palette** — press `Ctrl+K` on a result to search actions like open, copy link/path, rename, star, export, or batch tag.
- **Search profiles** — save workspace-style modes for writing, research, clients, PDFs, or any repeated vault context.
- **Advanced query language** — combine quoted phrases, exclusions, `in:folder`, `name:`, `path:`, `modified:7d`, `created:30d`, and `is:starred` filters.
- **Search aliases** — define personal shortcuts such as `crm = in:Clients @type:client` for repeated vault queries.
- **Links mode** — browse backlinks to the active/matching note or prefix with `->` to inspect outlinks.
- **Frontmatter alias matching** — note `alias`/`aliases` values participate in file search so alternate names work naturally.
- **Omnisearch/Text Extractor handoff** — when those plugins are installed, Pro actions can hand off to their search/extraction commands.
- **Smart collections** — saved searches become reusable vault views in the browse screen; pin the ones you use daily.
- **Starred pins** — press `Ctrl+D` to keep high-value files at the top of browse and search results.
- **Canvas & PDF discovery** — include Canvas files and PDFs in file search, plus text search inside Canvas nodes.
- **Batch open** — select multiple results with `Ctrl+Space` and open the whole working set at once.
- **Export results** — copy selected/current results as Markdown links or create a search-results note for handoff and review.
- **Batch actions** — apply actions such as adding a tag to selected Markdown notes directly from Spotlight.
- **Batch organizer** — move files, star/unstar results, remove tags, and set frontmatter properties across selected notes.
- **MOC builder** — turn selected/current results into a grouped map-of-content note or append links to the active note.
- **Custom search commands** — save a useful query with `Ctrl+S` and run it later from the command palette.

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