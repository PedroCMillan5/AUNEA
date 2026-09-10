// [AUNEA-UAT-PROC-HELP-015] START — Process Step contextual-help regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','app-process-help-v1.js'),'utf8');

function makeCtx(){
  let openCalls=0;
  const field={html:'',querySelector:()=>null,insertAdjacentHTML:(where,html)=>{field.html+=html}};
  const control={closest:()=>field};
  const ctx={
    schema:{
      process_step_model:[
        {Field_Key:'active_time',Canonical_Field_ID:'DF037',Etiqueta_ES:'Tiempo activo típico',Validacion:'>=0 + evidence type si material.',Ejemplo:'12 min',Engine_Use:'Economics'},
        {Field_Key:'applies_to',Canonical_Field_ID:null,Etiqueta_ES:'¿A qué casos aplica este paso?',Validacion:'Todos / % / condición.',Ejemplo:'Sólo solicitudes >10.000 €',Engine_Use:'Economics; Recommendation'}
      ],
      fields:[{Field_ID:'DF037',Objetivo_concreto:'Separar trabajo activo de espera y retrabajo.'}]
    },
    attr:v=>String(v??''),esc:v=>String(v??''),
    openStepModal:()=>{openCalls++;return 'base-result'},
    document:{querySelector:(selector)=>selector==='#step_active'?control:null}
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  return {ctx,field,getOpenCalls:()=>openCalls};
}

test('help content is derived from Process Step Model plus the matching canonical field objective',()=>{
  const {ctx}=makeCtx();
  const html=ctx.processStepHelpHtml('active_time');
  assert.match(html,/Separar trabajo activo de espera y retrabajo/);
  assert.match(html,/Qué se espera: &gt;=0 \+ evidence type si material\./);
  assert.match(html,/Ejemplo: 12 min/);
  assert.match(html,/class="internal-only">Campo DF037 · Uso: Economics/);
});

test('attributes without Canonical_Field_ID still use the canonical Process Step validation/example and invent no objective',()=>{
  const {ctx}=makeCtx();
  const html=ctx.processStepHelpHtml('applies_to');
  assert.match(html,/Todos \/ % \/ condición/);
  assert.match(html,/Sólo solicitudes &gt;10\.000 €/);
  assert.doesNotMatch(html,/Campo DF/);
});

test('openStepModal keeps the existing editor behavior and only appends presentation help',()=>{
  const {ctx,field,getOpenCalls}=makeCtx();
  const result=ctx.openStepModal('STEP-1');
  assert.equal(result,'base-result');
  assert.equal(getOpenCalls(),1);
  assert.match(field.html,/data-process-help="active_time"/);
  assert.match(field.html,/Tiempo activo|Separar trabajo activo/);
});
// [AUNEA-UAT-PROC-HELP-015] END
