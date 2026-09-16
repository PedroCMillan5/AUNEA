// [AUNEA-UAT-SHELL-REFERENCE-010] START — Approved-reference shell contract
// PURPOSE: Hold the shell to the layout language the approved reference set defines — System skin, rail
//          structure, contextual top bar, workspace/inspector split, action bar and No-Reask provenance chip.
// SOURCE: Approved reference set 21+2 (IMG90-00-01, IMG90-00-02, IMG90-01) under DEC-056;
//         AUNEA_SYSTEM_90MIN_UI_SPEC_REVIEW_v1 §§3,5,11,17; DEC-040/048/049/050.
// INPUTS: styles.css, index.html, core/state.js.
// OUTPUTS: pass/fail assertions.
// SIDE_EFFECTS: none (read-only).
// CHANGE_RISK: MEDIUM.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const stateJs = fs.readFileSync(path.join(root, 'core/state.js'), 'utf8');

test('the System line palette from UI Spec §11 is declared as tokens', () => {
  for (const [tok, hex] of Object.entries({
    '--system': '#0F3B2E', '--sage': '#6FA885', '--system-soft': '#EAF2ED', '--beige': '#F2EDE3'
  })) {
    assert.match(css, new RegExp(`${tok}:${hex}`), `${tok} must equal ${hex} (UI Spec §11)`);
  }
});

test('TOKENS_AUNEA stays the base palette alongside the System line', () => {
  // Both sources are canonical. Adding the System line must not drop the Drive design tokens.
  for (const [tok, hex] of Object.entries({ '--ink': '#1E1E1E', '--gold': '#D4AF37', '--bg': '#FAFAF8' })) {
    assert.match(css, new RegExp(`${tok}:${hex}`), `${tok} must still equal ${hex}`);
  }
});

test('the rail and the primary action use the System green the references show', () => {
  assert.match(css, /\.sidebar\{[^}]*background:var\(--system\)/, 'the rail is System green, not charcoal');
  assert.match(css, /\.btn-primary\{background:var\(--system\)/, 'the primary action is System green, not a gold gradient');
});

test('gold is an accent only: it no longer drives focus, selection or the primary action', () => {
  assert.doesNotMatch(css, /\.btn-primary\{background:linear-gradient\(120deg,var\(--gold-2\)/);
  assert.doesNotMatch(css, /box-shadow:0 0 0 3px rgba\(212,175,55/, 'the focus ring follows the System accent');
});

test('the shell exposes the reference regions', () => {
  for (const id of ['railHead', 'nav', 'breadcrumb', 'topbarContext', 'stepProgress', 'content', 'modalRoot']) {
    assert.match(html, new RegExp(`id="${id}"`), `index.html must expose #${id}`);
  }
  assert.match(html, /AUNEA SYSTEM/, 'the rail footer carries the AUNEA SYSTEM signature');
  assert.match(html, /SISTEMAS QUE<br>OPTIMIZAN TU NEGOCIO\./);
});

test('the rail carries no product version string', () => {
  // The references show brand and signature only; the version belongs on Configuración/Admin.
  const rail = html.slice(html.indexOf('<aside class="sidebar">'), html.indexOf('</aside>'));
  assert.doesNotMatch(rail, /2\.0\.0|REVIEW/i);
});

test('the nine session steps come from the canonical flow, not a hardcoded rail list', () => {
  assert.match(stateJs, /'__STAGES__'/, 'the rail expands the stage group from schema.flow');
  assert.match(stateJs, /function stageList\(\)\{return \(schema&&schema\.flow\)/);
  // A literal list of nine Spanish stage names in the nav would be a second source of truth.
  assert.doesNotMatch(stateJs, /\[\s*'diagnostico'\s*,\s*'◎'\s*,\s*'Diagnóstico 90m'\s*\]/);
});

test('the top bar switches to session chrome on session surfaces only', () => {
  assert.match(stateJs, /SESSION_SURFACE_PAGES\s*=\s*new Set\(\['diagnostico','proceso'\]\)/);
  assert.match(stateJs, /Consola interna/, 'the private-console marker is part of the session chrome (DEC-048/049)');
  assert.match(stateJs, /Paso \$\{i\+1\} de \$\{flow\.length\}/, 'step progress is derived from the flow length');
});

test('workspace, inspector, action bar and provenance chip exist as shared primitives', () => {
  for (const fn of ['function workspace(', 'function insCard(', 'function kvRows(', 'function actionBar(', 'function prefillChip(']) {
    assert.ok(stateJs.includes(fn), `${fn} must be a shared primitive, not repeated per page`);
  }
  for (const cls of ['.workspace{', '.inspector{', '.ins-card{', '.action-bar{', '.prefill-chip{', '.screen-id{', '.tabs{', '.kv{']) {
    assert.ok(css.includes(cls), `${cls} must be defined once in the shared stylesheet`);
  }
});

test('pageTop accepts the reference screen identifier', () => {
  assert.match(stateJs, /function pageTop\(title,subtitle,actions='',screenId=''\)/);
  assert.match(stateJs, /class="screen-id"/);
});
// [AUNEA-UAT-SHELL-REFERENCE-010] END
