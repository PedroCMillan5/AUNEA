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
  // Keep immutable snapshot history, but invalidate all outputs derived from the superseded confirmation.
  if(typeof invalidateDerivedState==='function')invalidateDerivedState(e,'cambio en capa AS-IS: '+from);
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

// [AUNEA-FE-ASIS-CLIENT-EDITOR-074] START — Independent synchronized client-first editor + single-writer lease.
// PURPOSE: Open the consultant-owned client-first editor in a separate tab over the same Engagement, keep
//          Console and editor synchronized through the existing persistence layer, and prevent simultaneous
//          AS-IS edits from Console while that editor is alive.
// SOURCE: DEC-050/063; Master Index frontend contract; explicit UAT feedback 2026-10-01.
// INPUTS: current Engagement, localStorage lease, #process-editor window.
// OUTPUTS: one editable AS-IS surface at a time; Console remains readable but locked for AS-IS mutation.
// SIDE_EFFECTS: localStorage ephemeral lease, popup/tab lifecycle, DOM lock state.
// CHANGE_RISK: HIGH.
const PROCESS_EDITOR_LEASE_KEY='aunea_process_editor_lease_v1';
const PROCESS_EDITOR_LEASE_MS=6500;
let __auneaProcessEditorWindow=null,__auneaProcessEditorHeartbeat=null,__auneaProcessEditorMonitor=null;

function readProcessEditorLease(){
  try{
    const raw=localStorage.getItem(PROCESS_EDITOR_LEASE_KEY);if(!raw)return null;
    const lease=JSON.parse(raw);
    if(!lease?.engagementId||!lease?.token||Number(lease.expiresAt)<=Date.now())return null;
    return lease;
  }catch(_err){return null}
}
function writeProcessEditorLease(engagementId,token){
  const lease={engagementId,token,expiresAt:Date.now()+PROCESS_EDITOR_LEASE_MS};
  try{localStorage.setItem(PROCESS_EDITOR_LEASE_KEY,JSON.stringify(lease))}catch(_err){}
  return lease;
}
function processEditorToken(){
  const q=new URLSearchParams(location.search);
  return q.get('editorToken')||'';
}
function isAsisConsoleLocked(e=currentEng()){
  if(!e||isProcessEditorWindow())return false;
  return readProcessEditorLease()?.engagementId===e.id;
}
function guardAsisMutation(){
  if(!isAsisConsoleLocked())return false;
  toast('La Vista con cliente está abierta. Edita el AS-IS desde esa pestaña.');
  return true;
}
function releaseProcessEditorLease(token=processEditorToken()){
  const lease=readProcessEditorLease();
  if(!lease||!token||lease.token!==token)return;
  try{localStorage.removeItem(PROCESS_EDITOR_LEASE_KEY)}catch(_err){}
}
function startProcessEditorLease(){
  if(!isProcessEditorWindow())return;
  const e=currentEng(),token=processEditorToken();if(!e||!token)return;
  writeProcessEditorLease(e.id,token);
  clearInterval(__auneaProcessEditorHeartbeat);
  __auneaProcessEditorHeartbeat=setInterval(()=>writeProcessEditorLease(e.id,token),2000);
  const release=()=>releaseProcessEditorLease(token);
  window.addEventListener('beforeunload',release,{once:true});
  window.addEventListener('pagehide',release,{once:true});
}
function startProcessEditorLeaseMonitor(){
  if(typeof window==='undefined'||__auneaProcessEditorMonitor)return;
  const refresh=()=>{if(typeof applyAsisConsoleEditLock==='function')applyAsisConsoleEditLock()};
  __auneaProcessEditorMonitor=setInterval(refresh,1800);
  window.addEventListener('storage',ev=>{if(ev.key===PROCESS_EDITOR_LEASE_KEY)refresh()});
}
function openProcessEditorWindow(){
  const e=currentEng();if(!e)return;
  if(typeof persistRecoverySnapshot==='function'&&!persistRecoverySnapshot('abrir vista con cliente'))return toast('Guarda o resuelve el cambio pendiente antes de abrir la Vista con cliente.');
  const current=readProcessEditorLease(),token=current?.engagementId===e.id?current.token:id('EDITOR');
  const url=new URL(location.href);url.hash='process-editor';url.searchParams.set('engagement',e.id);url.searchParams.set('editorToken',token);
  const name='aunea_process_editor_'+String(e.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  const w=__auneaProcessEditorWindow&&!__auneaProcessEditorWindow.closed?__auneaProcessEditorWindow:window.open('',name);
  if(!w)return toast('El navegador ha bloqueado la pestaña. Permite ventanas emergentes para abrir la Vista con cliente.');
  __auneaProcessEditorWindow=w;
  writeProcessEditorLease(e.id,token);
  try{
    const same=w.location.hash==='#process-editor'&&new URLSearchParams(w.location.search).get('engagement')===e.id;
    if(!same)w.location.replace(url.toString());
  }catch(_err){w.location.replace(url.toString())}
  w.focus();
  render();
}
function closeProcessEditorWindow(){
  if(!isProcessEditorWindow())return;
  releaseProcessEditorLease();
  window.close();
}
// [AUNEA-FE-ASIS-CLIENT-EDITOR-074] END

// [AUNEA-FE-PROC-LIFECYCLE-030] END
