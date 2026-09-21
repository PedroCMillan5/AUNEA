// [AUNEA-UAT-PROC-010] START — Process/friction regression
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const code=fs.readFileSync(path.join(__dirname,'..','domain/process.js'),'utf8');
const eng={processSteps:[],frictions:[],answers:{}};
const domFields={};
const ctx={console,schema:{friction_pain_map:[{Friction_Type_ID:'P07',Pain_ID:'P07'}]},state:{returnTo:null},fieldOptions:()=>[],normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),currentEng:()=>eng,activeSteps:e=>(e.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),activeFrictions:e=>(e.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),bindForms:()=>{},markDirty:()=>{},render:()=>{},attr:v=>String(v??''),esc:v=>String(v??''),labelFrom:(s,v)=>v,num:v=>String(v||0),pageTop:()=>'',section:(t,s,body)=>body,fmtDate:()=>'',requiredMark:()=>'<span class="required-mark">*</span>',audit:()=>{},id:p=>`${p}-${Math.random().toString(36).slice(2,7)}`,now:()=>'',toast:()=>{},closeModal:()=>{},openModal:(title,body,onSave)=>{ctx.__lastBody=body;ctx.__lastOnSave=onSave},document:{querySelectorAll:()=>[],getElementById:(elId)=>{if(!domFields[elId])domFields[elId]={};return domFields[elId]}}};vm.createContext(ctx);vm.runInContext(code,ctx);test('duration normalization keeps active/wait/rework comparable',()=>{assert.equal(ctx.minutesFrom(2,'h'),120);assert.equal(ctx.minutesFrom(1,'day'),1440)});test('friction pain is derived, not selected',()=>{assert.equal(ctx.painForFriction('P07'),'P07');assert.doesNotMatch(code,/id="fr_pain"/)});test('v1.1 editor includes communication channels',()=>{assert.match(code,/OS_COMM_CHANNEL/);assert.match(code,/communication_channels/)});test('friction UI enforces affected step selection before save',()=>{assert.match(code,/!f\.affected_steps\.length/)});

test('moveStep swaps only array position with the nearest ACTIVE neighbor, skipping SUPERSEDED steps, and never touches normal_next_step/exception_path/affected_steps',()=>{
  eng.processSteps=[
    {id:'S1',status:'ACTIVE',normal_next_step:'S2',exception_path:{destination_step:'S3'}},
    {id:'S2',status:'SUPERSEDED',normal_next_step:'S3'},
    {id:'S3',status:'ACTIVE',normal_next_step:null}
  ];
  eng.frictions=[{id:'F1',status:'ACTIVE',affected_steps:['S1','S3']}];
  ctx.moveStep('S1',1);
  assert.deepEqual(eng.processSteps.map(x=>x.id),['S3','S2','S1'],'S1 must swap with the nearest ACTIVE neighbor (S3), jumping over the SUPERSEDED S2');
  assert.equal(eng.processSteps.find(x=>x.id==='S1').normal_next_step,'S2','normal_next_step must survive reordering untouched');
  assert.deepEqual(eng.processSteps.find(x=>x.id==='S1').exception_path,{destination_step:'S3'},'exception_path must survive reordering untouched');
  assert.deepEqual(eng.frictions[0].affected_steps,['S1','S3'],'friction affected_steps must survive reordering untouched');
});

test('stepOrderDiscrepancies flags when the visual order no longer matches normal_next_step, without correcting it',()=>{
  const steps=[{id:'A',step_name:'Alta',normal_next_step:'C'},{id:'B',step_name:'Revisión',normal_next_step:null},{id:'C',step_name:'Cierre',normal_next_step:null}];
  const gaps=ctx.stepOrderDiscrepancies(steps);
  assert.equal(gaps.length,1);
  assert.equal(gaps[0].from.id,'A');
  assert.equal(gaps[0].to.id,'C');
});

test('"+ Crear nuevo paso como siguiente" links back to the origin step id without inventing a new normal_next_step shape',()=>{
  assert.match(code,/\+ Crear nuevo paso como siguiente/);
  assert.match(code,/function openStepModal\(stepId=null,linkFromStepId=null\)/);
  assert.match(code,/if\(linkFromStepId\)\{const origin=e\.processSteps\.find\(x=>x\.id===linkFromStepId\);if\(origin\)origin\.normal_next_step=s\.id\}/);
});

test('reorder buttons are wired to moveStep in both directions',()=>{
  assert.match(code,/data-move-step-up/);
  assert.match(code,/data-move-step-down/);
  assert.match(code,/moveStep\(b\.dataset\.moveStepUp,-1\)/);
  assert.match(code,/moveStep\(b\.dataset\.moveStepDown,1\)/);
});

test('processPage always defaults to the client-friendly canvas when opened',()=>{
  eng.processSteps=[{id:'s1',status:'ACTIVE',step_name:'Alta'}];
  eng.frictions=[];eng.risks=[];eng.economicInputs=[];
  eng.processTab='';eng.confirmedAsIs=false;eng.answers={DF014:'Inicio acordado',DF015:'Fin acordado'};
  let html=ctx.processPage();
  assert.match(html.match(/<button class="subtab[^"]*" data-process-tab="cliente">/)[0],/active/);
  assert.match(html,/Inicio acordado/);assert.match(html,/Fin acordado/);
  assert.match(html,/Fricciones y evidencia/);assert.match(html,/Riesgo y controles/);assert.match(html,/Impacto económico/);
});

test('addMultipleSteps creates exactly N steps carrying only technical id/status/empty-collection defaults — never an invented name/actor/type/tool/time/routing — each individually editable afterward',()=>{
  eng.processSteps=[];
  ctx.addMultipleSteps();
  domFields.bulk_step_count={value:'4'};
  ctx.__lastOnSave();
  assert.equal(eng.processSteps.length,4);
  eng.processSteps.forEach((s,i)=>{
    assert.ok(s.id);
    assert.equal(s.status,'ACTIVE');
    assert.equal(s.step_name,undefined,`step ${i} must not have an invented name`);
    assert.equal(s.actor,undefined,`step ${i} must not have an invented actor`);
    assert.equal(s.step_type,undefined,`step ${i} must not have an invented type`);
    assert.equal(s.tool,undefined,`step ${i} must not have an invented tool`);
    assert.equal(s.active_time,0);assert.equal(s.wait_time,0);assert.equal(s.rework_time,0);
    assert.equal(s.normal_next_step,undefined,'no invented routing');
    assert.equal(s.evidence.length,0);
  });
  // Visual numbering is just array position — the list row already falls back to a visible
  // "Sin nombre — editar" label, so a bulk-created step is never silently unreachable.
  assert.match(code,/Sin nombre — editar/);
  eng.processSteps=[];
});

test('"+ Añadir varios pasos" is a distinct control from "Añadir paso" and from the Internal/QA stress-test tool',()=>{
  assert.match(code,/id="addMultipleSteps">\+ Añadir varios pasos/);
  assert.match(code,/id="addStep">Añadir paso/);
});

test('the Process Step modal groups all 20 canonical attributes into 6 progressive-disclosure sections (A-F), only A open by default, without changing any field id or the schema',()=>{
  const groups=[...code.matchAll(/<details class="step-group"( open)?><summary>([A-F])\. ([^<]+)<\/summary>/g)];
  assert.equal(groups.length,6,'exactly 6 step-group sections must exist');
  assert.deepEqual(groups.map(m=>m[2]),['A','B','C','D','E','F']);
  assert.equal(groups[0][1],' open','only group A (Información básica) starts open');
  groups.slice(1).forEach((m,i)=>assert.equal(m[1],undefined,`group ${m[2]} must start collapsed`));
  // Same 20 field ids as before regrouping — this is presentation-only, never a schema change.
  ['step_name','step_type','step_actor','step_tool','step_occ','step_applies_mode','step_inputs_detail','step_outputs_detail','step_active','step_wait','step_rework','step_error','step_decisions_detail','step_next','step_exc_type','step_manual','step_auto','step_channels_other','step_evidence','step_notes'].forEach(fid=>{
    assert.match(code,new RegExp(`id="${fid}"|'${fid}'|"${fid}"`),`${fid} must still exist in the modal template`);
  });
});

test('automation_state reuses the shared segmented() renderer instead of a second hand-duplicated button-list template, keeping its own data-step-auto write target (the step object, not e.answers)',()=>{
  assert.match(code,/segmented\('step_auto',auto,s\.automation_state,'data-step-auto'\)/);
  assert.doesNotMatch(code,/auto\.map\(o=>`<button/,'the old duplicated inline template must be gone');
  assert.match(code,/s\.automation_state=b\.dataset\.value/,'the local binder reads the same data-value attribute the shared renderer emits');
});

test('actor/tool reference controls use the shared select affordance and keep an explicit Other detail path',()=>{
  const html=ctx.datalistControl('step_actor','OS_ACTOR_ROLE','','Rol existente o nuevo');
  assert.match(html,/catalog-reference-control combo-wrap/);
  assert.match(html,/<select id="step_actor"/);
  assert.match(html,/data-catalog-reference="step_actor"/);
  assert.match(html,/data-catalog-other-wrap="step_actor"/);
  assert.doesNotMatch(html,/<datalist/);
});

test('decision detail is hidden unless canonical Other is selected, and step deletion is a confirmed remove-from-flow action',()=>{
  assert.match(code,/data-step-decision-other-wrap/);
  assert.match(code,/decisionOtherBox\.checked\?'':'none'/);
  assert.match(code,/function removeStepFromFlow\(stepId\)/);
  assert.match(code,/openModal\('Eliminar paso del flujo'/);
  assert.match(code,/step\.status='SUPERSEDED'/);
  assert.match(code,/data-delete-step/);
});

test('the Friction modal groups fields into layer 1 (tipo/pasos/señal/contexto-impacto, open) and layer 2 (causa/workaround/evidencia/resto, collapsed), same field ids, no Friction Model change',()=>{
  const groups=[...code.matchAll(/<details class="step-group"( open)?><summary>([^<]+)<\/summary>/g)];
  const frGroups=groups.filter(g=>/Fricción|Causa, workaround/.test(g[2]));
  assert.equal(frGroups.length,2);
  assert.equal(frGroups[0][1],' open','layer 1 (Fricción) must be open by default');
  assert.equal(frGroups[1][1],undefined,'layer 2 (causa/workaround/evidencia) must start collapsed');
  ['fr_type','fr_steps','fr_signal','fr_frequency','fr_impact','fr_causes','fr_workaround','fr_evidence_type','fr_active','fr_wait','fr_direct','fr_non_time','fr_priority','fr_label','fr_notes'].forEach(fid=>{
    assert.match(code,new RegExp(`id="${fid}"|'${fid}'`),`${fid} must still exist`);
  });
});

test('fr_cause_other and fr_workaround_other are collapsed behind a "+ Otro" toggle by default, matching the Bloque B pattern',()=>{
  assert.match(code,/data-fr-other-toggle="fr_cause_other"/);
  assert.match(code,/data-fr-other-toggle="fr_workaround_other"/);
  assert.match(code,/data-fr-other-wrap="fr_cause_other"\$\{f\._details\.cause\?'':' style="display:none"'\}/);
  assert.match(code,/data-fr-other-wrap="fr_workaround_other"\$\{f\._details\.workaround\?'':' style="display:none"'\}/);
  assert.match(code,/\[data-fr-other-toggle\]/);
});

test('client-first process view exposes both template entry points and fixed PG02 boundaries',()=>{
  eng.processSteps=[];eng.frictions=[];eng.risks=[];eng.economicInputs=[];eng.processTab='cliente';eng.answers={DF014:'Inicio fijo',DF015:'Fin fijo'};
  const html=ctx.processPage();
  assert.match(html,/Inicio fijo/);
  assert.match(html,/Fin fijo/);
  assert.match(code,/id="useProcessTemplate">Usar plantilla de flujo/);
  assert.match(code,/id="addStepTemplate">Añadir desde plantilla de paso/);
  assert.match(code,/id="addStepFromClient">Añadir paso intermedio/);
});

test('template system offers governed structural Process and Step starters as editable drafts',()=>{
  assert.match(code,/TPL-PROC-LINEAR-001/);
  assert.match(code,/TPL-PROC-APPROVAL-001/);
  assert.match(code,/TPL-PROC-DECISION-001/);
  assert.match(code,/TPL-STEP-TASK-001/);
  assert.match(code,/TPL-STEP-DECISION-001/);
  assert.match(code,/TPL-STEP-APPROVAL-001/);
  assert.match(code,/template_provenance:templateMeta\?/);
  assert.match(code,/state:'DRAFT'/);
  assert.match(code,/Los pasos actuales se eliminarán del flujo visible/);
});
// [AUNEA-UAT-PROC-010] END
