// [AUNEA-UAT-CRM-010] START — CRM regression (contacts/companies, no new persistent model)
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const coreCode=fs.readFileSync(path.join(root,'app-core.js'),'utf8');
const shellCode=fs.readFileSync(path.join(root,'app-shell.js'),'utf8');

function makeCtx(){
  const domFields={};
  const ctx={
    console,
    localStorage:{getItem:()=>null,setItem:()=>{}},
    document:{
      getElementById:(id)=>{if(!domFields[id])domFields[id]={};return domFields[id]},
      querySelectorAll:()=>[],querySelector:()=>null
    },
    confirm:()=>true
  };
  vm.createContext(ctx);
  vm.runInContext(coreCode,ctx);
  // `let state`/`schema` are lexical top-level bindings, not sandbox-global properties — bridge them explicitly.
  vm.runInContext('globalThis.state=state;globalThis.schema=schema;',ctx);
  ctx.render=()=>{}; // app-shell.js's `pages` is not loaded for the editContact/createStudyFromContact tests
  ctx.__domFields=domFields;
  return ctx;
}

function loadShell(ctx){
  ctx.stagePage=()=>'';ctx.processPage=()=>'';ctx.resultsPage=()=>'';ctx.recommendationPage=()=>'';ctx.scenariosPage=()=>'';ctx.quotePage=()=>'';
  vm.runInContext(shellCode,ctx);
  vm.runInContext('globalThis.pages=pages;',ctx); // `const pages` is likewise lexical-only
}

test('editContact mutates only the existing Contact shape, never touches lastInteraction, and logs one dated audit entry per changed field',()=>{
  const ctx=makeCtx();
  ctx.state.companies.push({id:'c1',name:'ACME',sector:'',country:'',createdAt:ctx.now()});
  const contact={id:'CON-1',companyId:'c1',name:'Ana',role:'CFO',email:'ana@acme.test',phone:'',status:'Nuevo',source:'Referido',nextAction:'',lastInteraction:'2020-01-01T00:00:00.000Z',createdAt:'2020-01-01T00:00:00.000Z'};
  ctx.state.contacts.push(contact);
  const originalKeys=Object.keys(contact).sort();
  ctx.editContact('CON-1');
  ctx.__domFields.mContactCompany={value:'c1'};
  ctx.__domFields.mContactName={value:'Ana'};
  ctx.__domFields.mContactRole={value:'CFO'};
  ctx.__domFields.mContactEmail={value:'ana@acme.test'};
  ctx.__domFields.mContactPhone={value:''};
  ctx.__domFields.mContactStatus={value:'Contactado'};
  ctx.__domFields.mContactSource={value:'Referido'};
  ctx.__domFields.mNextAction={value:'Enviar propuesta'};
  ctx.__domFields.modalSave.onclick();
  assert.equal(contact.status,'Contactado');
  assert.equal(contact.nextAction,'Enviar propuesta');
  assert.equal(contact.lastInteraction,'2020-01-01T00:00:00.000Z','editContact must never touch lastInteraction — an edit is not an interaction');
  assert.deepEqual(Object.keys(contact).sort(),originalKeys,'editContact must not introduce any new persistent Contact property');
  assert.equal(ctx.state.audit.length,2,'only the two changed fields (Estado, Próxima acción) should produce audit entries');
  assert.ok(ctx.state.audit.some(a=>a.message.includes('Ana')&&a.message.includes('Estado')&&a.message.includes('Contactado')));
  assert.ok(ctx.state.audit.some(a=>a.message.includes('Ana')&&a.message.includes('Próxima acción')&&a.message.includes('Enviar propuesta')));
});

test('contactHistory derives a per-contact view from state.audit instead of a new history array',()=>{
  const ctx=makeCtx();
  ctx.state.audit.push({ts:'2024-01-01T00:00:00.000Z',message:'Contacto Ana editado: Estado "Nuevo"→"Contactado"'});
  ctx.state.audit.push({ts:'2024-01-02T00:00:00.000Z',message:'Contacto Beto editado: Estado "Nuevo"→"Perdido"'});
  const ana={id:'CON-1',name:'Ana'};
  const history=ctx.contactHistory(ana);
  assert.equal(history.length,1);
  assert.match(history[0].message,/Ana/);
  assert.doesNotMatch(history[0].message,/Beto/);
});

test('createStudyFromContact still updates lastInteraction (a real interaction touch), unlike editContact',()=>{
  const ctx=makeCtx();
  ctx.state.companies.push({id:'c1',name:'ACME',sector:'',country:'',createdAt:ctx.now()});
  const contact={id:'CON-1',companyId:'c1',name:'Ana',role:'',email:'',phone:'',status:'Nuevo',source:'',nextAction:'',lastInteraction:'2020-01-01T00:00:00.000Z',createdAt:'2020-01-01T00:00:00.000Z'};
  ctx.state.contacts.push(contact);
  ctx.createStudyFromContact('CON-1');
  assert.notEqual(contact.lastInteraction,'2020-01-01T00:00:00.000Z');
  assert.equal(ctx.state.engagements.length,1);
});

test('the "ocultar perdidos" filter excludes status==="Perdido" by default, and the status filter narrows further',()=>{
  const ctx=makeCtx();
  loadShell(ctx);
  ctx.state.companies.push({id:'c1',name:'ACME',sector:'',country:'',createdAt:ctx.now()});
  ctx.state.contacts.push({id:'CON-1',companyId:'c1',name:'Activo Uno',status:'Contactado',createdAt:ctx.now()});
  ctx.state.contacts.push({id:'CON-2',companyId:'c1',name:'Perdido Dos',status:'Perdido',createdAt:ctx.now()});
  let html=ctx.pages.contactos();
  assert.match(html,/Activo Uno/);
  assert.doesNotMatch(html,/Perdido Dos/);
  ctx.state.contactFilters.hideLost=false;
  html=ctx.pages.contactos();
  assert.match(html,/Perdido Dos/);
  ctx.state.contactFilters.status='Contactado';
  html=ctx.pages.contactos();
  assert.doesNotMatch(html,/Perdido Dos/);
});

test('Contactos/Empresas are separate subtabs and neither Contact nor Company gains an "archived" or "history" property',()=>{
  const ctx=makeCtx();
  loadShell(ctx);
  const htmlContacts=ctx.pages.contactos();
  assert.match(htmlContacts,/data-crm-tab="contactos"/);
  assert.match(htmlContacts,/data-crm-tab="empresas"/);
  assert.doesNotMatch(coreCode,/\.archived\s*=/);
  assert.doesNotMatch(coreCode,/\.history\s*=\s*\[/);
});

test('formatDateEs renders dd/mm/aaaa for both a bare date-only string (as produced by <input type="date">) and a full ISO timestamp, without a timezone off-by-one',()=>{
  const ctx=makeCtx();
  assert.equal(ctx.formatDateEs('2026-09-12'),'12/09/2026');
  assert.equal(ctx.formatDateEs('2026-01-05T12:00:00.000Z'),'05/01/2026');
  assert.equal(ctx.formatDateEs(''),'—');
  assert.equal(ctx.formatDateEs(null),'—');
});

test('UAT-VIS-008 company cards render canonical sector/country labels and keep raw codes internal-only',()=>{
  const ctx=makeCtx();
  vm.runInContext(`schema={option_sets:{REF_DOMAIN:{options:[{value:'D25',label:'Professional Services Delivery'}]},REF_COUNTRY_ISO3166:{options:[{value:'ES',label:'España'}]}}};globalThis.schema=schema;`,ctx);
  loadShell(ctx);
  ctx.state.companies.push({id:'c1',name:'ACME',sector:'D25',country:'ES',createdAt:ctx.now()});
  ctx.state.crmTab='empresas';
  const html=ctx.pages.contactos();
  assert.match(html,/Professional Services Delivery/);
  assert.match(html,/España/);
  assert.match(html,/class="internal-only"> · D25 · ES/);
});
// [AUNEA-UAT-CRM-010] END
