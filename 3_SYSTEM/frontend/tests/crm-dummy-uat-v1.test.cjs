// [AUNEA-UAT-CRM-DUMMY-040] START — CRM-only seed contract
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'uat/crm-fixtures.js'),'utf8');

function context(){
  const state={companies:[],contacts:[],interactions:[],opportunities:[],engagements:[{id:'REAL-ENG'}],projects:[{id:'REAL-PRJ'}],selectedCompanyId:null,selectedContactId:null,activePage:'uat'};
  const ctx={
    state,console,
    pages:{uat:()=>''},postBind:()=>{},
    now:()=>new Date('2026-09-18T10:00:00Z').toISOString(),
    markDirty:()=>{},persistRecoverySnapshot:()=>{},render:()=>{},toast:()=>{},confirm:()=>true,
    esc:v=>String(v??''),section:()=>'',document:{getElementById:()=>null}
  };
  vm.createContext(ctx);vm.runInContext(src,ctx);return ctx;
}
test('CRM UAT catalogue contains exactly 15 CRM cases',()=>{
  const c=context();assert.equal(vm.runInContext('CRM_UAT_CATALOG.length',c),15);
  const ids=vm.runInContext('CRM_UAT_CATALOG.map(x=>x[0])',c);
  assert.deepEqual([...ids],Array.from({length:15},(_,i)=>`CRM-UAT-${String(i+1).padStart(2,'0')}`));
});
test('CRM dummy seed contains only the four CRM collections',()=>{
  const c=context(),d=vm.runInContext('crmDummySeed()',c);
  assert.deepEqual(Object.keys(d).sort(),['companies','contacts','interactions','opportunities']);
  assert.equal(d.companies.length,5);assert.equal(d.contacts.length,10);assert.equal(d.interactions.length,8);assert.equal(d.opportunities.length,6);
  for(const group of Object.values(d))for(const row of group)assert.match(row.id,/^DUMMY-CRM-/);
});
test('loading CRM dummy data never creates engagements or projects',()=>{
  const c=context();vm.runInContext('loadCrmDummyData()',c);
  assert.deepEqual(c.state.engagements,[{id:'REAL-ENG'}]);assert.deepEqual(c.state.projects,[{id:'REAL-PRJ'}]);
  assert.equal(c.state.companies.length,5);assert.equal(c.state.contacts.length,10);assert.equal(c.state.interactions.length,8);assert.equal(c.state.opportunities.length,6);
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
// [AUNEA-UAT-CRM-DUMMY-040] END
