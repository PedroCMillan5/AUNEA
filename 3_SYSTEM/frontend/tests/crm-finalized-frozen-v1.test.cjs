// [AUNEA-UAT-CRM-FINALIZED-FROZEN-010] START — Finalized Contactos / Interacciones / Oportunidades
// PURPOSE: Make the three explicitly approved CRM pages immutable under DEC-066.
// SOURCE: User approval 2026-09-22; DEC-050/051/058/061/066.
// INPUTS: Final page sources and their shared page-scoped CRM list CSS block.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: CRITICAL.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const FINALIZED=[
  ['Contactos','pages/crm-contacts.js','tests/frozen/contacts-page-v1.js.snapshot'],
  ['Interacciones','pages/crm-interactions.js','tests/frozen/interactions-page-v1.js.snapshot'],
  ['Oportunidades','pages/crm-opportunities.js','tests/frozen/opportunities-page-v1.js.snapshot']
];

for(const [name,source,snapshot] of FINALIZED){
  test('FINALIZED '+name+' page source is byte-for-byte frozen',()=>{
    assert.equal(read(source),read(snapshot),name+' está FINALIZADA/FROZEN: no se puede modificar '+source+'.');
  });
}

test('FINALIZED CRM list page-specific styles are byte-for-byte frozen',()=>{
  const css=read('ui-system.css');
  const frozenId='AUNEA-FE-'+'CRM-LIST-VIEWPORT-010';
  const start='/* ['+frozenId+'] START';
  const end='/* ['+frozenId+'] END */';
  const a=css.indexOf(start),b=css.indexOf(end);
  assert.ok(a>=0&&b>=0,'Frozen CRM list CSS markers must remain present');
  assert.equal(
    css.slice(a,b+end.length),
    read('tests/frozen/crm-lists-style-v1.css.snapshot'),
    'Contactos, Interacciones y Oportunidades están FINALIZADAS/FROZEN: no se puede modificar su bloque CSS compartido.'
  );
});

test('FINALIZED Opportunity still prevents a second study from the same opportunity',()=>{
  const src=read('pages/crm-opportunities.js');
  const domain=read('domain/opportunity.js');
  assert.match(src,/isOpportunityOpen\(o\) && !engs\.length/);
  assert.match(domain,/const existing=engagementsOfOpportunity\(o\.id\)/);
  assert.match(domain,/Esta oportunidad ya tiene un estudio asociado\./);
});
// [AUNEA-UAT-CRM-FINALIZED-FROZEN-010] END
