// [AUNEA-UAT-UI-UX-CONTRACT-474] START — Unified visual/interaction family registry guard.
// PURPOSE: Stop ungoverned UI families, missing semantic levels, duplicated owners and
// accidental elevation of the REVIEW contract to PRODUCTION.
// SOURCE: docs/AUNEA_INTERNAL_UI_UX_MASTER_CONTRACT_20261117.md;
//         docs/audit/AUNEA_INTERNAL_UI_UX_MASTER_REGISTRY_20261117.json;
//         DEC-050/055/056, PROJECT_RULES.md and TOKENS_AUNEA.
// INPUTS: documented registry plus existing frontend owner source files.
// OUTPUTS: node:test assertions (documentary integrity, not visual/browser UAT).
// SIDE_EFFECTS: none. CHANGE_RISK: LOW.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const frontend=path.join(root,'3_SYSTEM/frontend');
const registryPath=path.join(root,'docs/audit/AUNEA_INTERNAL_UI_UX_MASTER_REGISTRY_20261117.json');
const contractPath=path.join(root,'docs/AUNEA_INTERNAL_UI_UX_MASTER_CONTRACT_20261117.md');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const contract=fs.readFileSync(contractPath,'utf8');
const read=(p)=>fs.readFileSync(path.join(frontend,p),'utf8');

test('master UI/UX registry covers all 40 explicitly inventoried families',()=>{
  assert.equal(registry.families.length,40);
  assert.equal(new Set(registry.families.map(x=>x.id)).size,40);
  assert.equal(registry.version,'0.3.0');
  assert.equal(registry.l1.status,'CLOSED_TECHNICAL_REVIEW');
  assert.equal(registry.l2.status,'CLOSED_TECHNICAL_REVIEW');
  assert.equal(registry.l3.status,'CLOSED_TECHNICAL_REVIEW');
  for(const id of ['table','search-filter','kpi'])
    assert.equal(registry.families.find(f=>f.id===id)?.owner,'ui/renderer.js');
  assert.match(contract,/\*\*Versión:\*\* v0\.3/);
  assert.equal(registry.status,'REVIEW');
  assert.match(contract,/NO|no.*PRODUCTION|no.*producción/i);
});

test('seven information levels have governed, unique definitions and child rules',()=>{
  assert.deepEqual(registry.policies.hierarchy,
    ['page','section','subsection','block','group','field','datum']);
  assert.deepEqual(registry.hierarchy.map(x=>x.id),registry.policies.hierarchy);
  for(const h of registry.hierarchy){
    assert.ok(h.definition.length>20,h.id+' lacks a semantic definition');
    assert.ok(h.rules.length>=2,h.id+' lacks interaction/presentation rules');
    for(const child of h.children)assert.ok(registry.policies.hierarchy.includes(child)||['workspace','action-bar'].includes(child));
  }
});

test('every UI family has a design-system mapping, single owner and states',()=>{
  const allowed=['existing','review'];
  for(const f of registry.families){
    assert.match(f.id,/^[a-z][a-z0-9-]*$/);
    assert.ok(f.name.length>5);
    assert.ok(f.ds.length>0&&f.ds.every(v=>/^DS-\d{3}$/.test(v)));
    assert.ok(allowed.includes(f.implementation));
    assert.ok(Array.isArray(f.states)&&f.states.length>=2,f.id+' must specify states');
    assert.equal(f.contract,'specified');
    assert.ok(f.verification.includes('existing-base')||f.verification.includes('requires-browser'));
    assert.ok(fs.existsSync(path.join(frontend,f.owner)),
      f.id+' owner missing: '+f.owner);
  }
});

test('global component ownership reuses current implementations, not parallel renderers',()=>{
  const core=read('core/state.js'),renderer=read('ui/renderer.js');
  for(const fn of ['pageTop','section','workspace','insCard','kvRows','actionBar','openModal','statusBadge'])
    assert.ok(core.includes('function '+fn+'('),'Missing shared core owner '+fn);
  for(const fn of ['auneaUiDisclosureStart','auneaUiDisclosureEnd','auneaUiDisclosureOpen',
    'auneaSelectControl','auneaEmptyState','auneaNoticeMessage'])
    assert.ok(renderer.includes('function '+fn+'('),'Missing shared renderer '+fn);
  assert.equal(registry.policies.noParallelRenderer,true);
});

test('corporate identity, WCAG principles and FROZEN stay protected',()=>{
  const css=read('styles.css'),freeze=JSON.parse(read('FROZEN_PAGES.json'));
  for(const token of ['--gold:#D4AF37','--system:#0F3B2E',
    '--sage:#6FA885','--space-1:4px','--radius-md:12px'])
    assert.ok(css.includes(token),'Official token missing: '+token);
  assert.equal(registry.policies.wcagTextMin,4.5);
  assert.equal(registry.policies.wcagNonTextMin,3);
  assert.equal(registry.policies.colorQuota,'none-approved');
  assert.equal(registry.policies.frozen,'preserve-approved-appearance');
  assert.equal(freeze.frozen_pages.filter(p=>p.status==='FROZEN').length,9);
  assert.match(contract,/No presentar contrato como CANONICAL/);
});

test('contract explicitly distinguishes specification from implementation and acceptance',()=>{
  for(const key of ['## 1. Definiciones','## 2. Diseño visual',
    '## 3. Contrato transversal','## 4. Responsive','## 5. Inventario',
    '## 6. Propiedad física','## 7. Gates técnicos','## 8. Plan cerrado'])
    assert.ok(contract.includes(key),'Missing contract chapter '+key);
  assert.ok(registry.families.some(f=>f.implementation==='review'),
    'REVIEW must not be claimed as fully migrated');
});
// [AUNEA-UAT-UI-UX-CONTRACT-474] END
