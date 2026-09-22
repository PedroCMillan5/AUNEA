// [AUNEA-UAT-CRM-LIST-VIEWPORT-010] START — Contactos/Interacciones pagination and viewport
// PURPOSE: Lock requested CRM list behavior without touching FINALIZED Empresas.
// SOURCE: User review 2026-09-22; DEC-050/058/061.
// INPUTS: crm-contacts.js, crm-interactions.js, ui/shell.js, ui-system.css.
// OUTPUTS: Acceptance Gate pass/fail.
// SIDE_EFFECTS: none.
// CHANGE_RISK: MEDIUM.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contacts=read('pages/crm-contacts.js');
const interactions=read('pages/crm-interactions.js');
const shell=read('ui/shell.js');
const css=read('ui-system.css');

test('Contactos paginates at five records and resets page on filters/search/company scope',()=>{
  assert.match(contacts,/const CONTACT_PAGE_SIZE=5/);
  assert.match(contacts,/Math\.ceil\(rows\.length\/CONTACT_PAGE_SIZE\)/);
  assert.match(contacts,/data-contact-page/);
  assert.match(shell,/state\.contactPage=1/);
  assert.match(shell,/\[data-contact-page\]/);
});

test('Contactos Cargo dropdown truncates long values without overlapping and exposes full label on hover',()=>{
  assert.match(contacts,/contact-role-filter/);
  assert.match(contacts,/data-full-label/);
  assert.match(contacts,/title="\$\{attr\(o\.label\)\}"/);
  assert.match(css,/\.contact-role-filter \.aunea-select-menu button,[\s\S]*white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
});

test('Contactos locks document vertical scroll only on its own page',()=>{
  assert.match(contacts,/contacts-screen-marker/);
  assert.match(css,/html:has\(\.contacts-screen-marker\),body:has\(\.contacts-screen-marker\)[\s\S]*overflow:hidden!important/);
  assert.match(css,/\.main:has\(\.contacts-screen-marker\)[\s\S]*height:100vh[\s\S]*overflow:hidden/);
});

test('Interacciones paginates at ten records with numbered navigation',()=>{
  assert.match(interactions,/const INTERACTION_PAGE_SIZE=10/);
  assert.match(interactions,/Math\.ceil\(rows\.length\/INTERACTION_PAGE_SIZE\)/);
  assert.match(interactions,/data-interaction-page/);
  assert.match(shell,/state\.interactionPage=1/);
  assert.match(shell,/\[data-interaction-page\]/);
});

test('Interacciones Empresa/Contacto filters truncate and expose full value on hover',()=>{
  assert.match(interactions,/interaction-entity-filter/);
  assert.match(interactions,/data-full-label="\$\{attr\(o\.label\)\}"/);
  assert.match(interactions,/title="\$\{attr\(o\.label\)\}"/);
  assert.match(css,/\.interaction-entity-filter \.aunea-select-menu button[\s\S]*text-overflow:ellipsis/);
});

test('Interacciones locks vertical document scroll and keeps compact table rows',()=>{
  assert.match(interactions,/interactions-screen-marker/);
  assert.match(css,/html:has\(\.interactions-screen-marker\),body:has\(\.interactions-screen-marker\)[\s\S]*overflow:hidden!important/);
  assert.match(css,/\.interaction-table th,\.interaction-table td\{padding-top:7px;padding-bottom:7px\}/);
});

test('Contactos and Interacciones preserve the original full content width inside the flex viewport',()=>{
  assert.match(css,/\.main:has\(\.contacts-screen-marker\)>\.content,[\s\S]*\.main:has\(\.interactions-screen-marker\)>\.content,[\s\S]*width:100%;max-width:1620px/);
});

test('Oportunidades paginates at ten and hides Crear estudio when one is already associated',()=>{
  const opportunities=read('pages/crm-opportunities.js');
  assert.match(opportunities,/const OPPORTUNITY_PAGE_SIZE=10/);
  assert.match(opportunities,/data-opportunity-page/);
  assert.match(opportunities,/isOpportunityOpen\(o\) && !engs\.length/);
  assert.match(shell,/state\.opportunityPage=1/);
  assert.match(shell,/\[data-opportunity-page\]/);
});

test('Oportunidades uses compact AUNEA entity filters and locks vertical document scroll',()=>{
  const opportunities=read('pages/crm-opportunities.js');
  assert.match(opportunities,/opportunity-entity-filter/);
  assert.match(opportunities,/data-full-label/);
  assert.match(opportunities,/opportunities-screen-marker/);
  assert.match(css,/html:has\(\.opportunities-screen-marker\),body:has\(\.opportunities-screen-marker\)[\s\S]*overflow:hidden!important/);
});

test('Empresas frozen page source is not modified by this CRM list change',()=>{
  assert.equal(read('pages/crm-companies.js'),read('tests/frozen/companies-page-v1.js.snapshot'));
});
// [AUNEA-UAT-CRM-LIST-VIEWPORT-010] END
