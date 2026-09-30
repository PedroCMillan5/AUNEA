// [AUNEA-FE-PERSIST-050] START — Persistencia y recuperación
// PURPOSE: Recover AUNEA Internal state after close/reopen and provide explicit JSON backup/restore without mixing QA/UAT responsibilities.
// SOURCE: REQ-CRM-002; REQ-ENG-001; DEC-040/042/043.
// INPUTS: shared application state and canonical schema metadata.
// OUTPUTS: recovery snapshot and JSON backup/restore.
// SIDE_EFFECTS: localStorage recovery snapshot; optional JSON download/upload.
// CHANGE_RISK: HIGH.
const RECOVERY_FORMAT_VERSION='AUNEA_INTERNAL_STATE_V1';
const LEGACY_RECOVERY_FORMAT_VERSION='AUNEA_INTERNAL_V1';
function normalizeRecoveredState(raw){
  const base=blankState(),out={...base,...(raw||{})};
  ['companies','contacts','opportunities','engagements','projects','audit'].forEach(k=>{if(!Array.isArray(out[k]))out[k]=[]});
  out.engagements.forEach(e=>{
    e.answers=e.answers||{};e.answerDetails=e.answerDetails||{};
    e.processSteps=Array.isArray(e.processSteps)?e.processSteps:[];
    e.frictions=Array.isArray(e.frictions)?e.frictions:[];
    e.risks=Array.isArray(e.risks)?e.risks:[];
    e.economicInputs=Array.isArray(e.economicInputs)?e.economicInputs:[];
    e.scenarioResults=Array.isArray(e.scenarioResults)?e.scenarioResults:[];
  });
  return out;
}
// [AUNEA-FE-PERSIST-SYNC-051] START — Same-study three-way reconciliation.
// DEC-050/065: localStorage is shared, but an open editor keeps its own unsaved draft.
// Compare each edit with the last accepted state; never select an entire Engagement by timestamp.
const RECOVERY_TAB_LOCAL=['activePage','activeEngagementId','uiMode','returnTo','selectedCompanyId','selectedContactId','companyTab','companySearch','companyFilters','contactSearch','contactFilters','interactionFilters','opportunityFilters','companyInspectorTab'];
const recoveryClone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const recoverySame=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
let __auneaSyncedState=null,__auneaConflictNotified=false;
function recoveryShared(x){
  const result=recoveryClone(x);
  for(const k of [...RECOVERY_TAB_LOCAL,'dirty','audit','recoveryMeta'])delete result[k];
  return result;
}
function recoveryIds(x){return Array.isArray(x)&&x.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.id==='string')}
function recoveryReconcile(base,local,remote,path,conflicts){
  if(recoverySame(local,remote))return recoveryClone(local);
  if(recoverySame(local,base))return recoveryClone(remote);
  if(recoverySame(remote,base))return recoveryClone(local);
  if(recoveryIds(base)&&recoveryIds(local)&&recoveryIds(remote)){
    const byId=x=>new Map(x.map(v=>[v.id,v]));
    const [b,l,r]=[base,local,remote].map(byId);
    return [...new Set([...r.keys(),...l.keys(),...b.keys()])]
      .map(id=>recoveryReconcile(b.get(id),l.get(id),r.get(id),path+'/'+id,conflicts))
      .filter(v=>v!==undefined);
  }
  if([base,local,remote].every(v=>v===undefined||(v!==null&&typeof v==='object'&&!Array.isArray(v)))){
    const value={};
    for(const k of new Set([...Object.keys(base||{}),...Object.keys(local||{}),...Object.keys(remote||{})])){
      const next=recoveryReconcile(base?.[k],local?.[k],remote?.[k],path+'/'+k,conflicts);
      if(next!==undefined)value[k]=next;
    }
    return value;
  }
  // A timestamp is metadata, never grounds for dropping a business edit.
  if(path.endsWith('/updatedAt'))return recoveryClone(remote);
  conflicts.push(path);
  return recoveryClone(local);
}
function recoveryModalOpen(){return typeof isProcessEditorWindow==='function'&&isProcessEditorWindow()&&!!document.querySelector('#modalRoot .modal')}
function reconcileRecoveryWithDisk(){
  const disk=localStorage.getItem(STORAGE_KEY);
  const remote=disk?normalizeRecoveredState(JSON.parse(disk)):recoveryClone(__auneaSyncedState);
  const conflicts=[];
  const shared=recoveryReconcile(recoveryShared(__auneaSyncedState),recoveryShared(state),recoveryShared(remote),'',conflicts);
  if(conflicts.length)return {conflicts};
  const merged={...remote,...shared};
  for(const key of RECOVERY_TAB_LOCAL)merged[key]=state[key];
  merged.audit=[...new Map([...(remote.audit||[]),...(state.audit||[])].map(x=>[x.ts+'|'+x.message,x])).values()].slice(-250);
  return {merged,conflicts};
}
// The storage listener never replaces a draft under an open modal; its save reconciles it
// against the latest disk state before the shared and client-safe projections are published.
function persistRecoverySnapshot(reason='recovery'){
  if(typeof isClientDisplay==='function'&&isClientDisplay())return false;
  if(recoveryModalOpen())return false;
  try{
    const result=reconcileRecoveryWithDisk();
    if(result.conflicts.length){
      if(!__auneaConflictNotified){
        __auneaConflictNotified=true;
        toast('Dos ventanas han modificado el mismo dato. No se ha sobrescrito ningún cambio; revisa ambos formularios.');
      }
      return false;
    }
    __auneaConflictNotified=false;
    state=result.merged;
    state.dirty=false;
    state.recoveryMeta={format:RECOVERY_FORMAT_VERSION,productVersion:typeof AUNEA_PRODUCT_VERSION!=='undefined'?AUNEA_PRODUCT_VERSION:null,schemaVersion:typeof STORAGE_SCHEMA_VERSION!=='undefined'?STORAGE_SCHEMA_VERSION:null,diagnosticSchema:schema?.version||'1.1',savedAt:now(),reason};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    __auneaSyncedState=recoveryClone(state);
    updateHeader();
    return true;
  }catch(err){console.error('AUNEA_RECOVERY_WRITE_ERROR',err);return false}
}
let __auneaRecoveryTimer=null;
const __auneaMarkDirtyPersistBase=markDirty;
markDirty=function(reason){
  __auneaMarkDirtyPersistBase(reason);
  clearTimeout(__auneaRecoveryTimer);
  __auneaRecoveryTimer=setTimeout(()=>{
    if(persistRecoverySnapshot('autosave')&&typeof publishSessionSnapshot==='function')publishSessionSnapshot(currentEng());
  },350);
};
const __auneaSaveStatePersistBase=saveState;
saveState=function(reason='Guardado manual'){
  if(!persistRecoverySnapshot(reason))return false;
  const result=__auneaSaveStatePersistBase(reason);
  __auneaSyncedState=recoveryClone(state);
  return result;
};
window.addEventListener('beforeunload',()=>persistRecoverySnapshot('beforeunload'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistRecoverySnapshot('visibility-hidden')});
window.addEventListener('storage',ev=>{
  if(ev.key!==STORAGE_KEY||!ev.newValue||isClientDisplay())return;
  try{
    // Do not replace a modal's captured Engagement object, or redraw an unsaved form.
    // Reconcile the complete incoming state during the following explicit/autosave write.
    if(recoveryModalOpen()||state.dirty)return;
    const incoming=normalizeRecoveredState(JSON.parse(ev.newValue));
    const localUi=Object.fromEntries(RECOVERY_TAB_LOCAL.map(k=>[k,state[k]]));
    const flowCanvas=document.querySelector('.flow-canvas');
    const viewport=flowCanvas?{left:flowCanvas.scrollLeft,top:flowCanvas.scrollTop}:null;
    state={...incoming,...localUi};
    __auneaSyncedState=recoveryClone(incoming);
    if(isProcessEditorWindow())state.activePage='proceso';
    render();
    if(viewport)requestAnimationFrame(()=>{
      const next=document.querySelector('.flow-canvas');
      if(next){next.scrollLeft=viewport.left;next.scrollTop=viewport.top}
    });
  }catch(err){console.error('AUNEA_CROSS_TAB_SYNC_ERROR',err)}
});
// [AUNEA-FE-PERSIST-SYNC-051] END
function exportStateBackup(){
  if(!persistRecoverySnapshot('backup'))return;
  const payload={format:RECOVERY_FORMAT_VERSION,productVersion:typeof AUNEA_PRODUCT_VERSION!=='undefined'?AUNEA_PRODUCT_VERSION:null,exportedAt:now(),schemaSource:schema?.source||null,state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`AUNEA_Internal_Backup_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);audit('Backup JSON exportado')
}
function importStateBackup(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
  inp.onchange=async()=>{
    const file=inp.files?.[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text()),raw=parsed.state||parsed;
      if(parsed.format&&![RECOVERY_FORMAT_VERSION,LEGACY_RECOVERY_FORMAT_VERSION].includes(parsed.format))throw new Error('Formato de backup no reconocido');
      const recovered=normalizeRecoveredState(raw);
      if(!confirm(`Restaurar backup con ${recovered.companies.length} empresas y ${recovered.engagements.length} estudios?`))return;
      state=recovered;__auneaSyncedState=recoveryClone(normalizeRecoveredState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')));if(!persistRecoverySnapshot('import'))return;audit('Backup JSON restaurado');render();toast('Backup restaurado correctamente.');
    }catch(err){toast('No se pudo restaurar el backup: '+err.message)}
  };
  inp.click()
}
state=normalizeRecoveredState(state);
__auneaSyncedState=recoveryClone(state);
// Opening a second window reads existing storage; it must not republish a stale copy.
// [AUNEA-FE-PERSIST-050] END
