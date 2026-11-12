// [AUNEA-UAT-PG11-GUIDED-267] START — guided inspector and IA inline suggestions.
// SOURCE: AUNEA System Simulator CANONICAL PG11; DEC-050/055/056.
// Synthetic fixtures only. No Ollama, network, real Engagement or AS-IS mutations.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../pages/results.js'),'utf8');
const slice=(a,b)=>{
 const i=src.indexOf(a),j=src.indexOf(b,i);
 if(i<0||j<i)throw Error('Required PG11 block missing: '+a);
 return src.slice(i,j+b.length);
};
const diffBlock=slice('// [AUNEA-FE-PG11-AI-REVIEW-DIFF-260] START',
 '// [AUNEA-FE-PG11-AI-REVIEW-DIFF-260] END');
const inlineBlock=slice('// [AUNEA-FE-PG11-FIELD-INLINE-263] START',
 '// [AUNEA-FE-PG11-FIELD-INLINE-263] END');
const navBlock=slice('// [AUNEA-FE-PG11-GUIDED-NAV-266] START',
 '// [AUNEA-FE-PG11-GUIDED-NAV-266] END');
function fixture(){
 let decision=null;
 const e={id:'CASE',tobeProposals:[]};
 const p={status:'DRAFT',items:[{id:'TOBE-P1',sourceStepId:'P1',
   transformation:'Se modifica',problemResolved:'Motivo manual',
   futureActor:'ADMIN',tool:'ERP',inputs:['PDF'],outputs:['PDF'],
   automationAi:'Trabajo manual',humanSupervision:'Revisión administrativa',
   controlsRisk:'Comprobación manual'}]};
 e.tobeProposals=[p];
 const proposal={items:[{source_step_id:'P1',source_refs:['P1','EV-F1'],
  transformation:'Se mantiene',problem_resolved:'Mejorar el registro',
  rationale:'Acción propuesta: implementar registro automático. Resultado esperado: trazabilidad. Justificación: fricción identificada.',
  future_actor:'Administración',tool:'ERP',inputs:'PDF',
  outputs:'Registro estructurado',automation_ai:'Generar registro automáticamente',
  human_supervision:'Revisar excepciones',controls_risk:'Control de duplicados',
  limitations:'Validar viabilidad técnica antes de ejecutar.'}],
  review:{review_mode:'RULES_ONLY',blocking_step_ids:['P1'],issues:[]}};
 const catalog={OS_ACTOR_ROLE:[{value:'ADMIN',label:'Administración'}],
  OS_TOOL_CATEGORY:[{value:'ERP',label:'ERP'}],
  OS_ARTIFACT_TYPE:[{value:'PDF',label:'PDF'},
   {value:'RECORD',label:'Registro estructurado'}]};
 const context={String,Array,Object,JSON,Set,Map,
  TOBE_TRANSFORMATIONS:['Se mantiene','Se modifica','Se elimina','Se automatiza',
   'Se asiste con IA','Requiere decisión humana','Se incorpora control'],
  tobeEditable:x=>x.status==='DRAFT',
  tobeHumanReviewRecord:()=>({decisions:decision?{P1:{status:decision,note:'Justificación de evaluación humana.'}}:{}}),
  internalAiSavedDraft:()=>proposal,
  internalAiPilotNarrative:value=>({reason:'Fricción identificada',action:'Implementar registro automático'}),
  fieldOptions:key=>catalog[key]||[],
  tobeArtifactValues:x=>({resolved:x,unknown:[]}),
  tobeArtifactDisplay:x=>Array.isArray(x)?x.join(' · '):String(x||''),
  labelFrom:(key,v)=>catalog[key]?.find(x=>x.value===v)?.label||'',
  internalAiReadableRefs:()=> 'Recepción de factura · Fricción identificada',
  latestTobe:()=>p,esc:x=>String(x),attr:x=>String(x)};
 vm.createContext(context);
 vm.runInContext(diffBlock+'\n'+inlineBlock,context);
 return {e,p,proposal,context,setDecision:v=>{decision=v}};
}
test('IA suggestions are visible for a single field decision in 03.3',()=>{
 const f=fixture(),draft=f.context.tobeAiReviewDiff(f.e,f.p,'P1'),
  html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.equal(draft.issue,'','there is no separate whole-suggestion vote');
 assert.ok(draft.allFields.some(x=>x.key==='outputs'));
 assert.match(html,/IA propone:/);
 assert.match(html,/Registro estructurado/);
 assert.match(html,/Fuentes y condiciones del campo/);
 assert.match(html,/Fricción identificada/);
 assert.doesNotMatch(html,/data-tobe-ai-use-field/);
});
test('PG11 fields without an IA candidate never repeat a full evidence card',()=>{
 const f=fixture();f.proposal.items[0].controls_risk='';
 const empty=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'controlsRisk');
 assert.equal(empty,'','a field without IA candidate should not repeat a card');
 const proposed=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.match(proposed,/Fuentes y condiciones del campo/);
 assert.match(proposed,/Referencias de origen:/);
 assert.doesNotMatch(proposed,/Justificación global de la actividad|Intervención propuesta:/);
});
test('PG11 gives truthful field coverage without inferring reasons for empty candidates',()=>{
 const f=fixture();
 f.proposal.items[0].controls_risk='';
 f.proposal.items[0].human_supervision='';
 const html=f.context.tobeAiFieldCoverageHtml(f.e,f.p,f.p.items[0]);
 assert.match(html,/Campos sugeridos por IA/);
 assert.match(html,/sin sugerencia/);
 assert.match(html,/no significa que falte información del cliente/);
 const empty=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'controlsRisk');
 assert.equal(empty,'');
 const original=f.context.tobeWithAiHint(f.e,f.p,f.p.items[0],'controlsRisk',
  '<div class="field"><textarea data-tobe-field="controlsRisk"></textarea></div>');
 assert.match(original,/is-without-proposal/);
 assert.equal((original.match(/data-tobe-field="controlsRisk"/g)||[]).length,1);
});
test('PG11 shows Apply, Keep and Edit only for existing IA candidates',()=>{
 const f=fixture();f.setDecision('MODIFY');
 let html=f.context.tobeAiRowActions(f.e,f.p,f.p.items[0],'outputs');
 assert.match(html,/data-tobe-ai-use-field="outputs"/);
 assert.match(html,/data-tobe-ai-keep-field="outputs"/);
 assert.match(html,/data-tobe-ai-edit-field="outputs"/);
 f.proposal.items[0].outputs='';
 html=f.context.tobeAiRowActions(f.e,f.p,f.p.items[0],'outputs');
 assert.doesNotMatch(html,/data-tobe-ai-use-field="outputs"/);
 assert.equal(html,'','no candidate means direct editing, not another action strip');
});
test('PG11 shows a specific reviewer defect rather than blaming missing client data',()=>{
 const f=fixture();
 f.proposal.items[0].automation_ai='';
 f.proposal.review.issues=[{
   step_id:'P1',category:'BLOCKING',
   evidence:'transformation / automation_ai',
   issue:'«Se automatiza» exige describir Automatización e IA.'}];
 const hint=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'automationAi');
 assert.match(hint,/Por qué no se puede aplicar/);
 assert.match(hint,/exige describir Automatización e IA/);
 assert.doesNotMatch(hint,/en 03\.2 se menciona automatización/);
 const overview=f.context.tobeAiFieldCoverageHtml(f.e,f.p,f.p.items[0]);
 assert.match(overview,/la IA debe corregir/);
 assert.match(overview,/sin sugerencia/);
 const unaffected=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'inputs');
 assert.doesNotMatch(unaffected,/Por qué no se puede aplicar/);
});
test('PG11 flags narrative automation without inventing a structured field suggestion',()=>{
 const f=fixture();f.proposal.items[0].automation_ai='';
 const html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'automationAi');
 assert.match(html,/sin candidato estructurado para este campo/);
 assert.match(html,/en 03\.2 se menciona automatización/);
 assert.doesNotMatch(html,/data-tobe-ai-use-field/);
 assert.doesNotMatch(html,/<details/);
 const unrelated=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'inputs');
 assert.doesNotMatch(unrelated,/no ha generado un valor estructurado/);
 f.context.internalAiPilotNarrative=()=>({reason:'Sin cambio justificado',action:'Se mantiene la supervisión humana'});
 assert.doesNotMatch(f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'automationAi'),
   /en 03\.2 se menciona automatización/);
});
test('a different consultant transformation is not itself an IA coherence defect',()=>{
 const f=fixture();f.setDecision('MODIFY');
 const proposal=f.proposal.items[0];
 proposal.rationale='Acción propuesta: mantener la recepción humana. Resultado esperado: continuidad. Justificación: mantener controles.';
 proposal.automation_ai='';
 f.context.internalAiPilotNarrative=()=>({action:'Mantener la recepción humana',reason:'El AS-IS confirma recepción'});
 const diff=f.context.tobeAiReviewDiff(f.e,f.p,'P1');
 assert.equal(diff.issue,'');
 assert.equal(diff.skipped.some(x=>x.key==='transformation'),false);
 assert.equal(diff.allFields.find(x=>x.key==='transformation').value,'Se mantiene');
 assert.equal(f.p.items[0].transformation,'Se modifica',
  'a proposal never overwrites the consultant without an explicit apply action');
});
test('MODIFY authorizes only safe options, never contradictory transformation',()=>{
 const f=fixture();f.setDecision('MODIFY');
 const diff=f.context.tobeAiReviewDiff(f.e,f.p,'P1');
 assert.equal(diff.issue,'');
 assert.ok(!diff.fields.some(x=>x.key==='transformation'));
 assert.ok(diff.skipped.some(x=>x.key==='transformation'));
 const html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.doesNotMatch(html,/data-tobe-ai-use-field="outputs"/);
 assert.match(src,/function tobeAiRowActions/);
 assert.match(src,/data-tobe-ai-use-field/);
 assert.match(src,/data-tobe-ai-action-source/);
 assert.doesNotMatch(html,/Condición de revisión:/);
 assert.match(src,/data-tobe-ai-edit-field/);
 const bad=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'transformation');
 assert.match(bad,/Revisión manual necesaria/);
 assert.match(bad,/La transformación IA contiene una contradicción/);
 assert.doesNotMatch(bad,/data-tobe-ai-use-field/);
});
test('legacy whole-proposal discard is kept as read-only history and never locks 03.3 fields',()=>{
 const f=fixture();f.setDecision('DISCARD');
 const html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.match(html,/historial anterior/);
 assert.doesNotMatch(html,/data-tobe-ai-use-field/);
 const existing='<div class="field"><label>Datos de salida</label><div id="original"></div></div>';
 const merged=f.context.tobeWithAiHint(f.e,f.p,f.p.items[0],'outputs',existing);
 assert.match(merged,/id="original"/);
 assert.equal((merged.match(/class="field"/g)||[]).length,1);
});
test('review navigation derives active step, neighbors and current UI-only mode',()=>{
 const steps=['P1','P2','P3','P4'].map(id=>({sourceStepId:id,sourceStepName:'Actividad '+id}));
 let index=0;
 const context={String,__auneaTobeMode:'guided',
  tobeAddedSteps:()=>[],tobeSelectedItem:()=>steps[index],
  tobeFlowItemId:x=>x.sourceStepId,tobeFlowItemName:x=>x.sourceStepName,
  esc:x=>String(x),attr:x=>String(x)};
 vm.createContext(context);vm.runInContext(navBlock,context);
 let html=context.tobeGuidedNavHtml({}, {items:steps});
 assert.match(html,/Actividad 1 de 4/);
 assert.match(html,/P2/);
 assert.doesNotMatch(html,/Actividad anterior/);
 index=2;context.__auneaTobeMode='map';
 vm.runInContext(navBlock,context);
 html=context.tobeGuidedNavHtml({}, {items:steps});
 assert.match(html,/Actividad 3 de 4/);
 assert.match(html,/P3/);
 assert.match(html,/aria-pressed="true">Mapa TO-BE/);
 assert.match(html,/data-tobe-select="P4"/);
});
test('PG11 uses one canonical form and two views on one versioned TO-BE',()=>{
 assert.match(src,/withAi\('outputs',tobeArtifactField/);
 assert.match(src,/withAi\('tool',tobeCatalogField/);
 assert.match(src,/withAi\('futureActor',tobeCatalogField/);
 assert.match(src,/withAi\('transformation',statusField\)/);
 assert.match(src,/function tobeGuidedNavHtml/);
 assert.match(src,/data-tobe-mode=".*__auneaTobeMode/);
 assert.match(src,/navigation.outerHTML=tobeGuidedNavHtml/);
 assert.match(src,/tobeOpenAlternative\(e,\{id:'AI:'/);
 assert.match(src,/tobeCommitAlternative\(e,preview\)/);
 assert.doesNotMatch(src,/function tobeAiStepApplicability/);
});
test('guided footer delegates to original Save and Check rather than duplicating business handlers',()=>{
 assert.match(src,/data-tobe-guided-save="1"/);
 assert.match(src,/data-tobe-guided-check="1"/);
 assert.match(src,/document\.getElementById\(save\?'saveTobe':'checkTobeReadiness'\)/);
 const code=slice('// [AUNEA-FE-PG11-GUIDED-ACTIONS-264] START',
  '// [AUNEA-FE-PG11-GUIDED-ACTIONS-264] END');
 const listeners=[],called=[];
 const actions={saveTobe:{click:()=>called.push('save')},
  checkTobeReadiness:{click:()=>called.push('check')}};
 const sandbox={state:{activePage:'tobe'},
  document:{addEventListener:(name,fn)=>listeners.push({name,fn}),
   getElementById:id=>actions[id],querySelector:()=>null,querySelectorAll:()=>[]},
  toast:()=>{},__auneaTobeMode:'guided',drawProcessGraph:()=>{},
  requestAnimationFrame:()=>{}};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);
 const handler=listeners.find(x=>x.name==='click'&&
  x.fn.toString().includes('data-tobe-guided-save'))?.fn;
 assert.ok(handler,'Guided footer delegate not registered');
 const trigger=kind=>handler({target:{closest:selector=>
  selector==='[data-tobe-guided-'+kind+']'?{}:null},preventDefault:()=>{}});
 trigger('save');trigger('check');
 assert.deepEqual(called,['save','check']);
});

test('PG11 exposes source and individual IA before configuring the future step',()=>{
 const start=src.indexOf('function tobeInspectorHtml(e,p){');
 const end=src.indexOf('function createNextTobeVersion',start);
 assert.ok(start>=0&&end>start);
 const page=src.slice(start,end);
 assert.match(page,/03\.1 · Entender el AS-IS/);
 assert.match(page,/03\.2 · Revisar propuestas IA/);
 assert.match(page,/data-tobe-generate-selected/);
 assert.match(page,/tobeAiAdviceHtml\(e,item,false\)/);
 assert.doesNotMatch(page,/tobeHumanReviewHtml\(e,item,false\)/);
 assert.match(page,/tobeDecisionSourceSummaryHtml\(e,p,item\)/);
 assert.match(page,/tobe-legacy-review/);
 assert.ok(page.indexOf("'</nav>'+supportingInformation+")<
   page.indexOf("'<section class=\"tobe-edit tobe-design-workspace\" id=\"tobeStepDesign\""));
 assert.equal((page.match(/data-tobe-generate-selected/g)||[]).length,1);
 assert.doesNotMatch(page,/tobe-review-support/);
});
test('PG11 displays confirmed AS-IS values beside the sole editable TO-BE field',()=>{
 const f=fixture();
 f.context.tobeProposalSourceSteps=()=>[{id:'P1',actor:'ADMIN',tool:'ERP',inputs:['PDF'],outputs:['PDF']}];
 const html=f.context.tobeWithAiHint(f.e,f.p,f.p.items[0],'outputs',
   '<div class="field"><input data-tobe-field="outputs"></div>');
 assert.match(html,/Origen AS-IS:/);
 assert.match(html,/PDF/);
 assert.equal((html.match(/data-tobe-field="outputs"/g)||[]).length,1);
});
test('PG11 03.3 keeps all nine fields inside four operational design sections',()=>{
 const start=src.indexOf('function tobeInspectorHtml(e,p){');
 const end=src.indexOf('function createNextTobeVersion',start);
 const content=src.slice(start,end);
 for(const label of ['Transformación y propósito','Funcionamiento futuro',
   'Recursos y datos de ejecución','tobeFutureTimeReviewHtml(item,sourceStep)'])
   assert.ok(content.includes(label),label);
 for(const key of ['transformation','problemResolved','automationAi','humanSupervision',
   'controlsRisk','futureActor','tool','inputs','outputs'])
   assert.ok(content.includes("withAi('"+key+"'"),'canonical editor for '+key);
 assert.match(content,/tobeDesignEvidence/);
 assert.match(content,/tobe-design-fields/);
 assert.doesNotMatch(content,/tobe-ai-inline-empty/);
});
test('PG11 03.1 uses the common read-only layout and preserves declared AS-IS values',()=>{
 const sourceStart=src.indexOf('function tobeOriginalStepFacts(e,item){');
 const sourceEnd=src.indexOf('function tobeSnapshotIssueCards(e,item){',sourceStart);
 const definition=sourceStart>=0&&sourceEnd>sourceStart?src.slice(sourceStart,sourceEnd).trim():'';
 assert.ok(definition,'source fact projection is required');
 const source={id:'P1',actor:'ADMIN',step_type:'ST02',tool:'EMAIL',
  inputs:['EMAIL','PDF'],outputs:['DOCUMENT','RECORD'],
  active_time:3,wait_time:0,rework_time:0};
 const ctx={
  latestTobe:()=>({}),tobeProposalSourceSteps:()=>[source],
  labelFrom:(category,value)=>({ADMIN:'Administración',ST02:'Tarea humana',
   EMAIL:'Email',PDF:'PDF',DOCUMENT:'Documento',RECORD:'Registro estructurado'})[value]||value,
  esc:value=>String(value)
 };
 vm.createContext(ctx);vm.runInContext(definition,ctx);
 const html=ctx.tobeOriginalStepFacts({}, {sourceStepId:'P1'});
 assert.match(html,/Actividad actual/);
 assert.match(html,/Duraciones declaradas/);
 assert.match(html,/Administración/);
 assert.match(html,/Email.*PDF/);
 assert.match(html,/3 min/);
 assert.equal((html.match(/0 min/g)||[]).length,2,'zero is a declared value, not missing evidence');
 assert.equal((html.match(/<dt>/g)||[]).length,8,'original fact contract retains all eight values');
 assert.doesNotMatch(html,/<input|<textarea|contenteditable/i,'AS-IS remains read-only');
 const stylesheet=fs.readFileSync(path.resolve(__dirname,'../ui-system.css'),'utf8');
 assert.ok(stylesheet.includes('.tobe-workspace[data-tobe-mode="guided"] .tobe-inspector #tobeStepOrigin{'));
 assert.ok(stylesheet.includes('.tobe-origin-fact-group{display:grid'));
 assert.ok(stylesheet.includes('#tobeStepOrigin .tobe-source-list{'));
 assert.match(src,/tobe-origin-header-status/);
});
test('PG11 03.1 shows confirmed F2 frequency and DEC-068 time attribution without inventing savings',()=>{
 const start=src.indexOf('function tobeSnapshotIssueCards(e,item){');
 const end=src.indexOf('// [AUNEA-FE-PG11-ORIGINAL-FACTS-243] END',start);
 assert.ok(start>=0&&end>start);
 const source=src.slice(start,end).trim();
 const snapshot={
  frictions:[{
   id:'UAT-LIT-F2',status:'ACTIVE',affected_steps:['P1'],
   client_label:'Falta de visibilidad del estado',
   observable_signal:'F2: 30% de casos, 10min de seguimiento por caso afectado, incremental.',
   frequency:{value:30,mode:'percent',period:''},
   active_time_loss:{value:10,unit:'min',mode:'VALUE'},
   time_attribution:{mode:'ADDITIONAL',step_id:'P1'}
  }],
  risks:[{id:'UAT-LIT-R1',status:'ACTIVE',step_ids:['P1'],
   description:'Pérdida de trazabilidad de una factura entre el correo de entrada y el registro ERP.'}]
 };
 const sandbox={latestTobe:()=>({}),tobeProposalSnapshot:()=>snapshot,
  esc:String,labelFrom:()=>''};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const html=sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'});
 assert.match(html,/Falta de visibilidad del estado/);
 assert.match(html,/30 % de los casos/);
 assert.match(html,/10 min por caso afectado/);
 assert.match(html,/Adicional al tiempo del paso/);
 assert.match(html,/requiere validar frecuencia y evidencia/);
 assert.match(html,/Referencia \(UAT-LIT-F2\)/);
 assert.match(html,/Referencia \(UAT-LIT-R1\)/);
 assert.match(html,/Pérdida de trazabilidad/);
 assert.doesNotMatch(html,/\>F2: 30%/,'do not show repeated free-text friction ID as lead');
 snapshot.processSteps=[
  {id:'P1',step_name:'Recibir factura del proveedor',status:'ACTIVE'},
  {id:'P4',step_name:'Registrar en ERP y archivar',status:'ACTIVE'}
 ];
 snapshot.frictions[0].time_attribution.step_id='P4';
 const other=sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'});
 assert.match(other,/Registrar en ERP y archivar \(P4\)/,'other-step time owner must be named');
 assert.match(other,/No sumar aquí/);
 snapshot.frictions[0].time_attribution.step_id='P-REMOVED';
 const unresolved=sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'});
 assert.match(unresolved,/No se puede identificar una actividad responsable vigente/);
 assert.doesNotMatch(unresolved,/Se atribuye a otra actividad; no sumar aquí/);
 snapshot.frictions[0].time_attribution.step_id='';
 const noOwner=sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'});
 assert.match(noOwner,/sin identificador/);
 snapshot.frictions[0].time_attribution.step_id='P1';
 assert.match(sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'}),/Responsable: esta actividad/);
 snapshot.frictions[0].time_attribution.mode='INCLUDED';
 const included=sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'});
 assert.match(included,/Ya incluido en el tiempo del paso/);
 assert.doesNotMatch(included,/Su incorporación al total/);
 snapshot.frictions[0].frequency={value:null,mode:'UNKNOWN'};
 snapshot.frictions[0].active_time_loss={value:0,mode:'UNKNOWN'};
 const missing=sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'});
 assert.doesNotMatch(missing,/Frecuencia declarada|Trabajo activo asociado|Atribución temporal/);
 assert.match(missing,/Señal registrada/,'original signal remains readable, not reinterpreted');
});
test('PG11 03.2 warns that a structured output already exists instead of assuming a new register',()=>{
 const section=src.slice(src.indexOf("const supportingInformation="),src.indexOf("return '<header class=\"tobe-inspector-head\""));
 assert.match(section,/sourceStep\.outputs\.some\(value=>String\(value\)==='RECORD'\)/);
 assert.match(section,/registro estructurado ya figura entre las salidas/);
 assert.match(section,/actualizar o automatizar el registro existente/);
 assert.match(section,/no acredita cómo se genera actualmente/);
});
test('PG11 step evidence never presents superseded risks as current',()=>{
 const fn=src.match(/function tobeSnapshotIssueCards\(e,item\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(fn,'The current step evidence projection must exist');
 const snapshot={frictions:[
   {status:'SUPERSEDED',affected_steps:['P1'],client_label:'Fricción archivada'},
   {status:'ACTIVE',affected_steps:['P1'],client_label:'Fricción vigente'}],
   risks:[
     {status:'SUPERSEDED',step_ids:['P1'],description:'Riesgo descartado'},
     {status:'ACTIVE',step_ids:['P1'],description:'Riesgo vigente'}]};
 const sandbox={
   tobeProposalSnapshot:()=>snapshot,latestTobe:()=>({}),
   esc:String,labelFrom:()=>''};
 vm.createContext(sandbox);vm.runInContext(fn,sandbox);
 const html=sandbox.tobeSnapshotIssueCards({},{sourceStepId:'P1'});
 assert.match(html,/Fricción vigente/);
 assert.match(html,/Riesgo vigente/);
 assert.doesNotMatch(html,/Fricción archivada|Riesgo descartado/);
});
test('PG11 identifies individual coherence separately from section 02 global analysis',()=>{
 const pilot=fs.readFileSync(path.resolve(__dirname,'../domain/internal-ai-pilot.js'),'utf8');
 assert.match(pilot,/actividades analizadas por IA/);
 assert.match(pilot,/Propuestas IA analizadas y guardadas\. La cobertura no acredita viabilidad ni aprobación del consultor/);
 assert.match(src,/Sólo consulta hasta completar las actividades y comprobar coherencia/);
 assert.match(src,/La revisión detecta un bloqueo en esta actividad/);
 assert.match(src,/data-tobe-ai-apply-unavailable/);
 assert.match(src,/data-tobe-ai-keep-field/);
 assert.match(src,/data-tobe-ai-edit-field/);
});
test('PG11 section 03 uses the shared semantic title hierarchy rather than an eyebrow as title',()=>{
 assert.ok(src.includes('<header class="tobe-review-section-head"><span class="tobe-eyebrow">03 · DISEÑO TO-BE</span>'));
 assert.ok(src.includes('<h2 class="aunea-ui-section-title">Revisión por actividad</h2>'));
 assert.match(src,/<p class="aunea-ui-section-caption">Revisa el origen/);
 assert.doesNotMatch(src,/tobe-eyebrow">03 · REVISIÓN POR ACTIVIDAD Y DISEÑO TO-BE/);
});
test('PG11 checkpoint points to missing activity without discarding validated source results',()=>{
 assert.match(src,/remainingStepIds=fromCheckpoint/);
 assert.match(src,/!pending\.items\.has\(String\(x\.sourceStepId\)\)/);
 assert.match(src,/data-tobe-generate-all-remaining>Analizar actividades pendientes/);
 assert.match(src,/Consolidación entre actividades pendiente/);
 assert.match(src,/\(canApply\?\s*action\('Aplicar IA'/);
 assert.match(src,/data-tobe-ai-keep-field/);
 assert.match(src,/data-tobe-ai-edit-field/);
});
test('PG11 pending-step button launches generation and reports progress immediately',async()=>{
 const block=slice('// [AUNEA-FE-PG11-REMAINING-CTA-295] START',
   '// [AUNEA-FE-PG11-REMAINING-CTA-295] END');
 let listener,launches=0,prevented=false,stopped=false;
 const progress={textContent:''};
 const button={disabled:false,textContent:'Analizar actividades pendientes',isConnected:true};
 const sandbox={
   document:{addEventListener:(name,fn,capture)=>{assert.equal(name,'click');assert.equal(capture,true);listener=fn;},
     getElementById:id=>id==='tobeStepAiProgress'?progress:null},
   state:{activePage:'tobe'},currentEng:()=>({id:'case'}),latestTobe:()=>({status:'DRAFT'}),
   tobeEditable:()=>true,toast:()=>{throw Error('Unexpected toast');},
   generateTobeAiPilot:async()=>{launches++;},console
 };
 vm.createContext(sandbox);vm.runInContext(block,sandbox);
 listener({target:{closest:selector=>selector==='[data-tobe-generate-all-remaining]'?button:null},
   preventDefault:()=>{prevented=true;},stopImmediatePropagation:()=>{stopped=true;}});
 assert.equal(launches,1);assert.equal(prevented,true);assert.equal(stopped,true);
 assert.match(progress.textContent,/Iniciando análisis de las actividades pendientes/);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(button.disabled,false);
 assert.equal(button.textContent,'Analizar actividades pendientes');
});
test('PG11 distinguishes completed step coverage from incomplete global source review',()=>{
 const fnStart=src.indexOf('function tobeGlobalLinkedStepHtml('),
   fnEnd=src.indexOf('// Read-only PG11 presentation',fnStart),
   fn=fnStart>=0&&fnEnd>fnStart?src.slice(fnStart,fnEnd):null;
 assert.ok(fn,'global linked step function must exist');
 const result={complete:false,progress:{completed:2,total:5}};
 const context={tobeGlobalStored:()=>result,
   tobeGlobalLinksForStep:()=>[{index:1,recommendation:{
     objective:'Objetivo verificado',how:'Recomendación sin aplicar',
     source_refs:['F1'],review:{status:'CONDITIONED',reason:'Capacidad por verificar'}}}],
   esc:value=>String(value)};
 vm.createContext(context);vm.runInContext(fn,context);
 const partial=context.tobeGlobalLinkedStepHtml({}, {}, {sourceStepId:'P1'});
 assert.match(partial,/2 de 5 fuentes verificadas/);
 assert.match(partial,/cobertura de actividades analizadas por IA en la sección 03 es independiente/);
 assert.match(partial,/Recomendación sin aplicar/);
 result.complete=true;
 assert.doesNotMatch(context.tobeGlobalLinkedStepHtml({}, {}, {}),/está incompleto/);
});
test('PG11 source summary starts every bold lead-in on a separate paragraph',()=>{
 const start=src.indexOf('function tobeDecisionSourceSummaryHtml(e,p,item){');
 const end=src.indexOf('// [AUNEA-FE-PG11-UNIFIED-DECISIONS-357] END',start);
 assert.ok(start>=0&&end>start,'source summary function must exist');
 const sandbox={
   tobeGlobalLinksForStep:()=>[{},{}],
   internalAiSavedDraft:()=>({items:[{source_step_id:'P1'}]})
 };
 vm.createContext(sandbox);
 vm.runInContext(src.slice(start,end),sandbox);
 const html=sandbox.tobeDecisionSourceSummaryHtml({},{
   aiDraft:{applyHistory:[{sourceStepId:'P1',action:'APPLY',fields:['tool']},
     {sourceStepId:'P1',action:'KEEP',fields:['inputs']}]}
 },{sourceStepId:'P1'});
 const labels=['Análisis global:','IA individual:','Reglas:',
   'Decisiones registradas para esta actividad:','Cómo actuar:'];
 const leadIns=[...html.matchAll(/<p><b>([^<]+)<\/b>/g)].map(m=>m[1]);
 assert.deepEqual(leadIns,labels);
 assert.equal((html.match(/<p>/g)||[]).length,labels.length);
 assert.match(html,/2 oportunidades relacionadas/);
 assert.match(html,/1 campos aplicados, 1 conservados/);
});
test('PG11 rejects stale backend alternatives even when the frontend layout is current',()=>{
 const start=src.indexOf("const TOBE_ALTERNATIVES_CONTRACT='PG11_FINDING_SPECIFIC_V2';");
 const end=src.indexOf('// [AUNEA-FE-PG11-ALTERNATIVES-CONTRACT-360] END',start);
 assert.ok(start>0&&end>start);
 const sandbox={};vm.createContext(sandbox);
 vm.runInContext(src.slice(start,end),sandbox);
 const check=sandbox.tobeRulesResultIssue;
 assert.match(check({candidates:[{id:'KEEP:P1',title:'Mantener la actividad'}]}),/motor de alternativas antiguo/);
 const modern={engine_contract:'PG11_FINDING_SPECIFIC_V2',
   candidates:[{id:'STATUS-F2:P1',title:'Hacer visible el estado',sourceRefs:['P1','F2'],
      targetFinding:'Falta de visibilidad del estado',changeSummary:'Registrar seguimiento',
      expectedOutcome:'Estado consultable',combination:'COMBINABLE'}]};
 assert.equal(check(modern),'');
 assert.match(check({...modern,candidates:[{id:'KEEP:P1'}]}),/no cumple el contrato/);
 assert.match(src,/__auneaTobeAlternatives\.delete\(key\);\s*button\.disabled=true/,
   'previous responses must be cleared when recalculating');
 assert.match(src,/if\(incompatible\)throw Error\(incompatible\)/);
 assert.match(src,/const rows=\(!staleIssue&&data\?\.candidates\|\|\[\]\)\.map/,
   'stale recommendations must not remain visible after an incompatible response');
});
// [AUNEA-UAT-PG11-GUIDED-267] END
