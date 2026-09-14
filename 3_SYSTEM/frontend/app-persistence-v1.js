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
function persistRecoverySnapshot(reason='recovery'){
  try{
    state.recoveryMeta={format:RECOVERY_FORMAT_VERSION,productVersion:typeof AUNEA_PRODUCT_VERSION!=='undefined'?AUNEA_PRODUCT_VERSION:null,schemaVersion:typeof STORAGE_SCHEMA_VERSION!=='undefined'?STORAGE_SCHEMA_VERSION:null,diagnosticSchema:schema?.version||'1.1',savedAt:now(),reason};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;
  }catch(err){console.error('AUNEA_RECOVERY_WRITE_ERROR',err);return false}
}
let __auneaRecoveryTimer=null;
const __auneaMarkDirtyPersistBase=markDirty;
markDirty=function(reason){__auneaMarkDirtyPersistBase(reason);clearTimeout(__auneaRecoveryTimer);__auneaRecoveryTimer=setTimeout(()=>persistRecoverySnapshot('autosave'),350)};
const __auneaSaveStatePersistBase=saveState;
saveState=function(reason='Guardado manual'){
  state.recoveryMeta={format:RECOVERY_FORMAT_VERSION,productVersion:typeof AUNEA_PRODUCT_VERSION!=='undefined'?AUNEA_PRODUCT_VERSION:null,schemaVersion:typeof STORAGE_SCHEMA_VERSION!=='undefined'?STORAGE_SCHEMA_VERSION:null,diagnosticSchema:schema?.version||'1.1',savedAt:now(),reason};
  return __auneaSaveStatePersistBase(reason)
};
window.addEventListener('beforeunload',()=>persistRecoverySnapshot('beforeunload'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistRecoverySnapshot('visibility-hidden')});
function exportStateBackup(){
  persistRecoverySnapshot('backup');
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
      state=recovered;persistRecoverySnapshot('import');audit('Backup JSON restaurado');render();toast('Backup restaurado correctamente.');
    }catch(err){toast('No se pudo restaurar el backup: '+err.message)}
  };
  inp.click()
}
state=normalizeRecoveredState(state);
if(typeof STORAGE_KEY!=='undefined')persistRecoverySnapshot('module-init');
// [AUNEA-FE-PERSIST-050] END
