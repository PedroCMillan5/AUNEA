// [AUNEA-FE-PROC-LIFECYCLE-030] START — Trazabilidad y confirmación AS-IS
// PURPOSE: Own lifecycle-only actions for Process Steps/Friction records and AS-IS confirmation, separate from editors and engine adapters.
// SOURCE: Process/Friction Models; DEC-033/040.
// INPUTS: current Engagement, step/friction ids and explicit consultant confirmation.
// OUTPUTS: SUPERSEDED lifecycle state and AS-IS confirmation state.
// SIDE_EFFECTS: engagement state mutation, audit/dirty state and DOM re-render.
// CHANGE_RISK: HIGH.
function supersedeStep(stepId){
  const e=currentEng(),x=e.processSteps.find(s=>s.id===stepId);
  if(!x)return;
  if(!confirm('¿Eliminar este paso del flujo? Se retirará inmediatamente del mapa.'))return;
  x.status='SUPERSEDED';invalidateProcessLayers(e,'map');markDirty(`Paso ${stepId} eliminado del flujo`);render();
}

function supersedeFriction(frId){
  const e=currentEng(),x=e.frictions.find(s=>s.id===frId);
  if(!x)return;
  if(!confirm('La fricción quedará SUPERSEDED para conservar trazabilidad. ¿Continuar?'))return;
  x.status='SUPERSEDED';invalidateProcessLayers(e,'frictions');markDirty(`Fricción ${frId} superseded`);render();
}

function processLayerConfirmations(e){
  if(!e.layerConfirmations)e.layerConfirmations={map:false,frictions:false,risks:false,impact:false};
  return e.layerConfirmations;
}
function processLayerKey(tab){return tab==='fricciones'?'frictions':tab==='riesgos'?'risks':tab==='impacto'?'impact':'map'}
function allProcessLayersConfirmed(e){const x=processLayerConfirmations(e);return !!(x.map&&x.frictions&&x.risks&&x.impact)}
function invalidateProcessLayers(e,from='map'){
  const x=processLayerConfirmations(e),order=['map','frictions','risks','impact'],i=Math.max(0,order.indexOf(from));
  order.slice(i).forEach(k=>x[k]=false);
  e.confirmedAsIs=false;e.answers.DF093='';e.asIsConfirmedAt=null;e.confirmedSnapshot=null;
}
function confirmProcessLayer(tab){
  const e=currentEng();if(!e)return;
  const key=processLayerKey(tab);
  if(key==='map'){
    const start=e.answers?.DF014,finish=e.answers?.DF015,hasActive=(e.processSteps||[]).some(x=>x.status!=='SUPERSEDED');
    if((!start||!finish)&&!hasActive)return toast('Define los límites inicial y final o añade al menos un paso antes de confirmar el mapa.');
  }
  const x=processLayerConfirmations(e);x[key]=true;x[key+'_at']=now();
  if(allProcessLayersConfirmed(e)){
    e.confirmedAsIs=true;e.answers.DF093='YES';e.asIsConfirmedAt=now();
    const sealed=typeof sealConfirmedSnapshot==='function'?sealConfirmedSnapshot(e,'confirmación de mapa, fricciones, riesgos e impacto'):null;
    markDirty(sealed?`Capas AS-IS confirmadas · snapshot v${sealed.version}`:'Capas AS-IS confirmadas');
    toast('Mapa, fricciones, riesgos e impacto confirmados.');
  }else{
    markDirty(`Capa ${key} confirmada`);
    toast('Capa confirmada. Puedes continuar con la siguiente.');
  }
  render();
}
function confirmAsIs(){confirmProcessLayer(currentEng()?.processTab||'cliente')}

function openProcessEditorWindow(){
  const e=currentEng();if(!e)return toast('Abre primero un estudio.');
  if(typeof persistRecoverySnapshot==='function')persistRecoverySnapshot('abrir editor con cliente');
  const u=new URL(location.href);u.searchParams.set('engagement',e.id);u.hash='process-editor';
  window.open(u.toString(),`aunea_process_editor_${e.id}`);
}
// [AUNEA-FE-PROC-LIFECYCLE-030] END
