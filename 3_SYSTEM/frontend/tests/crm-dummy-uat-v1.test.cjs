// [AUNEA-UAT-CRM-DUMMY-040] START — CRM-only seed contract
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'uat/crm-fixtures.js'),'utf8');

function context(){
  const state={companies:[],contacts:[],interactions:[],opportunities:[],engagements:[{id:'REAL-ENG'}],projects:[{id:'REAL-PRJ'}],selectedCompanyId:null,selectedContactId:null,activePage:'uat'};
  const ctx={
    state,console,
    pages:{uat:()=>''},postBind:()=>{},runVisibleUAT:async()=>{},
    CONTACT_STATUS:['Activo','Pendiente','Inactivo'],
    CONTACT_ROLE_OPTIONS:['Dirección general','Operaciones','Administración / Finanzas','Comercial / Ventas','Marketing','Personas / RR. HH.','Tecnología / IT','Producto','Compras','Legal / Compliance','Atención al cliente','Project Management / PMO','Responsable de área','Técnico / Especialista','Otro'],
    OPPORTUNITY_STAGE:['Nueva','Contactada','Reunión','Diagnóstico','Propuesta','Ganada','Perdida','En pausa'],
    INTERACTION_TYPE:['Reunión','Llamada','Email','Mensaje','Evento','Nota interna'],
    INTERACTION_CHANNEL:['Presencial','Videollamada','Teléfono','Email','LinkedIn','Otro'],
    INTERACTION_OUTCOME:['Sin resultado aún','Avanza','Requiere seguimiento','Bloqueado','Cerrado'],
    inactivateContact:()=>true,reactivateContact:()=>true,createStudyFromOpportunity:()=>true,
    uatStatusBadge:ok=>ok?'PASS':'FAIL',
    now:()=>new Date('2026-09-18T10:00:00Z').toISOString(),
    markDirty:()=>{},persistRecoverySnapshot:()=>{},render:()=>{},toast:()=>{},confirm:()=>true,
    esc:v=>String(v??''),section:()=>'',document:{getElementById:()=>null}
  };
  vm.createContext(ctx);vm.runInContext(src,ctx);return ctx;
}
test('CRM UAT catalogue contains exactly 40 CRM cases',()=>{
  const c=context();assert.equal(vm.runInContext('CRM_UAT_CATALOG.length',c),40);
  const ids=vm.runInContext('CRM_UAT_CATALOG.map(x=>x[0])',c);
  assert.deepEqual([...ids],Array.from({length:40},(_,i)=>`CRM-UAT-${String(i+1).padStart(2,'0')}`));
});
test('CRM dummy seed contains only the four CRM collections',()=>{
  const c=context(),d=vm.runInContext('crmDummySeed()',c);
  assert.deepEqual(Object.keys(d).sort(),['companies','contacts','interactions','opportunities']);
  assert.equal(d.companies.length,8);assert.equal(d.contacts.length,12);assert.equal(d.interactions.length,11);assert.equal(d.opportunities.length,8);
  for(const group of Object.values(d))for(const row of group)assert.match(row.id,/^DUMMY-CRM-/);
});
test('loading CRM dummy data never creates engagements or projects',()=>{
  const c=context();vm.runInContext('loadCrmDummyData()',c);
  assert.deepEqual(c.state.engagements,[{id:'REAL-ENG'}]);assert.deepEqual(c.state.projects,[{id:'REAL-PRJ'}]);
  assert.equal(c.state.companies.length,8);assert.equal(c.state.contacts.length,12);assert.equal(c.state.interactions.length,11);assert.equal(c.state.opportunities.length,8);
});
test('dummy relations are referentially coherent',()=>{
  const c=context(),d=vm.runInContext('crmDummySeed()',c);
  const companies=new Set(d.companies.map(x=>x.id)),contacts=new Set(d.contacts.map(x=>x.id)),opps=new Set(d.opportunities.map(x=>x.id));
  d.contacts.forEach(x=>assert.ok(companies.has(x.companyId)));
  d.companies.filter(x=>x.primaryContactId).forEach(x=>assert.ok(contacts.has(x.primaryContactId)));
  d.opportunities.forEach(x=>{assert.ok(companies.has(x.companyId));x.contactIds.forEach(id=>assert.ok(contacts.has(id)))});
  d.interactions.forEach(x=>{assert.ok(companies.has(x.companyId));x.contactIds.forEach(id=>assert.ok(contacts.has(id)));if(x.opportunityId)assert.ok(opps.has(x.opportunityId));assert.equal(x.engagementId,null)});
});
test('clear CRM dummy removes only DUMMY-CRM records',()=>{
  const c=context();c.state.companies.push({id:'REAL-CMP'});c.state.contacts.push({id:'REAL-CON'});c.state.interactions.push({id:'REAL-INT'});c.state.opportunities.push({id:'REAL-OPP'});
  vm.runInContext('loadCrmDummyData();clearCrmDummyData({ask:false})',c);
  assert.deepEqual(c.state.companies.map(x=>x.id),['REAL-CMP']);
  assert.deepEqual(c.state.contacts.map(x=>x.id),['REAL-CON']);
  assert.deepEqual(c.state.interactions.map(x=>x.id),['REAL-INT']);
  assert.deepEqual(c.state.opportunities.map(x=>x.id),['REAL-OPP']);
});
test('UAT page exposes explicit load and cleanup actions',()=>{
  assert.match(src,/id="loadCrmDummy"/);assert.match(src,/id="clearCrmDummy"/);
  assert.match(src,/Cargar datos CRM de prueba/);assert.match(src,/Limpiar datos CRM de prueba/);
});

test('full CRM UAT catalogue covers Company, Contact, Interaction, Opportunity, relations and persistence',()=>{
  const c=context(),rows=vm.runInContext('CRM_UAT_CATALOG',c);
  const titles=[...rows].map(x=>x[1]).join(' | ');
  for(const area of ['Empresas','Contactos','Interacciones','Oportunidades','Relaciones','Persistencia','Aislamiento'])assert.match(titles,new RegExp(area));
  assert.equal(rows.filter(x=>x[0].startsWith('CRM-UAT-')).length,40);
});
test('expanded dummy includes the required edge-case fixtures',()=>{
  const c=context(),d=vm.runInContext('crmDummySeed()',c);
  assert.ok(d.companies.some(x=>x.id==='DUMMY-CRM-CMP-006'&&!d.contacts.some(ct=>ct.companyId===x.id)));
  assert.ok(d.companies.some(x=>x.id==='DUMMY-CRM-CMP-008'&&x.status==='Archivada'));
  assert.ok(d.contacts.some(x=>x.id==='DUMMY-CRM-CON-011'&&!x.email&&!x.phone));
  assert.ok(d.contacts.some(x=>x.id==='DUMMY-CRM-CON-012'&&/Ñ|ñ/.test(x.lastName)));
  assert.ok(d.interactions.some(x=>x.id==='DUMMY-CRM-INT-009'&&x.contactIds.length===0));
  assert.ok(d.opportunities.some(x=>x.id==='DUMMY-CRM-OPP-007'&&x.contactIds.length===0));
});

test('visible UAT button is extended with a 32-assertion automatic CRM suite',()=>{
  assert.match(src,/function runCrmAutomaticUat\(\)/);
  assert.match(src,/CRM_AUTOMATIC_V1/);
  assert.match(src,/CRM-AUTO-32/);
  assert.match(src,/const __auneaRunVisibleUatBeforeCrmAutomatic=runVisibleUAT/);
  assert.match(src,/state\.uatLastRun\.crm_automatic=runCrmAutomaticUat\(\)/);
  assert.match(src,/state\.uatLastRun\.combined_pass/);
  const c=context(),r=vm.runInContext('runCrmAutomaticUat()',c);
  assert.equal(r.assertion_count,32);
  assert.equal(r.pass,true);
});
// [AUNEA-UAT-CRM-DUMMY-040] END
