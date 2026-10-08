// [AUNEA-UAT-RENDER-010] START — Renderer regression
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'ui/renderer.js'),'utf8');
const e={companyId:'c1',answers:{},answerDetails:{},processSteps:[{id:'s1',status:'ACTIVE',step_name:'Inicio'}],frictions:[{id:'f1',status:'ACTIVE',friction_type:'P01'}]};
const ctx={console,schema:{option_sets:{OS_X:{options:[{value:'A',label:'Alpha'},{value:'B',label:'Beta'}]},OS_WORKAROUND:{options:[{value:'CHASE',label:'Seguimiento manual'},{value:'NO_WORKAROUND',label:'No existe'}]},OS_SENSITIVE_DATA:{options:[{value:'PERSONAL',label:'Datos personales'},{value:'NONE',label:'Ninguno'}]},OS_REVERSIBILITY:{options:[{value:'EASY',label:'Fácilmente reversible'},{value:'PARTIAL',label:'Parcialmente reversible'},{value:'HARD',label:'Difícil de revertir'}]}}},state:{companies:[{id:'c1',name:'ACME'}],contacts:[{id:'p1',companyId:'c1',name:'Ana',role:'Ops',status:'Activo'},{id:'p2',companyId:'c1',name:'Beto',role:'IT',status:'Inactivo'}]},currentEng:()=>e,normalizeArray:v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]),esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),attr:v=>String(v??'').replaceAll('"','&quot;'),labelFrom:(s,v)=>v,bindForms:()=>{},setAnswer:(fid,v)=>{e.answers[fid]=v},now:()=>'',markDirty:()=>{},toast:()=>{},render:()=>{},formatDateEs:v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(v||'—')},document:{querySelectorAll:()=>[],querySelector:()=>null}};
vm.createContext(ctx);vm.runInContext(code,ctx);
test('searchable dropdown remains catalog-backed and uses the single AUNEA Select primitive',()=>{const html=ctx.renderControl({Field_ID:'DF002',Control_UI:'SEARCHABLE_DROPDOWN',Option_Set_ID:'OS_X',Validation:'permitir Otro'},'A',ctx.schema.option_sets.OS_X.options,e);assert.match(html,/data-aunea-select="DF002"/);assert.match(html,/data-aunea-select-search="DF002"/);assert.match(html,/data-aunea-select-option="DF002"/);assert.doesNotMatch(html,/<datalist/);assert.doesNotMatch(html,/<select/);});
test('number+unit is structured',()=>{const html=ctx.renderControl({Field_ID:'DF021',Control_UI:'NUMBER_WITH_UNIT'},'',[],e);assert.match(html,/data-number-value="DF021"/);assert.match(html,/data-number-unit="DF021"/);});

test('all canonical single-select controls share AUNEA Select instead of browser-native dropdowns',()=>{
  const opts=[{value:'A',label:'Alpha'},{value:'B',label:'Beta'}];
  for(const control of ['DROPDOWN','CONTACT_REFERENCE','CRM_REFERENCE_OR_TEXT']){
    const html=ctx.renderControl({Field_ID:'DF004',Control_UI:control},'A',opts,e);
    assert.match(html,/class="aunea-select"/,control+' must use AUNEA Select');
    assert.doesNotMatch(html,/<select/,control+' must not render a native select');
  }
  const compound=ctx.renderControl({Field_ID:'DF021',Control_UI:'NUMBER_WITH_UNIT'},{value:10,unit:'case'},[],e);
  assert.match(compound,/class="aunea-select"/,'compound unit dropdown uses same component');
  assert.doesNotMatch(compound,/<select/);
});
test('multiselect keeps choices',()=>{const html=ctx.renderControl({Field_ID:'DF008',Control_UI:'MULTISELECT_WITH_OTHER'},['A'],ctx.schema.option_sets.OS_X.options,e);assert.match(html,/data-multi="DF008"/);assert.match(html,/detail-input/);});
test('unknown structured controls never degrade to free text',()=>{const html=ctx.renderControl({Field_ID:'DF999',Control_UI:'UNSUPPORTED_STRUCTURED'},'',[],e);assert.match(html,/control-error/);assert.doesNotMatch(html,/data-answer="DF999"/);});

test('Otro detail is hidden by default and only shown once a detail value already exists',()=>{
  e.answerDetails={};
  const hidden=ctx.renderControl({Field_ID:'DF008',Control_UI:'MULTISELECT_WITH_OTHER'},['A'],ctx.schema.option_sets.OS_X.options,e);
  assert.match(hidden,/data-detail-wrap="DF008"[^>]*style="display:none"/);
  assert.match(hidden,/data-other-toggle="DF008"/);
  assert.doesNotMatch(hidden,/id="DF008__other_toggle"[^>]*checked/);
  e.answerDetails={DF008:'Un valor no cubierto por el catálogo'};
  const shown=ctx.renderControl({Field_ID:'DF008',Control_UI:'MULTISELECT_WITH_OTHER'},['A'],ctx.schema.option_sets.OS_X.options,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF008"[^>]*style="display:none"/);
  assert.match(shown,/id="DF008__other_toggle"[^>]*checked/);
  e.answerDetails={};
});

test('Ninguno/No-existe exclusivity is only wired for the two curated Field_IDs, via a hand-curated table not a Validation regex',()=>{
  const workaround=ctx.renderControl({Field_ID:'DF065',Control_UI:'MULTISELECT'},['CHASE'],ctx.schema.option_sets.OS_WORKAROUND.options,e);
  assert.match(workaround,/value="NO_WORKAROUND"[^>]*data-exclusive="1"/);
  assert.doesNotMatch(workaround,/value="CHASE"[^>]*data-exclusive="1"/);
  const sensitive=ctx.renderControl({Field_ID:'DF073',Control_UI:'MULTISELECT'},[],ctx.schema.option_sets.OS_SENSITIVE_DATA.options,e);
  assert.match(sensitive,/value="NONE"[^>]*data-exclusive="1"/);
  const ordinary=ctx.renderControl({Field_ID:'DF008',Control_UI:'MULTISELECT_WITH_OTHER'},['A'],ctx.schema.option_sets.OS_X.options,e);
  assert.doesNotMatch(ordinary,/data-exclusive/);
});

test('DF054 STEP_SYSTEM_PAIR_SELECTOR only surfaces cross-system handoffs and does not duplicate DF051',()=>{
  const eng={answers:{DF051:[]},processSteps:[
    {id:'s1',status:'ACTIVE',step_name:'Alta',tool:'CRM',communication_channels:['CH1'],manual_actions:[]},
    {id:'s2',status:'ACTIVE',step_name:'Aprobación',tool:'EXCEL',manual_actions:['REKEY']},
    {id:'s3',status:'SUPERSEDED',step_name:'Viejo',tool:'OLD'}
  ]};
  const html=ctx.renderControl({Field_ID:'DF054',Control_UI:'STEP_SYSTEM_PAIR_SELECTOR'},[],[],eng);
  assert.match(html,/pair:s1:s2/);
  assert.doesNotMatch(html,/channel:s1/);
  assert.doesNotMatch(html,/manual:s2/);
  assert.match(html,/Las reintroducciones del mismo dato se registran en el bloque anterior/);
  assert.doesNotMatch(html,/checked/,'no candidate may come pre-checked; only an explicit consultant confirmation may select one');
  assert.doesNotMatch(html,/s3/,'SUPERSEDED steps must not produce candidates');
  eng.answers.DF051=[{data:'Solicitud',from:'s1',to:'s2'}];
  const deduped=ctx.renderControl({Field_ID:'DF054',Control_UI:'STEP_SYSTEM_PAIR_SELECTOR'},[],[],eng);
  assert.doesNotMatch(deduped,/pair:s1:s2/,'a handoff already captured as duplicate entry must not be asked again');
});

test('DF054 only persists the candidate ids the consultant explicitly confirms, via the same shared checkbox mechanism as any other multiselect',()=>{
  const eng={processSteps:[{id:'s1',status:'ACTIVE',step_name:'Alta',tool:'CRM'},{id:'s2',status:'ACTIVE',step_name:'Aprobación',tool:'EXCEL'}]};
  const html=ctx.renderControl({Field_ID:'DF054',Control_UI:'STEP_SYSTEM_PAIR_SELECTOR'},['pair:s1:s2'],[],eng);
  assert.match(html,/value="pair:s1:s2"[^>]*data-multi="DF054"[^>]*checked/);
});

test('DF098 DROPDOWN_WITH_OWNER_DATE serializes to a plain "<acción> — <owner> — <fecha>" string (matching the confirmed backend contract), only once all three pieces are present — never a partial value, never an object',()=>{
  e.answerDetails={};e.answers={};
  const html=ctx.renderControl({Field_ID:'DF098',Control_UI:'DROPDOWN_WITH_OWNER_DATE',Option_Set_ID:'OS_X'},'',ctx.schema.option_sets.OS_X.options,e);
  assert.match(html,/data-nextstep-action="DF098"/);
  assert.match(html,/data-nextstep-owner="DF098"/);
  assert.match(html,/data-nextstep-date="DF098"/);
  const fakeBox={querySelector:sel=>sel==='summary span'?{textContent:'Beta'}:null};
  const savedDoc=ctx.document;
  ctx.document={querySelector:sel=>sel.includes('data-aunea-select="DF098__action"')?fakeBox:null,querySelectorAll:()=>[]};
  e.answerDetails.DF098__action='B';
  ctx.syncNextStep('DF098');
  assert.equal(e.answers.DF098,'','owner and date are still missing, so no partial string may be written');
  ctx.syncNextStep('DF098');
  assert.equal(e.answers.DF098,'');
  e.answerDetails.DF098__date='2026-09-12';
  ctx.syncNextStep('DF098');
  assert.equal(e.answers.DF098,'Beta — Consultor AUNEA — 12/09/2026');
  ctx.document=savedDoc;
  e.answerDetails={};e.answers={};
});

test('DF007/DF016 contact reference pickers exclude Inactivo contacts under DEC-061',()=>{
  const single=ctx.renderControl({Field_ID:'DF006',Control_UI:'CONTACT_REFERENCE'},'',[],e);
  const multi=ctx.renderControl({Field_ID:'DF007',Control_UI:'CONTACT_MULTISELECT'},[],[],e);
  const orRole=ctx.renderControl({Field_ID:'DF016',Control_UI:'CONTACT_OR_ROLE_REFERENCE'},'',[],e);
  [single,multi,orRole].forEach(html=>{assert.match(html,/Ana/);assert.doesNotMatch(html,/Beto/)});
});

test('TEXT_LONG_INTERNAL never renders the literal string "off" and stays internal-only',()=>{
  const empty=ctx.renderControl({Field_ID:'DF100',Control_UI:'TEXT_LONG_INTERNAL'},'',[],e);
  const filled=ctx.renderControl({Field_ID:'DF100',Control_UI:'TEXT_LONG_INTERNAL'},undefined,[],e);
  assert.doesNotMatch(empty,/>off</);
  assert.doesNotMatch(filled,/>off</);
  assert.match(empty,/class="internal-only"/);
});

test('DF010 Otra behaves like other conditional Other controls',()=>{
  e.answerDetails={};
  const opts=[{value:'BUDGET',label:'Presupuesto'},{value:'OTHER',label:'Otra'}];
  const hidden=ctx.renderControl({Field_ID:'DF010',Control_UI:'MULTISELECT_WITH_DETAIL'},[],opts,e);
  assert.match(hidden,/value="OTHER"[^>]*data-other-toggle="DF010"/);
  assert.match(hidden,/data-detail-wrap="DF010"[^>]*style="display:none"/);
  const shown=ctx.renderControl({Field_ID:'DF010',Control_UI:'MULTISELECT_WITH_DETAIL'},['OTHER'],opts,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF010"[^>]*style="display:none"/);
  e.answerDetails={};
});

test('DF007 offers inline creation of a real Contact',()=>{
  const html=ctx.renderControl({Field_ID:'DF007',Control_UI:'CONTACT_MULTISELECT'},[],[],e);
  assert.match(html,/data-create-contact-for-field="DF007"/);
  assert.match(html,/Crear contacto y añadirlo/);
});

test('PG02 DF017 Otro reveals detail only when selected',()=>{
  e.answerDetails={};
  const opts=[{value:'OPERATIONS',label:'Operaciones'},{value:'OTHER',label:'Otro'}];
  const hidden=ctx.renderControl({Field_ID:'DF017',Control_UI:'MULTISELECT_REFERENCE'},[],opts,e);
  assert.match(hidden,/value="OTHER"[^>]*data-other-toggle="DF017"/);
  assert.match(hidden,/data-detail-wrap="DF017"[^>]*style="display:none"/);
  const shown=ctx.renderControl({Field_ID:'DF017',Control_UI:'MULTISELECT_REFERENCE'},['OTHER'],opts,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF017"[^>]*style="display:none"/);
});

test('S03 backlog shows cases, requires integer capture and uses canonical No se mide state',()=>{
  const field={Field_ID:'DF027',Control_UI:'NUMBER_WITH_NONE_UNKNOWN'};
  const html=ctx.renderControl(field,{value:22,mode:''},[],e);
  assert.match(html,/step="1"/);
  assert.match(html,/>casos</);
  assert.match(html,/No se mide/);
  assert.doesNotMatch(html,/No aplica/);
});

test('S03 seasonality detail appears only for material seasonality choices',()=>{
  const field={Field_ID:'DF024',Control_UI:'DROPDOWN_WITH_DETAIL'};
  const opts=[
    {value:'NONE',label:'No relevante'},
    {value:'PREDICTABLE',label:'Picos previsibles'},
    {value:'UNKNOWN',label:'No se sabe'}
  ];
  const none=ctx.renderControl(field,'NONE',opts,e);
  assert.match(none,/data-seasonality-detail="DF024" style="display:none"/);
  const peak=ctx.renderControl(field,'PREDICTABLE',opts,e);
  assert.match(peak,/data-seasonality-detail="DF024"/);
  assert.doesNotMatch(peak,/data-seasonality-detail="DF024" style="display:none"/);
});



test('S08 yellow context box renders real prior and current selections, never a decorative label',()=>{
  const renderer=fs.readFileSync(path.join(root,'ui/renderer.js'),'utf8');
  const noReask=fs.readFileSync(path.join(root,'domain/no-reask.js'),'utf8');
  assert.match(noReask,/S08_DUPLICATION_WHY/);
  assert.match(noReask,/Aunque en Contexto ya identificamos restricciones generales/);
  assert.match(noReask,/s08-duplication-why/);
  assert.match(renderer,/Recomendación/);
  assert.doesNotMatch(renderer,/Opciones marcadas/);
  assert.match(renderer,/Contexto previo/);
  assert.match(renderer,/Concretado en esta pregunta/);
  assert.doesNotMatch(renderer,/s08-context-explanation/);

  e.answers.DF010=['SECURITY','CHANGE'];
  const html=ctx.renderControl(
    {Field_ID:'DF087',Control_UI:'MULTISELECT'},
    ['KEEP_TOOL'],
    [{value:'KEEP_TOOL',label:'Herramienta actual'}],
    e
  );
  assert.match(html,/Contexto previo/);
  assert.match(html,/SECURITY · CHANGE/);
  assert.match(html,/Concretado en esta pregunta/);
  assert.match(html,/Herramienta actual/);
  e.answers.DF010=undefined;
});

test('S08 keeps one simple pattern after DF086: options plus yellow context, without auxiliary subcontrols',()=>{
  const source=fs.readFileSync(path.join(root,'ui/renderer.js'),'utf8');
  assert.match(source,/function s08PriorContext\(fid,e,currentVal,items\)/);
  assert.match(source,/\['DF087','DF088','DF089','DF090','DF091'\]\.includes\(fid\)/);
  assert.doesNotMatch(source,/function s08ReferenceControl/);
  assert.doesNotMatch(source,/function s08PreferenceControl/);
  assert.doesNotMatch(source,/function s08ChangeDetailControl/);
  assert.doesNotMatch(source,/data-s08-reference/);
  assert.doesNotMatch(source,/data-s08-preference/);
  assert.doesNotMatch(source,/data-s08-change-detail/);

  e.answers.DF010=['SECURITY'];
  for(const fid of ['DF087','DF088','DF089','DF090','DF091']){
    const html=ctx.renderControl(
      {Field_ID:fid,Control_UI:'MULTISELECT_WITH_DETAIL'},
      ['A'],
      [{value:'A',label:'Opción A'},{value:'OTHER',label:'Otro'}],
      e
    );
    assert.match(html,/Opción A/);
    assert.match(html,/Contexto previo/);
    assert.match(html,/Recomendación/);
    assert.doesNotMatch(html,/linked-field-block/);
    assert.doesNotMatch(html,/Clasificación de cada restricción/);
    assert.doesNotMatch(html,/referencia concreta/);
    assert.doesNotMatch(html,/detalle si cambia el plan/);
  }
  e.answers.DF010=undefined;
});

test('PG02 DF020 Otra reveals detail only when selected',()=>{
  e.answerDetails={};
  const opts=[{value:'SERVICE',label:'Servicio / producto'},{value:'OTHER',label:'Otra'}];
  const hidden=ctx.renderControl({Field_ID:'DF020',Control_UI:'MULTISELECT_WITH_DETAIL'},[],opts,e);
  assert.match(hidden,/value="OTHER"[^>]*data-other-toggle="DF020"/);
  assert.match(hidden,/data-detail-wrap="DF020"[^>]*style="display:none"/);
  const shown=ctx.renderControl({Field_ID:'DF020',Control_UI:'MULTISELECT_WITH_DETAIL'},['OTHER'],opts,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF020"[^>]*style="display:none"/);
});


test('dropdown/combobox detail stays hidden unless canonical Otro is selected',()=>{
  e.answerDetails={};
  const opts=[{value:'EMAIL',label:'Email'},{value:'OTHER',label:'Otro'}];
  const hidden=ctx.renderControl({Field_ID:'DF012',Control_UI:'COMBOBOX_WITH_DETAIL'},'EMAIL',opts,e);
  assert.match(hidden,/data-conditional-other-select="DF012"/);
  assert.match(hidden,/data-detail-wrap="DF012"[^>]*style="display:none"/);
  const shown=ctx.renderControl({Field_ID:'DF012',Control_UI:'COMBOBOX_WITH_DETAIL'},'OTHER',opts,e);
  assert.doesNotMatch(shown,/data-detail-wrap="DF012"[^>]*style="display:none"/);
  const noOther=ctx.renderControl({Field_ID:'DF024',Control_UI:'DROPDOWN_WITH_DETAIL'},'SEASONAL',[{value:'SEASONAL',label:'Estacional'}],e);
  assert.match(noOther,/detail-wrap/,'detail remains available when the canonical set has no Otro branch');
});


test('DF086 MULTISELECT_WITH_PRIORITY shows selected outcomes immediately below the selector and keeps a structured top 3',()=>{
  e.answerDetails={DF086_priority:['TRACEABILITY','FASTER','QUALITY']};
  const opts=[
    {value:'LESS_MANUAL',label:'Reducir trabajo manual'},
    {value:'FASTER',label:'Reducir tiempo de ciclo'},
    {value:'QUALITY',label:'Mejorar calidad / reducir errores'},
    {value:'TRACEABILITY',label:'Mejorar trazabilidad'},
    {value:'OTHER',label:'Otro'}
  ];
  const html=ctx.renderControl({Field_ID:'DF086',Control_UI:'MULTISELECT_WITH_PRIORITY'},['LESS_MANUAL','FASTER','QUALITY','TRACEABILITY'],opts,e);
  assert.match(html,/data-priority-order="DF086"/);
  assert.match(html,/Ordena las 3 prioridades principales/);
  assert.match(html,/1ª prioridad[\s\S]*Mejorar trazabilidad/);
  assert.match(html,/2ª prioridad[\s\S]*Reducir tiempo de ciclo/);
  assert.match(html,/3ª prioridad[\s\S]*Mejorar calidad \/ reducir errores/);
  assert.match(html,/Sin prioridad[\s\S]*Reducir trabajo manual/);
  assert.match(html,/data-priority-move="DF086"/);
  e.answerDetails={};
});

test('DF086 priority block stays hidden until at least two outcomes are selected and renderer enforces a five-result ceiling in its binder',()=>{
  const opts=[{value:'A',label:'A'},{value:'B',label:'B'},{value:'OTHER',label:'Otro'}];
  const one=ctx.renderControl({Field_ID:'DF086',Control_UI:'MULTISELECT_WITH_PRIORITY'},['A'],opts,e);
  assert.doesNotMatch(one,/data-priority-order="DF086"/);
  assert.match(code,/selected\.length>5/);
  assert.match(code,/Selecciona como máximo 5 resultados/);
});



test('DF051 captures multiple reintroductions with affected data + source + destination and keeps suggestions unconfirmed',()=>{
  const eng={answers:{DF051:[
    {data:'Datos de la factura',from:'s1',to:'s3'},
    {data:'Número de pedido',from:'s2',to:'s3'}
  ]},answerDetails:{},processSteps:[
    {id:'s1',status:'ACTIVE',step_name:'Recibir factura',inputs:['PDF'],outputs:['PDF'],manual_actions:[]},
    {id:'s2',status:'ACTIVE',step_name:'Cotejar pedido',inputs:['RECORD'],outputs:['RECORD'],manual_actions:[]},
    {id:'s3',status:'ACTIVE',step_name:'Registrar en ERP',inputs:['RECORD'],manual_actions:['REKEY']}
  ]};
  const html=ctx.renderControl({Field_ID:'DF051',Control_UI:'STEP_PAIR_LIST_SELECTOR'},eng.answers.DF051,[],eng);
  assert.match(html,/Datos de la factura/);
  assert.match(html,/Número de pedido/);
  assert.match(html,/Información afectada/);
  assert.match(html,/Disponible originalmente en/);
  assert.match(html,/Se vuelve a introducir en/);
  assert.match(html,/data-duplicate-index="0"/);
  assert.match(html,/data-duplicate-index="1"/);
  assert.match(html,/\+ Añadir reintroducción/);
  assert.match(html,/Posibles reintroducciones detectadas/);
  assert.match(html,/data-duplicate-confirm=/);
  assert.doesNotMatch(html,/data-duplicate-confirm=[^>]*checked/,'a suggestion is never persisted or preconfirmed by rendering');
  eng.processSteps[2].inputs=['PDF','RECORD'];
  const ambiguous=ctx.renderControl({Field_ID:'DF051',Control_UI:'STEP_PAIR_LIST_SELECTOR'},eng.answers.DF051,[],eng);
  assert.doesNotMatch(ambiguous,/Posibles reintroducciones detectadas/,'ambiguous shared artifacts must not explode into candidate combinations');
});

// [AUNEA-UAT-RENDER-010] END

test('DF098 uses the selected top-right AUNEA consultant as readonly owner and keeps action/owner/date in one semantic row',()=>{
  e.answerDetails={};e.answers={};
  ctx.currentAuneaOwnerName=()=> 'Consultor Seleccionado';
  const html=ctx.renderControl({Field_ID:'DF098',Control_UI:'DROPDOWN_WITH_OWNER_DATE',Option_Set_ID:'OS_X'},'',ctx.schema.option_sets.OS_X.options,e);
  assert.match(html,/class="nextstep-inline"/);
  assert.match(html,/data-nextstep-owner="DF098"[^>]*value="Consultor Seleccionado"[^>]*readonly/);
  e.answerDetails={DF098__action:'A',DF098__date:'2026-10-13'};
  ctx.document.querySelector=sel=>sel.includes('data-aunea-select')?{querySelector:()=>({textContent:'Alpha'})}:null;
  ctx.syncNextStep('DF098');
  assert.match(e.answers.DF098,/Alpha — Consultor Seleccionado — 13\/10\/2026/);
});

test('DF074 renders the current canonical long-text question with no reversibility dropdown or step selector',()=>{
  const eng={answers:{},answerDetails:{},processSteps:[
    {id:'s1',status:'ACTIVE',step_name:'Recibir factura'},
    {id:'s2',status:'ACTIVE',step_name:'Aprobar factura'}
  ]};
  const html=ctx.renderControl({Field_ID:'DF074',Control_UI:'TEXT_LONG'},'',[],eng);
  assert.match(html,/<textarea[^>]*data-answer="DF074"/);
  assert.doesNotMatch(html,/data-aunea-select="DF074"/);
  assert.doesNotMatch(html,/Pasos afectados/);
  assert.doesNotMatch(html,/data-linked-step/);
});

test('DF099 renders permission and scope as one inline control and scope is canonical detail metadata',()=>{
  e.answerDetails={DF099:'Uso para elaborar diagnóstico'};
  const html=ctx.renderControl({Field_ID:'DF099',Control_UI:'BOOLEAN_UNKNOWN_WITH_SCOPE'},'YES',[{value:'YES',label:'Sí'},{value:'NO',label:'No'},{value:'UNKNOWN',label:'No sabe'}],e);
  assert.match(html,/class="permission-inline"/);
  assert.match(html,/data-permission-segment="DF099"/);
  assert.match(html,/data-permission-scope="DF099"/);
  assert.match(html,/data-detail-answer="DF099"/);
});


test('date unknown is selected, disables the input and never writes UNKNOWN into a date value',()=>{
 const html=ctx.renderControl({Field_ID:'DF097',Control_UI:'DATE_WITH_UNKNOWN'},'UNKNOWN',[],e);
 assert.match(html,/data-answer="DF097" value="" disabled aria-disabled="true"/);
 assert.match(html,/aria-pressed="true" data-set-unknown="DF097">✓ No disponible/);
 assert.doesNotMatch(html,/value="UNKNOWN"/);
 const available=ctx.renderControl({Field_ID:'DF097',Control_UI:'DATE_WITH_UNKNOWN'},'2026-10-14',[],e);
 assert.match(available,/aria-pressed="false"/);
 assert.doesNotMatch(available,/disabled/);
});

test('generated closure checklist uses semantic bullets and preserves the agreed follow-up',()=>{
 const html=ctx.renderControl({Field_ID:'DF095',Control_UI:'SYSTEM_GENERATED_CHECKLIST'},['Documento de aprobación','Ejemplo de solicitud'],[],{answers:{DF098:'Solicitar soporte — Pedro — 14/10/2026'}});
 assert.match(html,/<ul class="readonly-checklist-list">/);
 assert.equal((html.match(/<li class="readonly-checklist-item">/g)||[]).length,2);
 assert.match(html,/Seguimiento acordado/);
});
