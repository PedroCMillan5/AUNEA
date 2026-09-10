// [AUNEA-FE-BACKEND-DISCOVERY-060] START — Descubrimiento robusto del backend local
// PURPOSE: Encontrar una instancia real de AUNEA Backend cuando el puerto 8000 está ocupado o reservado en Windows.
// SOURCE: REQ-UAT-003; baseline Windows v1.0.4; contrato /health del backend v1.1.1.
// INPUTS: state.backendUrl, /health local, puertos locales permitidos.
// OUTPUTS: state.backendUrl/backendOnline/backendVersion coherentes con una instancia AUNEA real.
// SIDE_EFFECTS: peticiones HTTP locales y persistencia del endpoint encontrado en localStorage.
// CHANGE_RISK: HIGH.
const AUNEA_BACKEND_LOCAL_CANDIDATES = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8010',
  'http://127.0.0.1:8010',
  'http://localhost:8020',
  'http://127.0.0.1:8020'
];

function auneaBackendCandidates(){
  const preferred = typeof state?.backendUrl === 'string' ? state.backendUrl.trim() : '';
  return [...new Set([preferred, ...AUNEA_BACKEND_LOCAL_CANDIDATES].filter(Boolean))];
}

async function probeAuneaBackend(baseUrl, timeoutMs=1100){
  const ctl = new AbortController();
  const timer = setTimeout(()=>ctl.abort(), timeoutMs);
  try{
    const response = await fetch(`${baseUrl}/health`, {signal:ctl.signal, cache:'no-store'});
    if(!response.ok) return null;
    const payload = await response.json();
    if(payload?.status !== 'ok' || !payload?.backend_version) return null;
    return {baseUrl, payload};
  }catch(_err){
    return null;
  }finally{
    clearTimeout(timer);
  }
}

checkBackend = async function(){
  const previousUrl = state.backendUrl;
  for(const candidate of auneaBackendCandidates()){
    const hit = await probeAuneaBackend(candidate);
    if(!hit) continue;
    state.backendUrl = hit.baseUrl;
    state.backendOnline = true;
    state.backendVersion = hit.payload.backend_version;
    if(previousUrl !== hit.baseUrl && typeof audit === 'function') audit(`Backend local detectado en ${hit.baseUrl}`);
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(_err){}
    updateHeader();
    return true;
  }
  state.backendOnline = false;
  updateHeader();
  return false;
};
// [AUNEA-FE-BACKEND-DISCOVERY-060] END
