// [AUNEA-UAT-NOREASK-010] START — No-Reask regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','domain/no-reask.js'),'utf8');
const company={id:'c1',name:'ACME',sector:'D25',country:'España'};
const eng={companyId:'c1',contactIds:['p1'],answers:{DF011:'Proceso'},answerDetails:{},processSteps:[{id:'s1',status:'ACTIVE',step_name:'Alta',actor:'A1',tool:'T1',active_time:10,rework_time:2,occurrences_per_case:1,communication_channels:['CH1'],inputs:['AR1'],outputs:['AR2']},{id:'s2',status:'ACTIVE',step_name:'Aprobación',step_type:'ST05',actor:'A2',tool:'T2',wait_time:60,decision_criteria:['DC1'],communication_channels:['CH2']}],frictions:[{id:'f1',status:'ACTIVE',friction_type:'P07',evidence_type:'EV02'}],risks:[],economicInputs:[],confirmedAsIs:false};
const opts={REF_COUNTRY_ISO3166:[{value:'ES',label:'España'}],REF_DOMAIN:[{value:'D25',label:'Professional Services Delivery'}],OS_COMM_CHANNEL:[{value:'CH1',label:'Email'},{value:'CH2',label:'Teams'},{value:'CH3',label:'Portal'}],OS_TOOL_CATEGORY:[],OS_ACTOR_ROLE:[],OS_ARTIFACT_TYPE:[],OS_FRICTION_TYPE:[{value:'P07',label:'Cuello'}]};
const ctx={console,schema:{fields:[{Field_ID:'DF001',Requiredness:'REQUIRED_90M',Ask_Mode:'PREFILL_CONFIRM',Reask_Policy:'CONFIRM_ONLY_IF_CHANGED',Branch_Rule_ID:'BR-BASE',Option_Set_ID:null,Write_Target:'RT_COMPANY.Company_Name',Pregunta_o_etiqueta_ES:'Nombre de la empresa'},{Field_ID:'DF050',Pregunta_o_etiqueta_ES:'Canales de comunicación utilizados',Objetivo_concreto:'',Requiredness:'CONDITIONAL_90M',Ask_Mode:'DERIVE_AND_CONFIRM',Reask_Policy:'DERIVE_THEN_CONFIRM',Branch_Rule_ID:'BR-TOOLS',Reuse_From:'RT_PROCESS_STEP.Communication_Channels',Option_Set_ID:'OS_COMM_CHANNEL',Validation:'0..N.',Ejemplo_ES:'Email; Teams'},{Field_ID:'DF094',Requiredness:'CONDITIONAL_90M',Ask_Mode:'SYSTEM_GENERATED',Branch_Rule_ID:'BR-CLOSE'}]},currentEng:()=>eng,companyById:()=>company,fieldOptions:id=>opts[id]||[],labelFrom:(id,v)=>(opts[id]||[]).find(o=>String(o.value)===String(v))?.label||v,normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),setAnswer:(fid,v)=>{eng.answers[fid]=v},setPage:()=>{},now:()=>new Date(0).toISOString(),markDirty:()=>{},audit:()=>{},answerDetails:e=>{e.answerDetails=e.answerDetails||{};return e.answerDetails},bindForms:()=>{},renderControl:()=>'<CONTROL>',render:()=>{},openModal:()=>{},id:p=>p,closeModal:()=>{},toast:()=>{},state:{companies:[company]},document:{querySelectorAll:()=>[],getElementById:()=>({})},esc:v=>String(v??''),attr:v=>String(v??''),requiredMark:()=>'<span class="required-mark" title="Campo obligatorio">*</span>'};
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

test('DF098 real interaction (jsdom, real runtime): action+owner+date consolidate automatically, the compound control never collapses behind a false "Tomado de" box after an unrelated render(), all 3 subfields and the consolidated value survive save/close/reopen, and none of it needs the console',async()=>{
  const {JSDOM,VirtualConsole}=require('jsdom');
  const {createServer}=require('node:http');
  const fsp=require('node:fs/promises');
  const root=path.resolve(__dirname,'..');
  const server=createServer(async(req,res)=>{
    const name=req.url==='/'?'index.html':req.url.slice(1);
    try{const bytes=await fsp.readFile(path.join(root,name));
      res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':'text/html');
      res.end(bytes);
    }catch{res.statusCode=404;res.end('missing')}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const url=`http://127.0.0.1:${server.address().port}/`;
    const vc=new VirtualConsole();const errors=[];vc.on('jsdomError',e=>errors.push(e.message));
    const dom=await JSDOM.fromURL(url,{resources:'usable',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
      w.structuredClone=structuredClone;
      w.fetch=(input,options)=>fetch(new URL(input,url),options);
      w.confirm=()=>true;
      w.URL.createObjectURL=()=>'blob:uat';w.URL.revokeObjectURL=()=>{};
    }});
    try{
      const w=dom.window,d=w.document;
      const until=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+d.body.textContent.slice(-1000));await new Promise(r=>setTimeout(r,20))}};
      const click=s=>{const el=d.querySelector(s);assert.ok(el,s);el.click()};
      const fill=(s,v)=>{const el=d.querySelector(s);assert.ok(el,s);el.value=v;el.dispatchEvent(new w.Event('change',{bubbles:true}))};
      await until(()=>d.querySelector('h1'));
      click('[data-page="contactos"]');click('#addCompanyBtn');fill('#cCoLegal','DF098 UAT empresa');click('#modalSave');
      click('#addContactBtn');fill('#cContactFirst','DF098 UAT contacto');fill('#cContactEmail','df098@example.invalid');click('#modalSave');
      click('[data-contact-study]');
      await until(()=>d.querySelector('[data-stage="S09"]'));
      click('[data-stage="S09"]');
      await until(()=>d.querySelector('[data-nextstep-action="DF098"]'));

      const actionSel=d.querySelector('[data-nextstep-action="DF098"]');
      actionSel.selectedIndex=1;actionSel.dispatchEvent(new w.Event('change',{bubbles:true}));
      assert.equal(w.currentEng().answers.DF098,'','sólo con la acción elegida aún faltan owner y fecha: no puede consolidar');
      assert.ok(d.querySelector('[data-nextstep-owner="DF098"]'),'el control compuesto sigue presente tras elegir sólo la acción');

      const ownerInput=d.querySelector('[data-nextstep-owner="DF098"]');
      ownerInput.value='Pedro';ownerInput.dispatchEvent(new w.Event('input',{bubbles:true}));
      assert.equal(w.currentEng().answers.DF098,'','owner solo tampoco consolida sin fecha');

      const dateInput=d.querySelector('[data-nextstep-date="DF098"]');
      dateInput.value='2026-09-12';dateInput.dispatchEvent(new w.Event('change',{bubbles:true}));
      assert.match(w.currentEng().answers.DF098,/Pedro/);
      assert.match(w.currentEng().answers.DF098,/12\/09\/2026/,'la fecha se serializa en formato dd/mm/aaaa');
      assert.ok(!w.canonicalMissingRequired(w.currentEng()).includes('DF098'),'DF098 debe desaparecer de Readiness en cuanto consolida');

      // El siguiente click es un render() DELIBERADAMENTE no relacionado con DF098 (repite la misma
      // etapa): reproduce la secuencia reportada donde el control se escondía tras "Editar aquí".
      click('[data-stage="S09"]');
      await until(()=>d.querySelector('[data-nextstep-owner="DF098"]'));
      const df098Card=[...d.querySelectorAll('.question-card')].find(c=>c.querySelector('[data-nextstep-action="DF098"]'));
      assert.ok(df098Card,'DF098 sigue siendo un control editable real tras el render() no relacionado, nunca una caja "Tomado de"');
      assert.doesNotMatch(df098Card.innerHTML,/reuse-context/);
      assert.match(df098Card.innerHTML,/answered-badge/);
      assert.equal(d.querySelector('[data-nextstep-owner="DF098"]').value,'Pedro');
      assert.equal(d.querySelector('[data-nextstep-date="DF098"]').value,'2026-09-12');

      // Corregir el owner es una interacción DOM normal — nunca requiere la consola.
      const ownerInput2=d.querySelector('[data-nextstep-owner="DF098"]');
      ownerInput2.value='Ana';ownerInput2.dispatchEvent(new w.Event('input',{bubbles:true}));
      assert.match(w.currentEng().answers.DF098,/Ana/);
      assert.doesNotMatch(w.currentEng().answers.DF098,/Pedro/);
      assert.equal(w.currentEng().answerDetails.DF098__owner,'Ana');
      assert.equal(w.currentEng().answerDetails.DF098__date,'2026-09-12');
      assert.ok(w.currentEng().answerDetails.DF098__action);

      click('#saveBtn');
      const engId=w.currentEng().id;
      const saved=JSON.parse(w.localStorage.getItem('aunea_internal_v1'));
      const savedEng=saved.engagements.find(x=>x.id===engId);
      assert.equal(savedEng.answers.DF098,w.currentEng().answers.DF098);
      assert.equal(savedEng.answerDetails.DF098__owner,'Ana');
      assert.equal(savedEng.answerDetails.DF098__date,'2026-09-12');
      assert.ok(savedEng.answerDetails.DF098__action);

      // Cerrar el caso (salir a Estudios) y reabrirlo (no crear otro estudio): los valores deben
      // recuperarse solos, sin ninguna intervención manual.
      click('[data-page="estudios"]');
      await until(()=>d.querySelector('[data-open-eng]'));
      click('[data-open-eng]');
      await until(()=>d.querySelector('[data-stage="S09"]'));
      click('[data-stage="S09"]');
      await until(()=>d.querySelector('[data-nextstep-owner="DF098"]'));
      assert.equal(d.querySelector('[data-nextstep-owner="DF098"]').value,'Ana');
      assert.equal(d.querySelector('[data-nextstep-date="DF098"]').value,'2026-09-12');
      assert.deepEqual(errors,[]);
      // Deja que el autosave debounced (350ms, services/persistence.js) termine de disparar mientras
      // el documento sigue vivo — cerrar la ventana con ese timer aún pendiente lo hace fallar contra
      // un document ya destruido, lo cual es un artefacto de limpieza del test, no del runtime real.
      await new Promise(r=>setTimeout(r,500));
    }finally{dom.window.close()}
  }finally{await new Promise(resolve=>server.close(resolve))}
});
// [AUNEA-UAT-NOREASK-010] END
