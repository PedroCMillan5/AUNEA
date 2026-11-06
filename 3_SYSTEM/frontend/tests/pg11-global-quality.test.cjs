// [AUNEA-UAT-PG11-GLOBAL-QUALITY-302] START
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../domain/internal-ai-global-quality.js'),'utf8');
function run(items){const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
 return JSON.parse(JSON.stringify(ctx.tobeGlobalQualityGroups(items)));}
function item(objective,how,id){
 return {objective,how,why:'Fricción confirmada de origen.',source_refs:[id],
  review:{status:'CONDITIONED',reason:'Comprobar viabilidad.',conflicts:[]}};}
test('5 proposals remain intact across 4 coherent action-focused groups',()=>{
 const items=[
 item('Evitar volver a teclear datos en recepción.',
   'Reutilizar datos de factura ya introducidos en ERP.','F1'),
 item('Evitar volver a teclear datos en recepción.',
   'Establecer recordatorio por correo con el estado de la factura.','F2'),
 item('Reducir esperas de aprobación.',
   'Establecer recordatorio de aprobación de facturas al responsable.','F3'),
 item('Evitar volver a teclear datos en recepción.',
   'Enviar recordatorio a recepción con confirmación de la factura.','R1'),
 item('Evitar registrar dos veces datos de factura.',
   'Validar campos del ERP y reutilizar información de factura.','R2')];
 const before=JSON.stringify(items),out=run(items);
 assert.equal(out.recommendations,5);
 assert.equal(out.groups.length,4);
 assert.equal(out.relatedGroups,1);
 assert.ok(out.reviewCount>=2);
 assert.equal(out.groups.flatMap(g=>g.entries).length,5);
 assert.equal(JSON.stringify(items),before);
});
test('no quota or merge of different review statuses',()=>{
 for(const count of [0,1,2,5,9]){
  const items=Array.from({length:count},(_,i)=>
    item('Mejorar actividad '+i,'Estandarizar tarea diferente '+i+'.','F'+i));
  const data=run(items);
  assert.equal(data.recommendations,count);
  assert.equal(data.groups.length,count);
 }
});
 test('canonical PG11 groups five saved cards into four lines preserving sources',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../pages/results.js'),'utf8');
 const view=src.match(/\/\/ \[AUNEA-FE-PG11-GLOBAL-OVERVIEW-284\] START[\s\S]*?\/\/ \[AUNEA-FE-PG11-GLOBAL-OVERVIEW-284\] END/)?.[0];
 assert.ok(view,'missing canonical PG11 view');
 const items=[
  item('Evitar volver a teclear datos en recepción.','Reutilizar datos de factura ya introducidos en ERP.','F1'),
  item('Evitar volver a teclear datos en recepción.','Establecer recordatorio por correo con el estado de la factura.','F2'),
  item('Reducir esperas de aprobación.','Establecer recordatorio de aprobación de facturas al responsable.','F3'),
  item('Evitar volver a teclear datos en recepción.','Enviar recordatorio a recepción con confirmación de la factura.','R1'),
  item('Evitar registrar dos veces datos de factura.','Validar campos del ERP y reutilizar información de factura.','R2')
 ];
 const e={id:'E1',confirmedSnapshots:[{version:3,frictions:[],risks:[]}]};
 const p={status:'DRAFT',version:2,sourceSnapshotVersion:3,items:[],aiGlobal:{
   tobeVersion:2,sourceSnapshotVersion:3,diagnosticInputHash:'HASH',
   result:{status:'DRAFT',engagement_id:'E1',snapshot_version:3,
     summary:'El proceso tiene mejoras verificables.',opportunities:items}
 }};
 const ctx={currentDiagnosticOutput:()=>({input_snapshot_hash:'HASH'}),
   tobeEditable:()=>true,tobeProposalSnapshot:e=>e.confirmedSnapshots[0],
   tobeProposalSourceSteps:()=>[],engagementOfRecord:e=>e,
   internalAiGlobalWorking:()=>false,internalAiGlobalMessage:()=>null,
   esc:x=>String(x||'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
   attr:x=>String(x||'').replaceAll('"','&quot;'),
   tobeHumanReviewRecord:()=>null};
 vm.createContext(ctx);vm.runInContext(code,ctx);vm.runInContext(view,ctx);
 const before=JSON.stringify(p.aiGlobal.result.opportunities);
 const html=ctx.tobeGlobalOverviewHtml(e,p);
 assert.equal((html.match(/class="tobe-global-opportunity"/g)||[]).length,4);
 assert.equal((html.match(/class="tobe-global-intervention"/g)||[]).length,5);
 assert.match(html,/Coherencia por revisar/);
 assert.match(html,/Objetivo original/);
 assert.match(html,/F1/);
 assert.equal(JSON.stringify(p.aiGlobal.result.opportunities),before);
});
test('status values such as Aprobada/Rechazada do not mean an approval reminder',()=>{
 const cases=[
  item('Reducir consultas de estado.',
    'Establecer recordatorio en correo de recepción con estado actual En revisión, Aprobada, Rechazada.','F1'),
  item('Reducir esperas de aprobación.',
    'Establecer recordatorio para el manager responsable de aprobar una factura pendiente.','F2'),
  item('Relacionar recepción y ERP.',
    'Confirmar la recepción con número de factura y referencia del registro en ERP.','R1')
 ];
 const groups=run(cases).groups;
 assert.deepEqual(groups.map(g=>g.kind),['VISIBILITY','APPROVAL_FOLLOWUP','TRACEABILITY']);
 assert.equal(groups.length,3);
 assert.deepEqual(groups.map(g=>g.entries.length),[1,1,1]);
});
test('technical checks, conflicts and unknown classifications are not silently certified',()=>{
 const notKnown=item('Mejorar el proceso.','Optimizarlo.','F1');
 const blocked=item('Mantener decisiones.','Registrar acciones sin auditoría.','R1');
 blocked.review={status:'INCOMPATIBLE',conflicts:[{source:'DF090',reason:'Control obligatorio.'}]};
 const checked=item('Reutilizar datos.','Reutilizar campos existentes de factura en ERP.','F2');
 checked.review.verifications=[{source:'CAPACIDAD_TECNICA',question:'Verificar campos disponibles.'}];
 const out=run([notKnown,blocked,checked]);
 assert.equal(out.recommendations,3);
 assert.equal(out.groups.length,3);
 assert.equal(out.unclassified,2);
 assert.ok(out.reviewCount>=2);
 assert.equal(out.groups.filter(g=>g.incompatible).length,1);
 assert.deepEqual(out.groups[2].technicalChecks,['Verificar campos disponibles.']);
 assert.equal(out.priority,'NOT_ESTABLISHED_WITHOUT_EVIDENCE');
});
// [AUNEA-UAT-PG11-GLOBAL-QUALITY-302] END
