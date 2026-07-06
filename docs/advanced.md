# Advanced capabilities & automation

Power-user depth for [Vault Spotlight](../README.md). None of this is required to
get value from the plugin — the three core jobs (Search / Workflows / Actions)
stand on their own.

[← Back to README](../README.md)

## Advanced query language

Combine quoted phrases, exclusions, filters, and Boolean `OR` in file and content
search (Pro):

```text
"launch plan" -archive in:Projects modified:7d
name:roadmap tag:client prop:status=active
#waiting OR #followup
is:starred ext:md
```

`OR` must be uppercase and unquoted (`a OR b` = "either"); a lowercase `or` or a
quoted `"OR"` stays a literal search term. `OR` is honored consistently across the
file, content, and ripgrep engines.

## Search aliases (Pro)

Personal shortcuts like `crm = in:Clients @type:client` that expand before search.

## Workflow scope (Pro)

A saved workflow can carry an optional **scope** — file-type toggles (Canvas / PDF
/ Bases), excluded folders, and a preview preference — that is restored when you
run it. This replaces the old standalone "search profiles" concept: it is now just
optional depth on a workflow, not a separate front-door object.

## Ripgrep acceleration (Pro)

Uses `rg` when available for faster full-vault content search, with a seamless
fallback to the built-in index (which runs off the main thread on large vaults).
Common install locations (winget, scoop, chocolatey, Homebrew, VS Code's bundled
`rg`) are auto-detected.

## Canvas, PDF & Bases (Pro)

Include Canvas files and PDFs in file search, search text inside Canvas nodes, and
search Bases (`.base`) view/filter definitions; `> status active` finds the base
that queries it.

## Integrations (Pro)

Hand off to Omnisearch / Text Extractor when installed; with
[Bases Power Pack](https://github.com/israerusan/bases-power-pack) 1.2.0+,
`Cmd/Ctrl+K` on a `.base` result offers "Open in Kanban/Calendar/Gantt view".

## Customizable triggers

Every mode prefix is configurable, with an escape character (`!`) to search
trigger characters literally.

## URL scheme

`obsidian://vault-spotlight?vault=YourVault&query=launch%20plan&mode=content`
opens the modal with a prefilled query and mode (`files`, `content`, `headings`,
`symbols`, `commands`, `links`, `editors`, `folders`).

## Global API

`globalThis.vaultSpotlight` exposes:

- `open(query?, mode?)`
- `search(query)` — Promise of `{ path, basename, line, snippet, score, engine }`
  (Pro-gated; resolves `[]` on free)
- `isProActive()`
