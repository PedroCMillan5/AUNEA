// [AUNEA-UAT-DF051-102] START — Candidate → draft → confirmed controls, without a second owner.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','ui','renderer.js'),'utf8');
const start=source.indexOf('function duplicateEntryRawRows('),end=source.indexOf('// DF054 (Integration_Gaps)',start);
assert.ok(start>=0&&end>start,'DF051 owner functions must be available');
const code=source.slice(start,end);
const ctx={
 normalizeArray:v=>Array.isArray(v)?v:v==null||v===''?[]:[v],
 answerDetails:e=>e.answerDetails||(e.answerDetails={}),
 optionLabel:(catalogue,key)=>key,
 stepOptions:e=>e.processSteps.map((s,i)=>({value:s.id,label:(i+1)+'. '+s.step_name})),
 canonicalSelect:(id,options,value,attrs)=>'<select '+attrs+'><option>'+value+'</option></select>',
 esc:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
 attr:v=>String(v??'').replace(/"/g,'&quot;')
};vm.createContext(ctx);vm.runInContext(code,ctx);
function fixture(){
 return {processSteps:[
  {id:'s1',step_name:'Recibir factura PDF',inputs:['PDF'],outputs:['PDF'],manual_actions:[]},
  {id:'s6',step_name:'Registrar en ERP y archivar',inputs:['PDF'],outputs:['RECORD'],manual_actions:['REKEY']}
 ],frictions:[],answers:{DF051:[]},answerDetails:{}};
}
test('map-origin candidate is visible and actionable without a generic empty message',()=>{
 const e=fixture(),c=ctx.duplicateEntryCandidates(e);
 assert.equal(c.length,1);assert.equal(c[0].to,'s6');
 const ui=ctx.duplicateEntryControl('DF051',e,[]);
 assert.match(ui,/Posibles reintroducciones detectadas/);
 assert.match(ui,/data-duplicate-confirm=/);
 assert.doesNotMatch(ui,/No hay reintroducciones confirmadas todav[ií]a/);
});
test('unresolved origin gets a per-candidate Validar hallazgo control',()=>{
 const e=fixture();e.processSteps[1].inputs=['RECORD'];
 const ui=ctx.duplicateEntryControl('DF051',e,[]);
 assert.match(ui,/data-duplicate-review-step="s6"/);
 assert.match(ui,/Validar hallazgo/);
});
test('draft retains its values and confirm requires three parts',()=>{
 const e=fixture();e.answerDetails.DF051__drafts=[{data:'Datos factura',from:'s1',to:'s6'}];
 const ui=ctx.duplicateEntryControl('DF051',e,[]);
 assert.match(ui,/data-duplicate-draft-confirm="0"/);
 assert.doesNotMatch(ui,/data-duplicate-draft-confirm="0" disabled/);
 assert.equal(ctx.duplicateEntryComplete({data:'Datos factura',from:'s1',to:''}),false);
 assert.equal(ctx.duplicateEntryComplete(e.answerDetails.DF051__drafts[0]),true);
});
test('confirmed item offers undo; no contradictory no-confirmations message',()=>{
 const e=fixture();e.answers.DF051=[{data:'Datos factura',from:'s1',to:'s6'}];
 const ui=ctx.duplicateEntryControl('DF051',e,e.answers.DF051);
 assert.match(ui,/Reintroducción confirmada 1/);assert.match(ui,/data-duplicate-undo="0"/);
 assert.doesNotMatch(ui,/No hay reintroducciones confirmadas/);
});
// [AUNEA-UAT-DF051-102] END
