// Regression guard for AS-IS review and progression. Run with: node --test tests/asis-layer-navigation-v1.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','domain','process.js'),'utf8');
const lifecycle=fs.readFileSync(path.join(__dirname,'..','domain','process-lifecycle.js'),'utf8');
test('editing map options invalidates map confirmation and all downstream layers',()=>{
 assert.match(source,/details\[fid\+'__global_review'\]=\{base:source,values:selected\}/);
 assert.match(source,/invalidateProcessLayersSafe\(e,'map'\)/);
 assert.match(lifecycle,/order=\['map','frictions','risks','impact'\]/);
 assert.match(lifecycle,/order\.slice\(i\)\.forEach\(k=>x\[k\]=false\)/);
});
test('frictions and risks navigation require a confirmed current layer',()=>{
 assert.match(source,/frictions:\{page:'riesgos',label:'Continuar a Riesgos/);
 assert.match(source,/risks:\{page:'impacto',label:'Continuar a Impacto/);
 assert.match(source,/done\?'':' disabled aria-disabled="true"/);
 assert.match(source,/data-confirm-process-layer/);
});
test('risk review reuses step card structure and canonical risk actions',()=>{
 assert.match(source,/function consultantRisksPage\(\)/);
 assert.match(source,/pg05-step-card risk-review-card/);
 assert.match(source,/pg05-step-top/);
 assert.match(source,/pg05-step-metrics/);
 assert.match(source,/pg05-step-details/);
 assert.match(source,/data-edit-risk-index/);
 assert.match(source,/data-delete-risk-index/);
 assert.match(source,/map\(\(r,i\)=>\(\{r,i\}\)\)/);
});

test('risk map evidence is shown without silently confirming new facts',()=>{
 assert.match(source,/data-risk-approval-prefill/);
 assert.match(source,/approvalSources=riskSources\.filter/);
 assert.match(source,/if\(!approvals\.length\)return/);
 assert.match(source,/setAnswer\('DF075',\[\.\.\.selected,'FINAL_DECISION'\]\)/);
 assert.match(source,/Datos sensibles: no se infieren/);
 assert.match(source,/Reversibilidad: se obtiene de cada riesgo/);
});

test('risk approvals preselect only mapped approval or decision steps when not overridden',()=>{
 const renderer=fs.readFileSync(path.join(__dirname,'..','ui','renderer.js'),'utf8');
 assert.match(renderer,/const stored=answerDetails\(e\)\.DF075__steps\?\?e\.answers\?\.DF075__steps/);
 assert.match(renderer,/const linked=stored!==undefined\?stored:/);
 assert.match(renderer,/x\.step_type==='ST05'\|\|normalizeArray\(x\.decision_criteria\)\.length>0/);
});
test('missing approval and exception sources are identified instead of silently ignored',()=>{
 assert.match(source,/const sourceGaps=layer==='risks'/);
 assert.match(source,/tipo de excepción/);
 assert.match(source,/responsable de la excepción/);
 assert.match(source,/criterio de aprobación/);
 assert.match(source,/Completa esos datos en el paso original/);
});

test('derived S06 source gaps have one canonical evaluator and do not masquerade as complete',()=>{
 const noReask=fs.readFileSync(path.join(__dirname,'..','domain','no-reask.js'),'utf8');
 assert.match(noReask,/function riskDerivedSourceGaps\(fid,e\)/);
 assert.match(noReask,/Revisión confirmada · origen incompleto/);
 assert.match(source,/riskDerivedSourceGaps\('DF066',e\)/);
 assert.match(source,/riskDerivedSourceGaps\('DF067',e\)/);
 assert.match(source,/Datos sensibles: no hay declaración registrada/);
 assert.doesNotMatch(source,/const riskSuggestions=layer==='risks'/);
});
