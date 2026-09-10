// [AUNEA-UAT-BLOCK-INDEX-010] START — Repo-wide Block_ID / CODE_BLOCK_INDEX.md audit
// PURPOSE: Scan the full vigent runtime (frontend JS/CSS/HTML, frontend tests, backend Python, build/launcher configs, CI workflows) for [AUNEA-...] START/END markers and cross-check them against CODE_BLOCK_INDEX.md, catching unbalanced markers, cross-file duplicate IDs, unindexed code IDs and orphaned index rows.
// SOURCE: CODE_CONVENTIONS.md §5-7; PROJECT_RULES.md Rule 11.
// INPUTS: 3_SYSTEM/frontend/*.js + styles.css + index.html + tests/*.test.cjs; 3_SYSTEM/backend/aunea_backend/*.py + Dockerfile + pyproject.toml; .github/workflows/*.yml; CODE_BLOCK_INDEX.md.
// OUTPUTS: pass/fail assertions with file+line diagnostics.
// SIDE_EFFECTS: none (read-only).
// CHANGE_RISK: HIGH.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendDir, '..', '..');
const backendPkgDir = path.join(repoRoot, '3_SYSTEM', 'backend', 'aunea_backend');
const backendDir = path.join(repoRoot, '3_SYSTEM', 'backend');
const indexPath = path.join(repoRoot, 'CODE_BLOCK_INDEX.md');

const MARKER_RE = /\[(AUNEA-[A-Z0-9-]+)\]\s*(START|END)/g;

function listScanFiles() {
  const files = [];
  for (const f of fs.readdirSync(frontendDir)) {
    if (f.endsWith('.js') && fs.statSync(path.join(frontendDir, f)).isFile()) files.push(path.join(frontendDir, f));
  }
  files.push(path.join(frontendDir, 'styles.css'));
  files.push(path.join(frontendDir, 'index.html'));
  const testsDir = path.join(frontendDir, 'tests');
  for (const f of fs.readdirSync(testsDir)) {
    if (f.endsWith('.test.cjs')) files.push(path.join(testsDir, f));
  }
  for (const f of fs.readdirSync(backendPkgDir)) {
    if (f.endsWith('.py')) files.push(path.join(backendPkgDir, f));
  }
  files.push(path.join(backendDir, 'Dockerfile'));
  files.push(path.join(backendDir, 'pyproject.toml'));
  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  if (fs.existsSync(workflowsDir)) {
    for (const f of fs.readdirSync(workflowsDir)) {
      if (f.endsWith('.yml') || f.endsWith('.yaml')) files.push(path.join(workflowsDir, f));
    }
  }
  return files.filter(f => fs.existsSync(f));
}

// Returns { balanced: [{id,file}], errors: [message,...] }
function scanFile(filePath) {
  const rel = path.relative(repoRoot, filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const stack = [];
  const balanced = [];
  const errors = [];
  let m;
  MARKER_RE.lastIndex = 0;
  while ((m = MARKER_RE.exec(text))) {
    const id = m[1];
    const kind = m[2];
    const lineNo = text.slice(0, m.index).split('\n').length;
    if (kind === 'START') {
      stack.push({ id, lineNo });
    } else {
      const top = stack.pop();
      if (!top) {
        errors.push(`${rel}:${lineNo} — END without matching START for ${id}`);
      } else if (top.id !== id) {
        errors.push(`${rel}:${lineNo} — END ${id} does not match innermost open START ${top.id} (opened at line ${top.lineNo})`);
      } else {
        balanced.push({ id, file: rel });
      }
    }
  }
  for (const leftover of stack) {
    errors.push(`${rel}:${leftover.lineNo} — START ${leftover.id} has no matching END`);
  }
  return { balanced, errors };
}

function parseIndex() {
  const text = fs.readFileSync(indexPath, 'utf8');
  const activeRows = new Map(); // id -> file
  const retiredIds = new Set();
  const lines = text.split('\n');
  let inRetiredSection = false;
  for (const line of lines) {
    if (/^##\s*Retired Block_IDs/i.test(line)) { inRetiredSection = true; continue; }
    if (/^##\s/.test(line) && inRetiredSection) { inRetiredSection = false; }
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));
    if (cells.length < 2) continue;
    if (/^Block_ID$/i.test(cells[0]) || /^---/.test(cells[0])) continue;
    if (inRetiredSection) {
      cells[0].split('/').map(s => s.trim()).forEach(id => { if (/^AUNEA-/.test(id)) retiredIds.add(id); });
      continue;
    }
    const ids = cells[0].split('/').map(s => s.trim());
    const file = cells[1] || '';
    for (const id of ids) {
      if (/^AUNEA-/.test(id)) activeRows.set(id, file);
    }
  }
  return { activeRows, retiredIds };
}

test('block-id-audit: every marker in the vigent runtime is balanced', () => {
  const allErrors = [];
  for (const f of listScanFiles()) {
    const { errors } = scanFile(f);
    allErrors.push(...errors);
  }
  assert.deepEqual(allErrors, [], `Unbalanced Block_ID markers found:\n${allErrors.join('\n')}`);
});

test('block-id-audit: no Block_ID has its START in more than one file', () => {
  const firstFileById = new Map();
  const dupErrors = [];
  for (const f of listScanFiles()) {
    const { balanced } = scanFile(f);
    for (const { id, file } of balanced) {
      if (!firstFileById.has(id)) firstFileById.set(id, file);
      else if (firstFileById.get(id) !== file) dupErrors.push(`${id} has START markers in both ${firstFileById.get(id)} and ${file}`);
    }
  }
  assert.deepEqual(dupErrors, [], `Cross-file duplicate Block_IDs:\n${dupErrors.join('\n')}`);
});

test('block-id-audit: every live code Block_ID is present in CODE_BLOCK_INDEX.md', () => {
  const { activeRows, retiredIds } = parseIndex();
  const codeIds = new Set();
  for (const f of listScanFiles()) {
    const { balanced } = scanFile(f);
    for (const { id } of balanced) codeIds.add(id);
  }
  const missing = [...codeIds].filter(id => !activeRows.has(id) && !retiredIds.has(id));
  assert.deepEqual(missing, [], `Block_IDs present in code but not indexed in CODE_BLOCK_INDEX.md:\n${missing.join('\n')}`);
});

test('block-id-audit: every active CODE_BLOCK_INDEX.md row has a matching code marker', () => {
  const { activeRows } = parseIndex();
  const codeFilesById = new Map();
  for (const f of listScanFiles()) {
    const { balanced } = scanFile(f);
    for (const { id, file } of balanced) {
      if (!codeFilesById.has(id)) codeFilesById.set(id, new Set());
      codeFilesById.get(id).add(file);
    }
  }
  const orphaned = [];
  const driftedFile = [];
  for (const [id, indexedFile] of activeRows) {
    const foundFiles = codeFilesById.get(id);
    if (!foundFiles || foundFiles.size === 0) { orphaned.push(id); continue; }
    if (indexedFile && ![...foundFiles].some(f => indexedFile.includes(f) || f.includes(indexedFile))) {
      driftedFile.push(`${id}: index says "${indexedFile}", code found in [${[...foundFiles].join(', ')}]`);
    }
  }
  assert.deepEqual(orphaned, [], `CODE_BLOCK_INDEX.md rows with no matching code marker (retire them explicitly if intentional):\n${orphaned.join('\n')}`);
  assert.deepEqual(driftedFile, [], `CODE_BLOCK_INDEX.md "Archivo" column drift:\n${driftedFile.join('\n')}`);
});
// [AUNEA-UAT-BLOCK-INDEX-010] END
