// [AUNEA-UAT-COMPANIES-FROZEN-010] START — Finalized Companies page freeze
// PURPOSE: Make the approved Empresas screen immutable after explicit user closure.
// SOURCE: User approval 2026-09-22; I90-00-01; DEC-050/051/055/061; AUNEA Select contract.
// INPUTS: Companies page source, Companies scoped CSS, Opportunity→Engagement relation.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: CRITICAL.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('FINALIZED Empresas page source is byte-for-byte frozen',()=>{
  assert.equal(
    read('pages/crm-companies.js'),
    read('tests/frozen/companies-page-v1.js.snapshot'),
    'Empresas está FINALIZADA/FROZEN: no se puede modificar crm-companies.js.'
  );
});

test('FINALIZED Empresas page-specific styles are byte-for-byte frozen',()=>{
  const css=read('ui-system.css');
  const frozenId='AUNEA-FROZEN-'+'PAGE-COMPANIES-001';
  const start='/* ['+frozenId+'] START';
  const end='/* ['+frozenId+'] END */';
  const a=css.indexOf(start),b=css.indexOf(end);
  assert.ok(a>=0&&b>=0,'Frozen Empresas CSS markers must remain present');
  const block=css.slice(a,b+end.length);
  assert.equal(
    block,
    read('tests/frozen/companies-style-v1.css.snapshot'),
    'Empresas está FINALIZADA/FROZEN: no se puede modificar su bloque CSS.'
  );
});

test('FINALIZED Empresas keeps the document viewport locked at root',()=>{
  const state=read('core/state.js'),css=read('ui-system.css');
  assert.match(state,/state\.activePage==='empresas'/);
  assert.match(state,/document\.documentElement\.classList\.toggle\('page-companies',companiesViewport\)/);
  assert.match(state,/document\.body\.classList\.toggle\('page-companies',companiesViewport\)/);
  assert.match(css,/html\.page-companies,body\.page-companies\{[^}]*overflow:hidden!important/);
});

test('Opportunity edit popup shows the linked study read-only and creation is idempotent',()=>{
  const src=read('domain/opportunity.js');
  assert.match(src,/const linkedStudies=o\.id\?engagementsOfOpportunity\(o\.id\):\[\]/);
  assert.match(src,/<label>Estudio asociado<\/label>/);
  assert.match(src,/Relación de origen de la oportunidad; se muestra aquí como referencia y no se edita desde este popup/);
  assert.match(src,/const existing=engagementsOfOpportunity\(o\.id\)/);
  assert.match(src,/Esta oportunidad ya tiene un estudio asociado\./);
  assert.match(src,/e\.opportunityId=o\.id/);
});
// [AUNEA-UAT-COMPANIES-FROZEN-010] END
