// [AUNEA-UAT-MODULE-MANIFEST-010] START — Layered module manifest / load-order contract
// PURPOSE: Keep index.html and the on-disk layered runtime in agreement with module-manifest.json, so a
//          module cannot be added, moved or reordered without the load-order contract being updated too.
// SOURCE: PROJECT_RULES.md v1.5; CODE_CONVENTIONS.md §4 (a responsibility keeps its Block_ID when moved).
// INPUTS: module-manifest.json; index.html; the frontend tree.
// OUTPUTS: pass/fail assertions.
// SIDE_EFFECTS: none (read-only).
// CHANGE_RISK: HIGH.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'module-manifest.json'), 'utf8'));
const modules = manifest.modules;
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const LAYERS = new Set(['core', 'services', 'domain', 'ui', 'pages', 'uat', 'boot']);

test('every module declared in the manifest exists on disk', () => {
  const missing = modules.filter(m => !fs.existsSync(path.join(root, m.path))).map(m => m.path);
  assert.deepEqual(missing, [], `manifest declares modules that do not exist:\n${missing.join('\n')}`);
});

test('every runtime .js on disk is declared in the manifest', () => {
  const declared = new Set(modules.map(m => m.path));
  const found = [];
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'tests', 'data'].includes(entry.name)) continue;
      const next = path.join(dir, entry.name);
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(next, nextRel);
      else if (entry.name.endsWith('.js')) found.push(nextRel);
    }
  })(root, '');
  const undeclared = found.filter(f => !declared.has(f));
  assert.deepEqual(undeclared, [], `runtime modules missing from module-manifest.json:\n${undeclared.join('\n')}`);
});

test('index.html loads exactly the manifest modules, in the declared order', () => {
  const loaded = [...indexHtml.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(loaded, modules.map(m => m.path),
    'index.html script order must match module-manifest.json exactly — load order is a contract, not a detail');
});

test('every module is deferred so the shared global scope is populated in order', () => {
  const tags = [...indexHtml.matchAll(/<script src="[^"]+"([^>]*)>/g)].map(m => m[1]);
  const notDeferred = tags.filter(attrs => !/\bdefer\b/.test(attrs));
  assert.equal(notDeferred.length, 0, 'every runtime script must be deferred');
});

test('each module declares a known layer and carries its Block_ID marker', () => {
  const problems = [];
  for (const m of modules) {
    if (!LAYERS.has(m.layer)) problems.push(`${m.path}: unknown layer "${m.layer}"`);
    const code = fs.readFileSync(path.join(root, m.path), 'utf8');
    if (!code.includes(`[${m.block_id}] START`)) problems.push(`${m.path}: missing START marker for ${m.block_id}`);
    if (!code.includes(`[${m.block_id}] END`)) problems.push(`${m.path}: missing END marker for ${m.block_id}`);
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('module filenames carry no version suffix', () => {
  // DEC-043: versions live in the release manifest, not in identifiers. A "-v1" in a filename is the
  // start of the v1/v2/v3 accumulation the release rules exist to prevent.
  const versioned = modules.map(m => m.path).filter(p => /-v\d+(\.\d+)*\.js$/.test(p));
  assert.deepEqual(versioned, [], `module filenames must not encode a version:\n${versioned.join('\n')}`);
});

test('manifest order values are contiguous and start at 1', () => {
  assert.deepEqual(modules.map(m => m.order), modules.map((_, i) => i + 1));
});

test('internal-work event registration is separated from views and loaded before boot',()=>{
  const eventsPath='pages/internal-work-events.js';
  const eventsIndex=modules.findIndex(m=>m.path===eventsPath);
  const bootIndex=modules.findIndex(m=>m.path==='boot.js');
  const viewsIndex=modules.findIndex(m=>m.path==='pages/results.js');
  const tobeIndex=modules.findIndex(m=>m.path==='pages/tobe.js');
  const outputReviewIndex=modules.findIndex(m=>m.path==='domain/output-review.js');
  assert.ok(eventsIndex>viewsIndex&&eventsIndex>tobeIndex&&eventsIndex>outputReviewIndex);
  assert.equal(eventsIndex,bootIndex-1,'event module must load directly before boot');
  const results=fs.readFileSync(path.join(root,'pages/results.js'),'utf8');
  const events=fs.readFileSync(path.join(root,eventsPath),'utf8');
  assert.doesNotMatch(results,/function registerInternalWorkPages\(/,
    'Views cannot also own UI event registration');
  assert.match(events,/function registerInternalWorkPages\(/);
  assert.match(results,/__AUNEA_INTERNAL_WORK_EVENTS_MODULE__/,
    'test-only source oracle must preserve event composition');
  assert.equal((events.match(/function registerInternalWorkPages\(/g)||[]).length,1);
});

test('PG11 global overview is a single read-only module loaded before work handlers',()=>{
  const global='pages/tobe-global.js',workspace='pages/tobe.js',
    handlers='pages/internal-work-events.js';
  const order=path=>modules.findIndex(entry=>entry.path===path);
  assert.ok(order(global)>order(workspace));
  assert.equal(order(global)+1,order(handlers));
  const source=fs.readFileSync(path.join(root,workspace),'utf8');
  const globalSource=fs.readFileSync(path.join(root,global),'utf8');
  assert.match(source,/__AUNEA_PG11_GLOBAL_VIEW_MODULE__/);
  assert.doesNotMatch(source,/function tobeGlobalOverviewHtml\(/);
  assert.match(globalSource,/function tobeGlobalOverviewHtml\(/);
  assert.match(globalSource,/\[AUNEA-FE-PG11-GLOBAL-OVERVIEW-284\] START/);
  assert.match(globalSource,/\[AUNEA-FE-PG11-GLOBAL-OVERVIEW-284\] END/);
});
// [AUNEA-UAT-MODULE-MANIFEST-010] END
