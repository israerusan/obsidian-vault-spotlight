# Vault Spotlight

Spotlight-style vault launcher for [Obsidian](https://obsidian.md). Fuzzy file search, recent files, tag and property filters — with optional Pro features.

## Free features

- Fuzzy file name search with recent-file boosting
- Filter by tag (`#work`) and frontmatter (`@status:done`)
- Relative modified time in results
- Keyboard-first modal (`Ctrl+Shift+O`)

## Pro features ($8 one-time)

- **Content search** — prefix query with `>` to search inside note bodies
- **Batch open** — multi-select with `Ctrl+Space`, open all at once
- **Custom search commands** — save queries as palette commands (`Ctrl+S` in spotlight)

Purchase: [Gumroad — Vault Spotlight Pro](https://ivala6.gumroad.com/l/vault-spotlight)

License keys are verified **offline** (Ed25519). No account, server, or subscription.

## Install (manual)

1. Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/vault-spotlight/`
2. Enable **Vault Spotlight** in Settings → Community plugins
3. Open with `Ctrl+Shift+O` or the search ribbon icon

## Install (community directory)

Search **Vault Spotlight** in Obsidian Settings → Community plugins after submission is approved.

## Activate Pro

1. Settings → Vault Spotlight
2. Paste your license key from Gumroad
3. Pro unlocks immediately (offline verification)

## Development

```bash
npm install
npm run build
npm test
npm run license:generate -- customer@email.com
```

## Pricing label

Listed as **Optional payments** in the Obsidian Community directory (free core + paid Pro unlock).

## Author

Built for the Obsidian community. Issues and feature requests welcome on GitHub.