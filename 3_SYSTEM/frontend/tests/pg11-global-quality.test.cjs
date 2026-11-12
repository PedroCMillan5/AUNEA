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
 assert.ok(out.reviewCount>=1,'unclassified suggestions remain review warnings; incompatibility is counted separately');
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
 const src=require('./pg11-source.cjs')();
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
 assert.match(html,/Comparar propuestas y consultar evidencias/);
 assert.match(html,/Coherencia \(revisión pendiente\):/);
 assert.match(html,/RESULTADO QUE SE BUSCA/);
 assert.match(html,/Priorización pendiente:/);
 assert.match(html,/Objetivo original/);
 assert.match(html,/Referencia de origen sin descripción disponible en el AS-IS/);
 assert.doesNotMatch(html,/>F1</);
 assert.equal(p.aiGlobal.result.opportunities[0].source_refs[0],'F1');
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
 assert.equal(out.unclassified,1,'technical mechanism can be classified without guessing an industry');
 assert.ok(out.reviewCount>=1,'classification alerts and confirmed incompatibilities are separate');
 assert.equal(out.groups.filter(g=>g.incompatible).length,1);
 assert.deepEqual(out.groups[2].technicalChecks,['Verificar campos disponibles.']);
 assert.equal(out.priority,'NOT_ESTABLISHED_WITHOUT_EVIDENCE');
});

test('general grouping works across sectors without requiring domain names',()=>{
 const cases=[
  item('Evitar repetir la captura en atención.','Reutilizar datos ya capturados en sistema de atención.','S1'),
  item('Reducir la captura duplicada.','Validar campos y reutilizar datos en sistema de atención.','S2'),
  item('Evitar repetir inventario.','Reutilizar campos del sistema de logística.','S3'),
  item('Evitar duplicación en reservas.','Reutilizar campos del sistema de reservas de hotel.','S4')
 ];
 const input=JSON.stringify(cases),out=run(cases);
 assert.equal(out.recommendations,4);
 assert.equal(out.groups.length,3,'unrelated business contexts must not be collapsed');
 assert.equal(out.groups[0].entries.length,2,'related process functions may group without sector catalogue');
 assert.equal(JSON.stringify(cases),input,'grouping must be projection-only');
 assert.ok(out.groups.every(g=>g.priority==='SIN_PRIORIZAR'));
});

test('semantic overlaps are flagged but source interventions and statuses are preserved',()=>{
 const a=item('Evitar duplicación.','Reutilizar campos del sistema de reservas existentes.','S1'),
   b=item('Reducir repetición.','Reutilizar los campos existentes del sistema de reservas.','S1'),
   c=item('Conservar aprobaciones.','Eliminar auditoría y mantener decisiones.','S1');
 c.review.status='INCOMPATIBLE';
 const out=run([a,b,c]);
 assert.equal(out.recommendations,3);
 assert.equal(out.groups.flatMap(g=>g.entries).length,3);
 assert.ok(out.groups.flatMap(g=>g.entries).some(e=>e.issues.some(s=>/redundancia semántica/.test(s))));
 assert.equal(out.groups.filter(g=>g.incompatible).length,1);
 assert.equal(out.status,'DRAFT_UNAPPROVED');
});

test('operational effort advisories are visible, do not become client restrictions',()=>{
 const proposal=item('Reducir reprocesos.','Introducir un nuevo formulario de seguimiento.','S1');
 proposal.review.operational_checks=[{source:'IMPACTO_OPERATIVO_PENDIENTE',
  question:'Verificar si este formulario sustituye tareas actuales.'}];
 const out=run([proposal]);
 assert.equal(out.operationalReviewCount,1);
 assert.equal(out.groups[0].operationalChecks.length,1);
 assert.equal(out.groups[0].incompatible,false);
 assert.equal(out.groups[0].qualityFlagged,true);
});

test('advisory review identifies unnecessary intermediate work without rejecting recommendations',()=>{
 const cases=[
   item('Reducir la captura duplicada de datos.',
     'Establecer un formulario adicional para reutilizar información existente.','F1'),
   item('Facilitar seguimiento del estado.',
     'Enviar un aviso automatizado con el estado del expediente.','F2'),
   item('Garantizar el seguimiento de operaciones.',
     'Establecer un registro intermedio con metadatos.','R1')
 ];
 const out=run(cases);
 const issues=out.groups.flatMap(g=>g.entries.flatMap(e=>e.issues));
 assert.ok(issues.some(x=>x.includes('formulario')));
 assert.ok(issues.some(x=>x.includes('estado comunicado')));
 assert.ok(issues.some(x=>x.includes('registro adicional')));
 assert.equal(out.recommendations,3);
 assert.equal(out.groups.flatMap(g=>g.entries).length,3);
 assert.equal(out.status,'DRAFT_UNAPPROVED');
});
test('related proposals signal possible overlap without removing the originals',()=>{
 const a=item('Evitar introducir datos repetidos.',
   'Reutilizar datos registrados para completar validaciones.','F1');
 const b=item('Reducir trabajos de recaptura.',
   'Validar datos ya registrados y reutilizar la captura.','F2');
 const groups=run([a,b]).groups;
 assert.equal(groups.flatMap(g=>g.entries).length,2);
 const related=groups.find(g=>g.entries.length===2);
 if(related)assert.match(related.reviewHint,/alternativas o actuaciones complementarias/);
});

// [AUNEA-UAT-PG11-GLOBAL-QUALITY-302] END
