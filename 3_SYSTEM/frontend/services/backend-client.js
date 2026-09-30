// [AUNEA-FE-BACKEND-DISCOVERY-060] START — Descubrimiento robusto del backend local
// PURPOSE: Encontrar una instancia real de AUNEA Backend tanto en ejecución local Windows como en workspaces remotos con puertos reenviados.
// SOURCE: REQ-UAT-003; baseline Windows v1.0.4; contrato /health del backend v1.1.1; PROJECT_RULES v1.7.
// INPUTS: state.backendUrl, window.location, /health y puertos locales/remotos permitidos.
// OUTPUTS: state.backendUrl/backendOnline/backendVersion coherentes con una instancia AUNEA real.
// SIDE_EFFECTS: peticiones HTTP al backend y persistencia del endpoint encontrado en localStorage.
// CHANGE_RISK: HIGH.
const AUNEA_BACKEND_LOCAL_CANDIDATES = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8010',
  'http://127.0.0.1:8010',
  'http://localhost:8020',
  'http://127.0.0.1:8020'
];

function auneaWorkspaceBackendCandidate(loc=(typeof window!=='undefined'?window.location:null)){
  if(!loc) return '';
  const protocol=String(loc.protocol||'');
  const hostname=String(loc.hostname||'');
  if(protocol!=='https:'||!hostname.endsWith('.app.github.dev')) return '';
  const match=hostname.match(/^(.*)-\d+\.app\.github\.dev$/);
  if(!match) return '';
  return `https://${match[1]}-8000.app.github.dev`;
}

function auneaBackendCandidates(){
  const preferred = typeof state?.backendUrl === 'string' ? state.backendUrl.trim() : '';
  const workspace = auneaWorkspaceBackendCandidate();
  return [...new Set([preferred, workspace, ...AUNEA_BACKEND_LOCAL_CANDIDATES].filter(Boolean))];
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
  const candidates = auneaBackendCandidates();
  const probes = await Promise.all(candidates.map(candidate=>probeAuneaBackend(candidate)));
  const hit = probes.find(Boolean);
  if(hit){
    state.backendUrl = hit.baseUrl;
    state.backendOnline = true;
    state.backendVersion = hit.payload.backend_version;
    if(previousUrl !== hit.baseUrl && typeof audit === 'function') audit(`Backend local detectado en ${hit.baseUrl}`);
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(_err){}
    updateHeader();
    return true;
  }
  state.backendOnline = false;
  state.backendVersion = null;
  updateHeader();
  return false;
};

let __auneaBackendMonitor=null;
function stopBackendMonitor(){
  if(typeof window==='undefined'||!__auneaBackendMonitor)return;
  window.clearInterval(__auneaBackendMonitor);
  __auneaBackendMonitor=null;
}
function startBackendMonitor(intervalMs=5000){
  if(typeof window==='undefined'||__auneaBackendMonitor)return;
  __auneaBackendMonitor=window.setInterval(()=>{if(document?.getElementById)checkBackend();},intervalMs);
  if(!window.__auneaBackendFocusBound){
    window.__auneaBackendFocusBound=true;
    window.addEventListener('focus',()=>{if(document?.getElementById)checkBackend();});
    window.addEventListener('pagehide',stopBackendMonitor,{once:true});
    window.addEventListener('unload',stopBackendMonitor,{once:true});
  }
}
// [AUNEA-FE-BACKEND-DISCOVERY-060] END
