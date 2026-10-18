// [AUNEA-UAT-ASIS-SCOPE-133] START — Scope consistency review
// SOURCE: Diagnostic Master DF011/014/015/031; DEC-050/065/073; PROJECT_RULES.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../domain/process-lifecycle.js'),'utf8');
function slice(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a);return src.slice(i,j)}
const code=slice('const CONSISTENCY_LAYER_STAGE=','// [AUNEA-FE-ASIS-CONSISTENCY-076] E'+'ND');
const ctx={
  schema:{fields:[]},
  normalizeArray:v=>Array.isArray(v)?v:v==null||v===''?[]:[v],
  processLayerConfirmations:e=>e.layerConfirmations||{map:true,frictions:true,risks:true,impact:true},
  captureIntegrityIssues:()=>[],
  valuePresent:v=>v!==null&&v!==undefined&&v!==''
};
vm.createContext(ctx);vm.runInContext(code,ctx);
const base={answers:{DF011:'Recepción y registro de facturas',DF014:'Factura PDF recibida por correo',DF015:'Factura registrada en ERP y archivada'},
  processName:'Recepción y registro de facturas',
  processSteps:[{id:'a',step_name:'Recibir factura PDF'},{id:'b',step_name:'Comprobar importe de factura'},{id:'c',step_name:'Archivar factura en ERP'}],
  layerConfirmations:{map:true,frictions:true,risks:true,impact:true},answerDetails:{}};
const copy=x=>JSON.parse(JSON.stringify(x));
const codes=e=>Array.from(ctx.processScopeReviewSignals(e),x=>x.code);
test('coherent invoice process does not produce a false mismatch warning',()=>assert.deepEqual(codes(base),[]));
test('incompatible declared process triggers explicit review',()=>{
  const e=copy(base);e.answers.DF011='Gestión de solicitudes de cambio de clientes';
  e.answers.DF014='Recepción de una solicitud de cambio de cliente activo';
  e.answers.DF015='Solicitud registrada, trabajo asignado y cliente informado';
  assert.ok(codes(e).includes('SCOPE_NAME_SOURCE_DISAGREEMENT'));
  assert.ok(ctx.preCloseConsistencyReview(e,{blockers:[]}).blockers.length>0);
});
test('review marker is invalidated after a source step change',()=>{
  const e=copy(base);e.answers.DF011='Gestión de solicitudes de cambio de clientes';
  e.answerDetails.DF011__scope_map_review={fingerprint:ctx.processScopeReviewFingerprint(e)};
  assert.equal(ctx.scopeReviewAcknowledged(e),true);
  e.processSteps[0].step_name='Actividad modificada';
  assert.equal(ctx.scopeReviewAcknowledged(e),false);
});
test('warning is a review prompt, not an automatic diagnosis of mismatch',()=>{
  const e={answers:{DF011:'Planificación de visitas técnicas',DF014:'Aviso de mantenimiento recibido',DF015:'Orden asignada y cliente informado'},
    processSteps:[{id:'a',step_name:'Recibir aviso de servicio'},{id:'b',step_name:'Completar dirección y alcance del trabajo'},{id:'c',step_name:'Clasificar urgencia y ruta'}]};
  assert.equal(codes(e).includes('SCOPE_MAP_TOPIC_NOT_VISIBLE'),false);
});
test('declining explicit scope review prevents map confirmation',()=>{
  const e=copy(base);e.answers.DF011='Gestión de solicitudes de cambio de clientes';
  e.layerConfirmations={map:false,frictions:false,risks:false,impact:false};
  const local={...ctx,state:{dirty:false,audit:[]},currentEng:()=>e,guardAsisMutation:()=>false,
    processLayerKey:()=> 'map',processLayerIntegrityIssues:()=>[],activeSteps:eng=>eng.processSteps,
    allProcessLayersConfirmed:()=>false,markDirty:()=>{},toast:()=>{},audit:()=>{},render:()=>{},
    now:()=> '2026-10-18T10:00:00Z',confirm:()=>false,persistRecoverySnapshot:()=>true};
  vm.createContext(local);vm.runInContext(slice('function confirmProcessLayer(tab){','function confirmAsIs(){'),local);
  assert.equal(local.confirmProcessLayer('cliente'),false);
  assert.equal(e.layerConfirmations.map,false);
});
test('failed durable save rolls back the explicit scope acknowledgement',()=>{
  const e=copy(base);e.answers.DF011='Gestión de solicitudes de cambio de clientes';
  e.layerConfirmations={map:false,frictions:false,risks:false,impact:false};
  const state={dirty:false,audit:[]};
  const local={...ctx,state,currentEng:()=>e,guardAsisMutation:()=>false,
    processLayerKey:()=> 'map',processLayerIntegrityIssues:()=>[],activeSteps:eng=>eng.processSteps,
    allProcessLayersConfirmed:()=>false,markDirty:()=>{state.dirty=true},toast:()=>{},audit:()=>{},render:()=>{},
    now:()=> '2026-10-18T10:00:00Z',confirm:()=>true,persistRecoverySnapshot:()=>false};
  vm.createContext(local);vm.runInContext(slice('function confirmProcessLayer(tab){','function confirmAsIs(){'),local);
  assert.equal(local.confirmProcessLayer('cliente'),false);
  assert.equal(e.answerDetails.DF011__scope_map_review,undefined);
});
// [AUNEA-UAT-ASIS-SCOPE-133] END
