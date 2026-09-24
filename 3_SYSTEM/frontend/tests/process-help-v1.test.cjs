// [AUNEA-UAT-PROC-HELP-015] START — Process Step / Friction contextual-help regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','ui/process-help.js'),'utf8');

function makeCtx(){
  let openStepCalls=0,openFrictionCalls=0;
  const label={html:'',insertAdjacentHTML:(where,html)=>{label.html+=html}};
  const field={querySelector:sel=>sel==='label'?label:null};
  const control={closest:()=>field};
  const domRoot={ids:{}};
  const ctx={
    schema:{
      process_step_model:[
        {Field_Key:'active_time',Canonical_Field_ID:'DF037',Etiqueta_ES:'Tiempo activo típico',Validacion:'>=0 + evidence type si material.',Ejemplo:'12 min',Engine_Use:'Economics'},
        {Field_Key:'applies_to',Canonical_Field_ID:null,Etiqueta_ES:'¿A qué casos aplica este paso?',Validacion:'Todos / % / condición.',Ejemplo:'Sólo solicitudes >10.000 €',Engine_Use:'Economics; Recommendation'}
      ],
      friction_model:[
        {Field_Key:'observable_signal',Canonical_Field_ID:'DF999FR',Etiqueta_ES:'Señal observable',Validacion:'Hecho verificable.',Ejemplo:'Casos >48h esperando aprobación',Engine_Use:'Pain'}
      ],
      fields:[
        {Field_ID:'DF037',Objetivo_concreto:'Separar trabajo activo de espera y retrabajo.'},
        {Field_ID:'DF999FR',Objetivo_concreto:'Registrar un hecho verificable, no una opinión.'}
      ]
    },
    attr:v=>String(v??''),esc:v=>String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])),
    openStepModal:()=>{openStepCalls++;return 'step-base-result'},
    openFrictionModal:()=>{openFrictionCalls++;return 'friction-base-result'},
    document:{
      querySelector:(selector)=>(selector==='#step_active'||selector==='#fr_signal')?control:null,
      querySelectorAll:()=>[],
      getElementById:id=>domRoot.ids[id]||null
    }
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  return {ctx,label,getOpenStepCalls:()=>openStepCalls,getOpenFrictionCalls:()=>openFrictionCalls};
}

test('help content is derived from the canonical model plus the matching Diagnostic Field objective, never inventing new copy',()=>{
  const {ctx}=makeCtx();
  const content=ctx.helpContent('process_step_model','active_time');
  assert.match(content.visible.join(' | '),/Separar trabajo activo de espera y retrabajo/);
  assert.match(content.visible.join(' | '),/Qué se espera: >=0 \+ evidence type si material\./);
  assert.match(content.visible.join(' | '),/Ejemplo: 12 min/);
  assert.match(content.internal,/Campo DF037 · Uso: Economics/);
});

test('attributes without Canonical_Field_ID still use the canonical validation/example and invent no objective',()=>{
  const {ctx}=makeCtx();
  const content=ctx.helpContent('process_step_model','applies_to');
  assert.match(content.visible.join(' | '),/Todos \/ % \/ condición/);
  assert.match(content.visible.join(' | '),/Sólo solicitudes >10\.000 €/);
  assert.doesNotMatch(content.internal,/Campo DF/);
});

test('helpIconHtml renders a discreet, keyboard-focusable <button> (native tabbing/Enter/Space, no extra wiring needed) plus a popover that starts closed, technical metadata kept internal-only',()=>{
  const {ctx}=makeCtx();
  const html=ctx.helpIconHtml('process_step_model','active_time');
  assert.match(html,/<button type="button" class="help-icon"/);
  assert.doesNotMatch(html,/tabindex/,'a native <button> needs no tabindex hack to be keyboard-reachable');
  assert.match(html,/aria-expanded="false"/);
  assert.match(html,/class="help-popover"[^>]*role="tooltip"/);
  assert.doesNotMatch(html,/class="help-popover open"/,'must start closed');
  assert.match(html,/class="internal-only">Campo DF037/);
});

test('openStepModal decorates the Process Step form with help icons next to each field label, and keeps the original return value/behavior intact',()=>{
  const {ctx,label,getOpenStepCalls}=makeCtx();
  const result=ctx.openStepModal('STEP-1');
  assert.equal(result,'step-base-result');
  assert.equal(getOpenStepCalls(),1);
  assert.match(label.html,/help-icon/);
  assert.match(label.html,/Separar trabajo activo/);
});

test('openFrictionModal decorates the Friction form using friction_model, the same mechanism as Process Step',()=>{
  const {ctx,label,getOpenFrictionCalls}=makeCtx();
  const result=ctx.openFrictionModal('FR-1');
  assert.equal(result,'friction-base-result');
  assert.equal(getOpenFrictionCalls(),1);
  assert.match(label.html,/help-icon/);
  assert.match(label.html,/Registrar un hecho verificable, no una opinión/);
});
// [AUNEA-UAT-PROC-HELP-015] END
