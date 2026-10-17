// [AUNEA-UAT-RISK-OWNER-134] START — DEC-072 risk-only provenance in runtime and engine
// SOURCE: DEC-072 approved; Diagnostic Master v1.2 pending workbook consolidation.
// Tests runtime schema and actual questionnaireAnswersForEngine function; no backend claims.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/diagnostic-master.min.json'),'utf8'));
const src=fs.readFileSync(path.join(root,'services/engine-adapter.js'),'utf8');
const processSource=fs.readFileSync(path.join(root,'domain/process.js'),'utf8');
const first=src.indexOf('function questionnaireAnswersForEngine(e){'),last=src.indexOf('function buildBackendPayload(engagement){',first);
assert.ok(first>=0&&last>first);
const ctx={
 schema:registry,
 valuePresent:v=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0),
 effectiveValue:(f,e)=>f.Field_ID==='DF074'?(e.risks||[]).length&&(e.risks||[]).every(r=>!!r.reversibility)?(e.risks||[]).filter(r=>['HARD','IRREVERSIBLE'].includes(r.reversibility)).map(r=>r.description+' — '+r.reversibility).join('; ')||'No se han identificado decisiones o acciones difíciles de revertir en los riesgos registrados.':undefined:undefined
};
vm.createContext(ctx);vm.runInContext(src.slice(first,last),ctx);
test('DF074 is DERIVED, RiskInput-owned and not separately editable',()=>{
 const f=registry.fields.find(x=>x.Field_ID==='DF074');
 assert.equal(f.Ask_Mode,'DERIVED');
 assert.equal(f.Control_UI,'DERIVED');
 assert.equal(f.Reuse_From,'RT_RISK.Reversibility');
 assert.match(registry.source,/DEC-072/);
 assert.ok(processSource.includes("if(stageId==='S06'&&f.Field_ID==='DF074'&&mode==='DERIVED')return false;"));
});
test('legacy manually entered DF074 must not leak when risk is incomplete',()=>{
 const e={answers:{DF011:'Proceso',DF074:'IRREVERSIBLE'},risks:[{description:'Riesgo pendiente',reversibility:''}]};
 const out=ctx.questionnaireAnswersForEngine(e);
 assert.equal(Object.prototype.hasOwnProperty.call(out,'DF074'),false);
 assert.equal(out.DF011,'Proceso');
 assert.equal(e.answers.DF074,'IRREVERSIBLE','engagement is not silently rewritten');
});
test('confirmed RiskInput value replaces an obsolete hand-edited DF074',()=>{
 const e={answers:{DF074:'REVERSIBLE'},risks:[{description:'Pago duplicado',reversibility:'HARD'}]};
 assert.equal(ctx.questionnaireAnswersForEngine(e).DF074,'Pago duplicado — HARD');
});
test('no risks present never promotes a manual DF074',()=>{
 assert.equal(Object.hasOwn(ctx.questionnaireAnswersForEngine({answers:{DF074:'HARD'},risks:[]}), 'DF074'),false);
});
// [AUNEA-UAT-RISK-OWNER-134] END
