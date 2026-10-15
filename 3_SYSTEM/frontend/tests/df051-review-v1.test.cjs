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
  {id:'s1',step_name:'Recibir factura PDF',inputs:['PDF'],outputs:['PDF'],manual_actions:[],normal_next_step:'s6'},
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
test('no automatic finding when data relation is not defined in flow',()=>{
 const e=fixture();delete e.processSteps[0].normal_next_step;
 const ui=ctx.duplicateEntryControl('DF051',e,[]);
 assert.doesNotMatch(ui,/Posibles reintroducciones detectadas/);
 assert.doesNotMatch(ui,/Completar hallazgo/);
});
test('manual action alone cannot produce an automatic finding',()=>{
 const e=fixture();e.processSteps[1].inputs=['RECORD'];
 assert.equal(ctx.duplicateEntryCandidates(e).length,0);
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

test('DF051 global validation has one authoritative Validate and reversible VALIDADA state',()=>{
 const process=fs.readFileSync(path.join(__dirname,'..','domain','process.js'),'utf8');
 assert.match(process,/data-pg05-validate-section="DF051"/);
 assert.match(process,/status=df051Validated\?'VALIDADA'/);
 assert.match(process,/Deshacer validación/);
 assert.match(process,/DF051__section_confirmation/);
 assert.match(process,/const globalValidation=ev\.target/);
 assert.match(process,/df051Validated\?'<div class="field-help">/);
 assert.match(process,/const findingOpenAction=fid!=='DF051'/);
 assert.doesNotMatch(process,/const noReviewAvailable=[^;]*'DF050','DF051','DF052'/);
});
