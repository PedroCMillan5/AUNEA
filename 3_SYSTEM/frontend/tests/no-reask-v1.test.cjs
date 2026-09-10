// [AUNEA-UAT-NOREASK-010] START — No-Reask regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','app-no-reask-v1.js'),'utf8');
const company={id:'c1',name:'ACME',sector:'D25',country:'España'};
const eng={companyId:'c1',contactIds:['p1'],answers:{DF011:'Proceso'},answerDetails:{},processSteps:[{id:'s1',status:'ACTIVE',step_name:'Alta',actor:'A1',tool:'T1',active_time:10,rework_time:2,occurrences_per_case:1,communication_channels:['CH1'],inputs:['AR1'],outputs:['AR2']},{id:'s2',status:'ACTIVE',step_name:'Aprobación',step_type:'ST05',actor:'A2',tool:'T2',wait_time:60,decision_criteria:['DC1'],communication_channels:['CH2']}],frictions:[{id:'f1',status:'ACTIVE',friction_type:'P07',evidence_type:'EV02'}],risks:[],economicInputs:[],confirmedAsIs:false};
const opts={REF_COUNTRY_ISO3166:[{value:'ES',label:'España'}],REF_DOMAIN:[{value:'D25',label:'Professional Services Delivery'}],OS_COMM_CHANNEL:[{value:'CH1',label:'Email'},{value:'CH2',label:'Teams'},{value:'CH3',label:'Portal'}],OS_TOOL_CATEGORY:[],OS_ACTOR_ROLE:[],OS_ARTIFACT_TYPE:[],OS_FRICTION_TYPE:[{value:'P07',label:'Cuello'}]};
const ctx={console,schema:{fields:[{Field_ID:'DF001',Requiredness:'REQUIRED_90M',Ask_Mode:'PREFILL_CONFIRM',Reask_Policy:'CONFIRM_ONLY_IF_CHANGED',Branch_Rule_ID:'BR-BASE',Option_Set_ID:null,Write_Target:'RT_COMPANY.Company_Name',Pregunta_o_etiqueta_ES:'Nombre de la empresa'},{Field_ID:'DF050',Pregunta_o_etiqueta_ES:'Canales de comunicación utilizados',Objetivo_concreto:'',Requiredness:'CONDITIONAL_90M',Ask_Mode:'DERIVE_AND_CONFIRM',Reask_Policy:'DERIVE_THEN_CONFIRM',Branch_Rule_ID:'BR-TOOLS',Reuse_From:'RT_PROCESS_STEP.Communication_Channels',Option_Set_ID:'OS_COMM_CHANNEL',Validation:'0..N.',Ejemplo_ES:'Email; Teams'},{Field_ID:'DF094',Requiredness:'CONDITIONAL_90M',Ask_Mode:'SYSTEM_GENERATED',Branch_Rule_ID:'BR-CLOSE'}]},currentEng:()=>eng,companyById:()=>company,fieldOptions:id=>opts[id]||[],labelFrom:(id,v)=>(opts[id]||[]).find(o=>String(o.value)===String(v))?.label||v,normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),setAnswer:(fid,v)=>{eng.answers[fid]=v},setPage:()=>{},now:()=>new Date(0).toISOString(),markDirty:()=>{},audit:()=>{},answerDetails:e=>{e.answerDetails=e.answerDetails||{};return e.answerDetails},bindForms:()=>{},renderControl:()=>'<CONTROL>',render:()=>{},openModal:()=>{},id:p=>p,closeModal:()=>{},toast:()=>{},state:{companies:[company]},document:{querySelectorAll:()=>[],getElementById:()=>({})},esc:v=>String(v??''),attr:v=>String(v??'')};
vm.createContext(ctx);vm.runInContext(code,ctx);
test('NR03 derives channels from process steps',()=>{assert.deepEqual(Array.from(ctx.reusedValue('DF050',eng)),['CH1','CH2']);});
test('legacy country label is canonicalized to ISO option value',()=>{assert.equal(ctx.reusedValue('DF005',eng),'ES');});
test('tool branch activates from two tools',()=>{assert.equal(ctx.branchActive('BR-TOOLS',eng),true);});
test('wait branch activates from step wait',()=>{assert.equal(ctx.branchActive('BR-WAIT',eng),true);});
test('existing CRM value renders as reused context rather than blank question',()=>{const f={Field_ID:'DF001',Pregunta_o_etiqueta_ES:'Empresa',Objetivo_concreto:'',Requiredness:'REQUIRED_90M',Ask_Mode:'PREFILL_CONFIRM',Reask_Policy:'CONFIRM_ONLY_IF_CHANGED',Branch_Rule_ID:'BR-BASE',Reuse_From:'RT_COMPANY.Company_Name',Option_Set_ID:null,Validation:'',Ejemplo_ES:''};const html=ctx.renderQuestion(f,eng);assert.match(html,/Dato reutilizado/);assert.match(html,/ACME/);assert.doesNotMatch(html,/<CONTROL>/);});
test('required gaps use effective reused values and AS-IS gates',()=>{const gaps=Array.from(ctx.canonicalMissingRequired(eng));assert.ok(!gaps.includes('DF001'));assert.ok(gaps.includes('Confirmación AS-IS'));});

test('human provenance is unobtrusive while technical Reuse_From/Reask_Policy is explicitly internal-only',()=>{
  const f={Field_ID:'DF001',Pregunta_o_etiqueta_ES:'Empresa',Objetivo_concreto:'',Requiredness:'REQUIRED_90M',Ask_Mode:'PREFILL_CONFIRM',Reask_Policy:'CONFIRM_ONLY_IF_CHANGED',Branch_Rule_ID:'BR-BASE',Reuse_From:'RT_COMPANY.Company_Name',Option_Set_ID:null,Validation:'',Ejemplo_ES:''};
  const html=ctx.renderQuestion(f,eng);
  assert.match(html,/class="context-label internal-only">Dato reutilizado/);
  assert.match(html,/class="internal-only">Tomado de: Nombre de la empresa/);
  assert.match(html,/class="field-help internal-only technical-provenance"/);
  assert.match(html,/Reuse_From:<\/b> RT_COMPANY\.Company_Name/);
  assert.match(html,/Reask_Policy:<\/b> CONFIRM_ONLY_IF_CHANGED/);
  assert.match(html,/data-goto-source="contactos"/);
});

test('provenance falls back to a generic label and inline edit when Reuse_From does not resolve to a single owning field',()=>{
  const f={Field_ID:'DF054',Pregunta_o_etiqueta_ES:'Integraciones manuales',Objetivo_concreto:'',Requiredness:'CONDITIONAL_90M',Ask_Mode:'PREFILL_CONFIRM',Reask_Policy:'CONFIRM_ONLY_IF_CHANGED',Branch_Rule_ID:'BR-BASE',Reuse_From:'Herramientas por paso + handoffs + copy/rekey',Option_Set_ID:null,Validation:'',Ejemplo_ES:''};
  eng.answers.DF054='Salesforce -> Excel';
  const html=ctx.renderQuestion(f,eng);
  assert.match(html,/Tomado de: un dato ya capturado en el estudio/);
  assert.match(html,/data-edit-context="DF054"/);
  assert.doesNotMatch(html,/data-goto-source/);
  delete eng.answers.DF054;
});

test('DERIVE_AND_CONFIRM requires an explicit confirmation and invalidates it automatically when the derived source changes',()=>{
  const f=ctx.schema.fields.find(x=>x.Field_ID==='DF050');
  let html=ctx.renderQuestion(f,eng);
  assert.match(html,/data-confirm-derived="DF050"/);
  ctx.confirmDerivedValue('DF050');
  html=ctx.renderQuestion(f,eng);
  assert.match(html,/Derivación confirmada/);
  assert.doesNotMatch(html,/data-confirm-derived="DF050"/);
  eng.processSteps[0].communication_channels.push('CH3');
  html=ctx.renderQuestion(f,eng);
  assert.match(html,/data-confirm-derived="DF050"/,'a source change must make the previous confirmation stale');
  eng.processSteps[0].communication_channels.pop();
});

test('UAT contextual help for DF010/DF014/DF015/DF016 is grounded and clarifies purpose without changing semantics',()=>{
  const fields=[
    {Field_ID:'DF010',Pregunta_o_etiqueta_ES:'Restricciones',Objetivo_concreto:'Registrar restricciones una sola vez.',Requiredness:'CONDITIONAL_90M',Ask_Mode:'CONDITIONAL_ASK',Reask_Policy:'REUSE_AND_DRILL_ONLY',Branch_Rule_ID:'BR-BASE',Option_Set_ID:null,Validation:'0..N',Ejemplo_ES:'Seguridad; plazo'},
    {Field_ID:'DF014',Pregunta_o_etiqueta_ES:'Límite inicial',Objetivo_concreto:'Evitar incluir actividades previas.',Requiredness:'CONDITIONAL_90M',Ask_Mode:'CONDITIONAL_ASK',Reask_Policy:'ASK_ONLY_IF_BRANCH',Branch_Rule_ID:'BR-BASE',Option_Set_ID:null,Validation:'Coherente con trigger y primer paso',Ejemplo_ES:'Empieza tras aprobación'},
    {Field_ID:'DF015',Pregunta_o_etiqueta_ES:'Límite final',Objetivo_concreto:'Evitar incluir actividades posteriores.',Requiredness:'CONDITIONAL_90M',Ask_Mode:'CONDITIONAL_ASK',Reask_Policy:'ASK_ONLY_IF_BRANCH',Branch_Rule_ID:'BR-BASE',Option_Set_ID:null,Validation:'Coherente con outcome y último paso',Ejemplo_ES:'Termina al informar al cliente'},
    {Field_ID:'DF016',Pregunta_o_etiqueta_ES:'Responsable end-to-end',Objetivo_concreto:'Establecer accountability.',Requiredness:'CONDITIONAL_90M',Ask_Mode:'CONDITIONAL_ASK',Reask_Policy:'NO_REASK',Branch_Rule_ID:'BR-BASE',Option_Set_ID:null,Validation:'Un owner principal',Ejemplo_ES:'Directora de Operaciones'}
  ];
  for(const f of fields){const html=ctx.renderQuestion(f,eng);assert.match(html,/clarification-note/)}
  assert.match(ctx.renderQuestion(fields[0],eng),/presupuesto, seguridad, plataforma o herramientas/);
  assert.match(ctx.renderQuestion(fields[1],eng),/evento que inicia el proceso/);
  assert.match(ctx.renderQuestion(fields[2],eng),/resultado final esperado/);
  assert.match(ctx.renderQuestion(fields[3],eng),/Puede coincidir o no con el interlocutor principal/);
});

test('DF020/DF029 render a UI-only disambiguation hint (route vs treatment) without touching Field_ID/Option_Set_ID/Write_Target',()=>{
  const df020={Field_ID:'DF020',Pregunta_o_etiqueta_ES:'¿Qué variantes materiales cambian el recorrido del proceso?',Objetivo_concreto:'',Requiredness:'CONDITIONAL_90M',Ask_Mode:'CONDITIONAL_ASK',Reask_Policy:'NO_REASK',Branch_Rule_ID:'BR-BASE',Reuse_From:null,Option_Set_ID:'OS_VARIANT_DIMENSION',Validation:'',Ejemplo_ES:''};
  const df029={Field_ID:'DF029',Pregunta_o_etiqueta_ES:'Clases de servicio o prioridad que cambian el tratamiento',Objetivo_concreto:'',Requiredness:'OPTIONAL_90M',Ask_Mode:'CONDITIONAL_ASK',Reask_Policy:'NO_REASK',Branch_Rule_ID:'BR-BASE',Reuse_From:null,Option_Set_ID:'OS_PRIORITY_CLASS',Validation:'',Ejemplo_ES:''};
  const html020=ctx.renderQuestion(df020,eng),html029=ctx.renderQuestion(df029,eng);
  assert.match(html020,/RUTA del proceso/);
  assert.match(html029,/TRATAMIENTO operativo/);
});

test('DF052 clarifies it is a single process-level version-control question, never per-document (UAT-VIS-042 stays BLOQUEADO — no per-artifact cardinality exists in the canonical model)',()=>{
  const df052={Field_ID:'DF052',Pregunta_o_etiqueta_ES:'Método para identificar la versión correcta de documentos/datos',Objetivo_concreto:'',Requiredness:'CONDITIONAL_90M',Ask_Mode:'CONDITIONAL_ASK',Reask_Policy:'NO_REASK',Branch_Rule_ID:'BR-BASE',Reuse_From:null,Option_Set_ID:'OS_CONTROL_TYPE',Validation:'',Ejemplo_ES:''};
  const html=ctx.renderQuestion(df052,eng);
  assert.match(html,/método general de control de versión del proceso/);
  assert.match(html,/no a versionar cada documento/);
});
// [AUNEA-UAT-NOREASK-010] END
