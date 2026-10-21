// [AUNEA-UAT-PG02-SCOPE-141] START — PG02 boundary display + owner provenance regression
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),page=fs.readFileSync(path.join(root,'pages/diagnostic-stages.js'),'utf8'),noreask=fs.readFileSync(path.join(root,'domain/no-reask.js'),'utf8');
function slice(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'required block exists: '+start);return s.slice(a,b)}
function context(steps){
 const e={businessAreaId:'D14',answers:{DF014:'La recepción por Administración de la factura PDF adjunta al email del proveedor.',DF015:'El registro de la factura en ERP y el archivo del expediente, con aprobación humana cuando proceda.'},processSteps:steps};
 const ctx={activeSteps:x=>x.processSteps.filter(p=>p.status!=='SUPERSEDED'),esc:String,attr:String,processScopeReviewSignals:()=>[],scopeReviewAcknowledged:()=>false};
 vm.createContext(ctx);
 vm.runInContext(slice(page,'function pg02BoundaryReviewHtml(e){','// ['+'AUNEA-FE-SCOPE-PG02-139'+'] END'),ctx);
 return {ctx,e}
}
test('PG02 has no fabricated comparison before any process steps are present',()=>{
 const {ctx,e}=context([]);
 assert.equal(ctx.pg02BoundaryReviewHtml(e),'');
});
test('PG02 displays original boundaries and actual first/last map step without mutating source',()=>{
 const {ctx,e}=context([{step_name:'Recibir factura',status:'ACTIVE'},{step_name:'Aprobar factura',status:'SUPERSEDED'},{step_name:'Registrar en ERP y archivar',status:'ACTIVE'}]);
 const before=JSON.stringify(e),html=ctx.pg02BoundaryReviewHtml(e);
 for(const term of ['Inicio declarado en Alcance','Final declarado en Alcance','Primer paso del mapa','Último paso del mapa','Recibir factura','Registrar en ERP y archivar','Pendiente de revisar/confirmar']){
  assert.ok(html.includes(term),term);
 }
 assert.ok(!html.includes('Aprobar factura'));
 assert.equal(JSON.stringify(e),before);
});
test('PG02 boundaries expose complete read-only preview without storing another answer',()=>{
 assert.match(noreask,/data-boundary-preview/);
 assert.match(noreask,/longBoundary/);
 assert.match(noreask,/String\(val\)/);
 assert.match(noreask,/<details class="boundary-full-preview"/);
 assert.doesNotMatch(slice(noreask,'const longBoundary=',"  const wide="),/setAnswer\(/);
});
test('PG02 business area uses the study owner saved state, not reused CRM provenance',()=>{
 const body=slice(page,'function engagementBusinessAreaBlock(e){','// ['+'AUNEA-FROZEN-STAGE-S02-001'+'] END');
 assert.match(body,/e\.businessAreaId\?fieldStatusIcon\('saved'\)/);
 assert.doesNotMatch(body,/fieldStatusIcon\('reused'/);
});
test('progress badge names requirements met, not stages explicitly reviewed by a person',()=>{
 assert.match(page,/Etapas con requisitos cumplidos/);
 assert.doesNotMatch(slice(page,'function captureProgressHtml(e,stage){','function refreshCaptureProgress(){'),/Etapas revisadas/);
});
// [AUNEA-UAT-PG02-SCOPE-141] END
