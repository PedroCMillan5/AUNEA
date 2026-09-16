// [AUNEA-UAT-SHELL-REFERENCE-010] START — Approved-reference shell contract
// PURPOSE: Hold the shell to the layout language the approved reference set defines — System skin, rail
//          structure, contextual top bar, workspace/inspector split, action bar and No-Reask provenance chip.
// SOURCE: Approved reference set 21+2 (IMG90-00-01, IMG90-00-02, IMG90-01) under DEC-056;
//         AUNEA_SYSTEM_90MIN_UI_SPEC_REVIEW_v1 §§3,5,11,17; DEC-040/044/048/049/050/051/056; B02 VR-01A reconciliation.
// INPUTS: styles.css, index.html, core/state.js, pages/diagnostic-stages.js, domain/no-reask.js, Diagnostic Master runtime schema.
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
const diagJs = fs.readFileSync(path.join(root, 'pages/diagnostic-stages.js'), 'utf8');
const noReaskJs = fs.readFileSync(path.join(root, 'domain/no-reask.js'), 'utf8');
const diagnosticSchema = JSON.parse(fs.readFileSync(path.join(root, 'data/diagnostic-master.min.json'), 'utf8'));

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

test('the stage clock reproduces the windows the UI spec states', () => {
  // Derived cumulatively from the canonical per-stage minutes. The spec puts I90-01 at 0–6 and I90-03
  // at 12–16, and the references render that as mm:ss.
  const flow = [{Minutos_objetivo:6},{Minutos_objetivo:6},{Minutos_objetivo:4}];
  const mins = n => `${String(n).padStart(2,'0')}:00`;
  const win = i => { let s=0; for(let k=0;k<i;k++) s+=flow[k].Minutos_objetivo; return `${mins(s)} – ${mins(s+flow[i].Minutos_objetivo)}`; };
  assert.equal(win(0), '00:00 – 06:00');
  assert.equal(win(2), '12:00 – 16:00');
  assert.match(stateJs, /function stageWindow\(i\)/);
  assert.match(stateJs, /String\(n\)\.padStart\(2,'0'\)/, 'the clock is mm:ss, not hh:mm');
});

test('each stage declares the approved reference it reproduces', () => {
  assert.match(diagJs, /STAGE_REFERENCE\s*=\s*\{S01:'I90-01'/);
  for (let n = 1; n <= 9; n++) assert.ok(diagJs.includes(`'I90-0${n}'`), `stage ${n} must name its reference`);
  // The client state per stage is the UI spec's, not a per-page invention.
  assert.match(diagJs, /STAGE_CLIENT_STATE/);
  assert.match(diagJs, /C90-00/); assert.match(diagJs, /C90-04/);
});

test('B02 VR-01A keeps PG01 on canonical DF001-DF010 and the current owner model', () => {
  // The reconciled UI Spec §17 explicitly supersedes the old IMG90-01 field substitutions:
  // I90-01 is DF001–DF010 from Diagnostic Master + screen matrix. Do not reintroduce Cargo/Email/
  // Teléfono/Canal/Prioridad/Resumen as substitute PG01 questions just because an obsolete visual shows them.
  const pg01 = diagnosticSchema.fields.filter(f => f.Stage_ID === 'S01');
  assert.deepEqual(pg01.map(f => f.Field_ID), ['DF001','DF002','DF003','DF004','DF005','DF006','DF007','DF008','DF009','DF010']);

  // I90-01 remains schema-driven; there is no second hand-maintained PG01 question list in the page.
  assert.match(diagJs, /schema\.fields\.filter\(f=>f\.Stage_ID===stage\.Stage_ID&&questionVisible\(f,e\)\)/);
  assert.match(diagJs, /renderStageFields\(fields,e\)/);

  // DEC-050: DF001–DF005 correct Company through the canonical Write_Target mapping.
  for (const [target, attrName] of [
    ['RT_COMPANY.Company_Name','name'],
    ['RT_COMPANY.Sector','sector'],
    ['RT_COMPANY.Employee_Count','employeeCount'],
    ['RT_COMPANY.Revenue_Band','revenueBand'],
    ['RT_COMPANY.Country','country']
  ]) {
    assert.ok(noReaskJs.includes(`'${target}':'${attrName}'`), `${target} must write through to Company.${attrName}`);
  }

  // DEC-051: DF006 is a contextual Engagement participant reference, not a Contact-master overwrite.
  assert.match(noReaskJs, /if\(fid==='DF006'&&value\)\{e\.contactIds=\[value,/);
  // Everything that is not an explicit owner write-through remains captured on the Engagement answer map.
  assert.match(stateJs, /e\.answers\[fid\]=value/);
  for (const fid of ['DF008','DF009','DF010']) {
    const field = pg01.find(f => f.Field_ID === fid);
    assert.ok(field, fid);
    assert.match(String(field.Write_Target||''), /^RT_ENGAGEMENT\./, `${fid} must remain Engagement-owned`);
  }
});

test('wrappers over pageTop forward every argument', () => {
  // A fixed-arity wrapper silently swallows the screenId and drops the reference identifier from every
  // page. Any module that decorates pageTop must pass its arguments through untouched.
  const modeJs = fs.readFileSync(path.join(root, 'ui/mode.js'), 'utf8');
  assert.match(modeJs, /pageTop=function\(\.\.\.args\)/, 'the mode wrapper must be variadic');
  assert.match(modeJs, /__auneaPageTopModeBase\(\.\.\.args\)/, 'and must spread them into the base');
});
// [AUNEA-UAT-SHELL-REFERENCE-010] END
