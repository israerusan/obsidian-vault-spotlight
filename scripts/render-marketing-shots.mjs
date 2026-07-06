import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildHarness } from '../tests/harness/build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const fixtureVault = path.join(repoRoot, 'tests', 'fixtures', 'vault');
const outDir = path.join(repoRoot, 'assets', 'marketing');
fs.mkdirSync(outDir, { recursive: true });

const harnessPath = await buildHarness();
const h = await import(pathToFileURL(harnessPath).href + `?t=${Date.now()}`);
const { loadVaultApp, SpotlightModal, makeStubPlugin, installWindow, uninstallWindow } = h;

function wait(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const voidTags = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);

function serializeNode(node) {
  if (!node) return '';
  const tag = String(node.tagName || 'div').toLowerCase();
  const attrs = [];
  const className = node.classList?.value || '';
  if (className) attrs.push(`class="${escapeHtml(className)}"`);
  if (node.id) attrs.push(`id="${escapeHtml(node.id)}"`);
  if (node.attributes?.entries) {
    for (const [key, raw] of node.attributes.entries()) {
      if (key === 'class' || key === 'id') continue;
      attrs.push(`${key}="${escapeHtml(raw)}"`);
    }
  }
  if ((tag === 'input' || tag === 'textarea') && node.value) attrs.push(`value="${escapeHtml(node.value)}"`);
  const open = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  if (voidTags.has(tag)) return open;
  const text = node._text ? escapeHtml(node._text) : '';
  const children = (node.childNodes || []).map(serializeNode).join('');
  return `${open}${text}${children}</${tag}>`;
}

function wrapPage(title, bodyHtml) {
  const styles = fs.readFileSync(path.join(repoRoot, 'styles.css'), 'utf8');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      --background-primary: #0f172a;
      --background-secondary: #172238;
      --background-modifier-border: #2b3a55;
      --background-modifier-hover: rgba(255, 255, 255, 0.06);
      --text-normal: #eef4ff;
      --text-muted: #a9bbd7;
      --text-faint: #7f94b5;
      --text-highlight-bg: rgba(139, 92, 246, 0.28);
      --interactive-accent: #8b5cf6;
      --text-on-accent: #ffffff;
      --color-blue: #60a5fa;
      --color-yellow: #facc15;
      --color-green: #4ade80;
      --font-ui-smaller: 12px;
      --font-ui-small: 13px;
      --font-ui-medium: 15px;
      --font-monospace: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at top right, #1f2b45 0%, #0b1220 50%, #09101c 100%);
      font-family: Inter, 'Segoe UI', Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .shot-shell {
      width: min(1220px, 95vw);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .shot-caption {
      color: #dce7f7;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .shot-panel {
      padding: 12px;
      border-radius: 26px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      box-shadow: 0 30px 80px rgba(2, 6, 23, 0.48);
    }
    .vault-spotlight-container {
      position: static !important;
      inset: auto !important;
      display: block !important;
      background: transparent !important;
      padding: 0 !important;
    }
    .vault-spotlight-container .modal-bg,
    .vault-spotlight-container .modal-close-button {
      display: none !important;
    }
    [data-icon]::before {
      content: attr(data-icon);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.2em;
      height: 1.2em;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.7;
    }
    ${styles}
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

async function renderSearchShot() {
  const { app } = loadVaultApp(fixtureVault);
  const plugin = makeStubPlugin(app, {
    isPro: true,
    showPreview: false,
    workflowPresets: [
      { id: 'wf-meetings', name: 'Meeting notes', query: 'meeting', mode: 'files', profileId: '', pinned: true, starter: true },
      { id: 'wf-followups', name: 'Follow-ups', query: 'launch', mode: 'content', profileId: '', pinned: false, starter: true },
    ],
    starredPaths: ['Projects/Roadmap.md'],
  });
  const modal = new SpotlightModal(app, plugin, 'la', 'files');
  modal.open();
  await wait(350);
  const html = wrapPage(
    'Vault Spotlight — Search',
    `<div class="shot-shell"><div class="shot-caption">Search + preview in the real Vault Spotlight UI</div><div class="shot-panel">${serializeNode(modal.containerEl)}</div></div>`
  );
  fs.writeFileSync(path.join(outDir, 'search-shot.html'), html, 'utf8');
  modal.close();
}

async function renderWorkflowShot() {
  const { app } = loadVaultApp(fixtureVault);
  const plugin = makeStubPlugin(app, {
    isPro: true,
    showPreview: false,
    workflowPresets: [
      { id: 'wf-review', name: 'Weekly review', query: 'launch', mode: 'content', profileId: '', pinned: true, starter: false },
      { id: 'wf-meetings', name: 'Meeting notes', query: 'meeting', mode: 'files', profileId: '', pinned: true, starter: true },
      { id: 'wf-roadmap', name: 'Roadmap', query: 'roadmap', mode: 'files', profileId: '', pinned: false, starter: false },
    ],
    searchProfiles: [
      { id: 'research', name: 'Research', defaultMode: 'files', defaultQuery: 'launch', includeCanvas: true, includePdf: true, includeBases: true, excludeFolders: [], showPreview: false },
    ],
  });
  const modal = new SpotlightModal(app, plugin, '', 'files');
  modal.open();
  await wait(350);
  const html = wrapPage(
    'Vault Spotlight — Workflows',
    `<div class="shot-shell"><div class="shot-caption">Browse mode with reusable workflows at the center</div><div class="shot-panel">${serializeNode(modal.containerEl)}</div></div>`
  );
  fs.writeFileSync(path.join(outDir, 'workflow-shot.html'), html, 'utf8');
  modal.close();
}

installWindow();
try {
  await renderSearchShot();
  await renderWorkflowShot();
  console.log('Rendered marketing shots to', outDir);
} finally {
  uninstallWindow();
}
