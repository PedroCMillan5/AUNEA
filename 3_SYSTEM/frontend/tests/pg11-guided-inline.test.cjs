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
test('IA suggestions are visible before decision but cannot be applied',()=>{
 const f=fixture(),draft=f.context.tobeAiReviewDiff(f.e,f.p,'P1'),
  html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.match(draft.issue,/decisión/);
 assert.ok(draft.allFields.some(x=>x.key==='outputs'));
 assert.match(html,/IA propone:/);
 assert.match(html,/Registro estructurado/);
 assert.match(html,/Justificación, fuentes y límites/);
 assert.match(html,/Fricción identificada/);
 assert.doesNotMatch(html,/data-tobe-ai-use-field/);
});
test('MODIFY authorizes only safe options, never contradictory transformation',()=>{
 const f=fixture();f.setDecision('MODIFY');
 const diff=f.context.tobeAiReviewDiff(f.e,f.p,'P1');
 assert.equal(diff.issue,'');
 assert.ok(!diff.fields.some(x=>x.key==='transformation'));
 assert.ok(diff.skipped.some(x=>x.key==='transformation'));
 const html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.match(html,/data-tobe-ai-use-field="outputs"/);
 assert.match(html,/data-tobe-ai-use-source="P1"/);
 assert.match(html,/Editar valor/);
 const bad=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'transformation');
 assert.match(bad,/Revisión manual necesaria/);
 assert.doesNotMatch(bad,/data-tobe-ai-use-field/);
});
test('discard keeps native field controls and never offers application',()=>{
 const f=fixture();f.setDecision('DISCARD');
 const html=f.context.tobeAiInlineHint(f.e,f.p,f.p.items[0],'outputs');
 assert.match(html,/Recomendación descartada/);
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
 assert.match(html,/Siguiente actividad/);
 assert.doesNotMatch(html,/Actividad anterior/);
 index=2;context.__auneaTobeMode='map';
 vm.runInContext(navBlock,context);
 html=context.tobeGuidedNavHtml({}, {items:steps});
 assert.match(html,/Actividad 3 de 4/);
 assert.match(html,/Actividad anterior/);
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
 assert.match(src,/tobeApplyAiReviewedFields\(currentEng\(\),apply.dataset.tobeAiUseSource/);
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
// [AUNEA-UAT-PG11-GUIDED-267] END
