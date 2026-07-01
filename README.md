# Vault Spotlight

Spotlight-style vault launcher for [Obsidian](https://obsidian.md). Fuzzy file search, recent files, tag and property filters — with optional Pro features.

## Free features

- Fuzzy file name search with recent-file boosting and light typo tolerance
- Filter by tag (`#work`) and frontmatter (`@status:done`)
- **Command palette mode** — prefix query with `:` (or `Tab` to it) to search and run any Obsidian command
- Core **Bookmarks** surfaced in the browse view
- `Tab` cycles search modes; relative modified time in results
- Keyboard-first modal (`Ctrl+Shift+O`) with screen-reader (ARIA) support

## Pro features ($8 one-time)

- **Content search** — prefix query with `>` to search inside note bodies (multi-word = match all words on a line)
- **Ripgrep search** — faster content search when `rg` is installed
- **Heading jump** — jump straight to any heading across the vault
- **Preview pane** — live preview beside results, auto-scrolled to the matched passage
- **Search history** — recent searches resurface on the empty content view
- **Keyboard action palette** — press `Ctrl+K` on a result to search actions such as open, copy, rename, star, export, and batch tag
- **Smart collections** — saved searches appear in the browse view and can be pinned as reusable vault views
- **Starred pins** — pin files with `Ctrl+D`
- **Canvas & PDF** — search canvas files and show PDFs in results
- **Batch open** — multi-select with `Ctrl+Space`, open all at once
- **Export results** — copy selected/current results as Markdown links or export them to a new note
- **Batch actions** — add tags to selected Markdown notes from Spotlight
- **Custom search commands** — save queries as palette commands (`Ctrl+S` in spotlight)

Purchase: [Buy Me a Coffee — Vault Spotlight Pro](https://buymeacoffee.com/vaultspotlight)

License keys are verified **offline** (Ed25519). No account, server, or subscription.

## Privacy & data

Vault Spotlight never phones home. All state lives in the plugin's local `data.json`, which stores your settings plus usage data used for ranking: recent file paths, starred paths, per-file open counts (frecency), and recent search queries. These contain note paths and query text, so if you commit or share your `.obsidian` folder, that folder history is included. To keep it out, add `.obsidian/plugins/vault-spotlight/data.json` to your `.gitignore`.

## Install (manual)

1. Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/vault-spotlight/`
2. Enable **Vault Spotlight** in Settings → Community plugins
3. Open with `Ctrl+Shift+O` or the search ribbon icon

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