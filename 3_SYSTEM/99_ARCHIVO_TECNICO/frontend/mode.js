// [AUNEA-FE-UX-MODE-040] START — Modo Sesión / Modo Interno
// PURPOSE: Present two UX layers over the same AUNEA Internal state and business logic.
// SOURCE: REQ-UX-001; DEC-040/041; AUNEA_INTERNAL_REQUIREMENTS v1.0 CANONICAL.
// INPUTS: existing frontend state/pages and current engagement.
// OUTPUTS: client-presentable Session navigation or full Internal navigation without duplicating data.
// SIDE_EFFECTS: UI preference in localStorage; DOM classes/navigation only.
// CHANGE_RISK: HIGH.
const UI_MODE_PREF_KEY='aunea_internal_ui_mode_v1';
const SESSION_PAGES=new Set(['inicio','diagnostico','proceso','resultados','recomendacion','escenarios','quote']);
const SESSION_NAV=[['SESIÓN'],['inicio','⌂','Inicio'],['diagnostico','◎','Diagnóstico'],['proceso','⇢','Proceso'],['resultados','▥','Resultados'],['recomendacion','≋','Recomendación'],['escenarios','▦','Escenarios'],['quote','▧','Propuesta económica']];
state.uiMode=localStorage.getItem(UI_MODE_PREF_KEY)||state.uiMode||'INTERNAL';
if(!['SESSION','INTERNAL'].includes(state.uiMode))state.uiMode='INTERNAL';

const __auneaRenderNavInternal=renderNav;
renderNav=function(){
  // VR-02 applies to PG01–PG09 and their AS-IS editor even when the legacy mode is selected.
  if(state.uiMode!=='SESSION'||SESSION_SURFACE_PAGES.has(state.activePage))return __auneaRenderNavInternal();
  const n=document.getElementById('nav');if(!n)return;
  n.innerHTML=SESSION_NAV.map(x=>x.length===1?`<div class="nav-group">${x[0]}</div>`:`<button class="nav-item ${state.activePage===x[0]?'active':''}" data-page="${x[0]}"><span class="nav-icon">${x[1]}</span>${x[2]}</button>`).join('');
};
const __auneaSetPageModeBase=setPage;
setPage=function(page){
  if(state.uiMode==='SESSION'&&!SESSION_PAGES.has(page)){toast('Esta pantalla pertenece al Modo Interno.');return}
  return __auneaSetPageModeBase(page);
};
const __auneaPageTopModeBase=pageTop;
// Forwards every argument: pageTop gained a screenId, and a fixed-arity wrapper would silently swallow
// it, dropping the reference identifier from every page in Internal mode.
pageTop=function(...args){
  const [title,subtitle,actions='']=args;
  if(state.uiMode!=='SESSION')return __auneaPageTopModeBase(...args);
  // The client-facing surface never shows the internal reference identifier.
  return `<div class="page-head session-page-head"><div><div class="eyebrow">AUNEA · SESIÓN CON CLIENTE</div><h1>${esc(title)}</h1><p class="subtitle">${subtitle}</p></div><div class="head-actions">${actions}</div></div>`;
};
const __auneaUpdateHeaderModeBase=updateHeader;
updateHeader=function(){__auneaUpdateHeaderModeBase();applyModeChrome()};
function setUIMode(mode){
  if(!['SESSION','INTERNAL'].includes(mode))return;
  state.uiMode=mode;localStorage.setItem(UI_MODE_PREF_KEY,mode);
  if(mode==='SESSION'&&!SESSION_PAGES.has(state.activePage))state.activePage=currentEng()?'diagnostico':'inicio';
  audit(`Interfaz cambiada a Modo ${mode==='SESSION'?'Sesión':'Interno'}`);render();
}
function applyModeChrome(){
  const session=state.uiMode==='SESSION';document.body.classList.toggle('mode-session',session);document.body.classList.toggle('mode-internal',!session);
  const top=document.querySelector('.topbar-right');if(top&&!document.getElementById('uiModeToggle')){const b=document.createElement('button');b.id='uiModeToggle';b.className='btn btn-outline mode-toggle';top.prepend(b)}
  const toggle=document.getElementById('uiModeToggle');if(toggle){toggle.textContent=session?'Cambiar a Modo Interno':'Abrir Modo Sesión';toggle.onclick=()=>setUIMode(session?'INTERNAL':'SESSION')}
  // The rail brand and signature are fixed by the approved references and are not mode chrome, so this
  // no longer rewrites them. (This module is replaced by the real Session Display surface in a later phase.)
}
(function injectModeStyles(){if(document.getElementById('auneaModeStyles'))return;const s=document.createElement('style');s.id='auneaModeStyles';s.textContent=`
.mode-session .backend-badge,.mode-session .save-state{display:none}.mode-session .canonical-id{display:none!important}.mode-session .internal-only,.mode-session .internal-tag{display:none!important}.mode-session .question-purpose{font-size:12px;line-height:1.55}.mode-session .question-title{font-size:15px}.mode-session .question-card{padding:18px;margin:14px 0}.mode-session .field label{font-size:13px}.mode-session .field input,.mode-session .field select,.mode-session .field textarea{font-size:14px;padding:12px}.mode-session .choice label,.mode-session .segment{font-size:12px;padding:10px 12px}.mode-session .btn{font-size:13px;padding:10px 14px}.mode-session .content{max-width:1450px;padding-top:28px}.mode-session h1{font-size:40px}.mode-session .subtitle{font-size:16px}.mode-session .stage-btn b{font-size:13px}.mode-session .stage-btn small{font-size:10px}.mode-session .stage-layout{grid-template-columns:285px minmax(0,1fr)}.mode-session .flow-step{width:240px}.mode-session .flow-step h4{font-size:14px}.mode-session .flow-step p{font-size:11px}.mode-session .sidebar-foot small{display:none}.mode-session .question-meta{display:none}.mode-session .field-help .canonical-id{display:none!important}.mode-toggle{white-space:nowrap}
@media(max-width:900px){.mode-session .stage-layout{grid-template-columns:1fr}.mode-session h1{font-size:32px}}
`;document.head.appendChild(s)})();
// [AUNEA-FE-UX-MODE-040] END
