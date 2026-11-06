// [AUNEA-FE-BOOT-INIT-010] START — Arranque único
// PURPOSE: Iniciar los módulos cargados en orden por index.html usando el Diagnostic Master canónico vigente.
// SOURCE: AUNEA Internal v1.0.4 aceptada; Diagnostic Master v1.2 CANONICAL; PROJECT_RULES.md; DEC-053.
// INPUTS: módulos, DOM y adapter AUNEA-DATA-DIAG-ADAPTER-010 listos.
// NOTE: la migración de almacenamiento corre aquí, no en loadState, porque cada migración vive en el
// módulo dueño de su schema y ésos se cargan después del estado.
// OUTPUTS: Console interna o una de las superficies cliente independientes.
// SIDE_EFFECTS: carga de schema canónico efectivo y comprobación HTTP sólo en Console.
// CHANGE_RISK: HIGH.
// Shared windows deliberately do not boot the Console.
// Reuse the PG11 overview, without adding a second business data owner.
const __pg11BaseOverview=tobeGlobalOverviewHtml;
tobeGlobalOverviewHtml=(e,p)=>{
 let h=__pg11BaseOverview(e,p),r=tobeGlobalStored(e,p),g=r?.progress;
 if(!g)return h;
 const done=g.focus_done?.length??g.completed??0,total=g.total||0,
   cards=r.opportunities||[],
   intact=cards.filter(x=>[x.how,x.why].every(v=>/[.!?…]$/.test(v||''))).length,
   reviewed=Object.keys(tobeHumanReviewRecord(e,p)?.decisions||{}).length;
 const status='<div role="status" class="tobe-global-feedback">'+
   '<p><b>Fuentes:</b> '+done+'/'+total+'</p>'+
   '<p><b>Integridad:</b> '+intact+'/'+cards.length+'</p>'+
   '<p><b>Revisión humana:</b> '+reviewed+' decisiones registradas; sin aprobar.</p></div>';
 h=h.replace(/<p class="tobe-global-feedback" role="status">Fuentes revisadas:[\s\S]*?<\/p>/,status);
 if(p?.status==='DRAFT'&&!r.complete&&done<total&&Array.isArray(g.focus_done))
   h=h.replace('</button></header>','</button><button type="button" id="retryTobeGlobal" class="btn btn-outline btn-small"'+
     (internalAiGlobalWorking(e)?' disabled':'')+'>Reintentar fuentes pendientes</button></header>');
 return h;
};
if((location.hash==='#session'||location.hash==='#results')&&CLIENT_DISPLAY_PAUSED){bootPausedClientDisplay();}
else if(location.hash==='#session'){bootSessionDisplay();}
else if(location.hash==='#results'){bootResultsMode();}
else{
  document.body.classList.add(isProcessEditorWindow()?'mode-process-editor':'mode-internal');
  if(typeof registerInternalWorkPages==='function')registerInternalWorkPages();
  if(typeof registerResultsModeLauncher==='function')registerResultsModeLauncher();
  migrateLoadedState();
  if(typeof reconcileLoadedUat3InvoiceFlow==='function'&&reconcileLoadedUat3InvoiceFlow()){
    if(typeof persistRecoverySnapshot==='function')persistRecoverySnapshot('uat3-invoice-flow-reconciled');
  }
  if(isProcessEditorWindow()){
    const requested=new URLSearchParams(location.search).get('engagement');
    if(requested&&state.engagements.some(e=>e.id===requested))state.activeEngagementId=requested;
    state.activePage='proceso';state.uiMode='CLIENT_EDITOR';
    if(typeof startProcessEditorLease==='function')startProcessEditorLease();
  }else if(typeof startProcessEditorLeaseMonitor==='function')startProcessEditorLeaseMonitor();
  initCanonicalV12();

}
// [AUNEA-FE-BOOT-INIT-010] END
