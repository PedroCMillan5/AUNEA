/* PG12 read-only comparison: source-preserving extraction from pages/results.js.
   Simulator CANONICAL PG12; DEC-034/050/052/055/056. No new data or style owners. */
function comparable(v){return v===null||v===undefined||v===''?'No disponible con evidencia suficiente':String(v)}
function stepMetric(step,key){return step?.[key]??step?.[key.replace(/[A-Z]/g,m=>'_'+m.toLowerCase())]??''}
// [AUNEA-FE-PG12-TOBE-GRAPH-234] START — source-aligned visual comparison of the two
// process graphs. Derived read-only; never estimates future savings or mutates PG11.
// SOURCE: Simulator CANONICAL PG12; DEC-034/050/052/055.
let __auneaPg12View='comparison';
let __auneaPg12SelectedSource='';
function tobeComparisonDetail(e,p,sourceId){
  const source=tobeProposalSourceSteps(e,p),item=tobeFlowItem(e,p,sourceId),
    original=source.find(x=>String(x.id)===String(item?.sourceStepId));
  if(!item)return '<p class="tobe-muted">Selecciona una actividad en los mapas para comprobar qué cambia y por qué.</p>';
  const removed=item.transformation==='Se elimina',added=!!item.isAddition;
  const label=added?'Actividad incorporada':removed?'Actividad propuesta para eliminar':'Actividad transformada';
  return '<div class="pg12-difference-detail">'+
    '<span class="tobe-eyebrow">'+label+'</span>'+
    '<h3>'+esc(tobeFlowItemName(item))+'</h3>'+
    '<p><b>Origen AS-IS:</b> '+esc(original?.step_name||item.sourceStepName||'Sin correspondencia')+'</p>'+
    '<p><b>Decisión TO-BE:</b> '+esc(item.transformation||'Pendiente')+'</p>'+
    '<p><b>Qué cambia y por qué:</b> '+esc(item.problemResolved||'No documentado')+'</p>'+
    '<p><b>Responsable futuro:</b> '+esc(removed?'Actividad eliminada':(labelFrom('OS_ACTOR_ROLE',item.futureActor)||comparable(item.futureActor)))+'</p>'+
    '<p><b>Herramienta futura:</b> '+esc(removed?'Actividad eliminada':(labelFrom('OS_TOOL_CATEGORY',item.tool)||comparable(item.tool)))+'</p>'+
    '<p><b>Entradas futuras:</b> '+esc(removed?'Actividad eliminada':tobeArtifactDisplay(item.inputs,item._details?.inputs))+'</p>'+
    '<p><b>Salidas futuras:</b> '+esc(removed?'Actividad eliminada':tobeArtifactDisplay(item.outputs,item._details?.outputs))+'</p>'+
    '<p><b>Automatización e IA:</b> '+esc(comparable(item.automationAi))+'</p>'+
    '<p><b>Supervisión humana:</b> '+esc(comparable(item.humanSupervision))+'</p>'+
    '<p><b>Control / riesgo:</b> '+esc(comparable(item.controlsRisk))+'</p>'+
    '<p class="tobe-muted">Los tiempos futuros y beneficios económicos no se infieren del estado de transformación.</p>'+
  '</div>';
}
function tobeComparisonPage(){
  const e=currentEng(),snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null,p=latestTobe(e);
  if(!snap||!p||!['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'].includes(p.status))
    return pageTop('AS-IS vs TO-BE','La comparación reutiliza las fuentes versionadas; no captura datos nuevos.',
      '<button class="btn" data-page="tobe">Volver a TO-BE</button>')+
      '<div class="empty"><h2>TO-BE revisado requerido</h2><p>La comparación se habilita cuando el TO-BE ha pasado revisión humana.</p></div>';
  const source=(e.confirmedSnapshots||[]).find(s=>s.version===p.sourceSnapshotVersion)||snap,
    asis=(source.processSteps||[]).filter(x=>x.status!=='SUPERSEDED'),
    future=[...p.items,...tobeAddedSteps(p)],originalById=new Map(asis.map(x=>[String(x.id),x]));
  const options=[['actual','Actual'],['proposed','Propuesto'],['comparison','Comparación']];
  const selector='<nav class="pg12-view-selector" aria-label="Vista de comparación">'+options.map(([value,label])=>
    '<button type="button" data-pg12-view="'+value+'" class="btn '+(__auneaPg12View===value?'btn-primary':'btn-outline')+
    '" aria-pressed="'+(__auneaPg12View===value?'true':'false')+'">'+label+'</button>').join('')+'</nav>';
  const rows=future.map(it=>{
    const orig=originalById.get(String(it.sourceStepId)),isAdded=!!it.isAddition;
    return '<tr><td>'+esc(tobeFlowItemName(it))+'</td>'+
      '<td>'+esc(isAdded?'No existe':comparable(stepMetric(orig,'actor')))+'</td>'+
      '<td>'+esc(it.transformation==='Se elimina'?'Actividad eliminada':comparable(it.futureActor))+'</td>'+
      '<td>'+esc(isAdded?'No existe':comparable(stepMetric(orig,'tool')))+'</td>'+
      '<td>'+esc(it.transformation==='Se elimina'?'No aplica':comparable(it.tool))+'</td>'+
      '<td>'+esc(isAdded?'Se incorpora':it.transformation||'—')+'</td>'+
      '<td>'+esc(comparable(it.automationAi))+'</td>'+
      '<td>'+esc(comparable(it.humanSupervision))+'</td>'+
      '<td>'+esc(comparable(it.controlsRisk))+'</td></tr>';
  }).join('');
  const fr=(source.frictions||[]).filter(x=>x.status!=='SUPERSEDED'),
    baseline={...e,processSteps:asis,frictions:fr,risks:source.risks||[],
      economicInputs:source.economicInputs||[]};
  const start=typeof processBoundaryValue==='function'?
    processBoundaryValue(e,'DF014','Inicio del proceso','DF012'):'Inicio del proceso';
  const end=typeof processBoundaryValue==='function'?
    processBoundaryValue(e,'DF015','Fin del proceso','DF013'):'Fin del proceso';
  const currentMap=typeof processGraphHtml==='function'?
    processGraphHtml(baseline,asis,fr,start,end,'cliente',true).replace(
      /data-graph-node="([^"]+)"/g,(match,id)=>String(id).startsWith('__')?match:
        match+' data-pg12-source="'+attr(id)+'" tabindex="0" role="button"'):
    '<p class="notice warn">El componente AS-IS no está disponible.</p>';
  const futureMap=tobeCanvasHtml(e,p).replace(/data-tobe-select="/g,'data-pg12-source="');
  const maps='<div class="pg12-process-comparison '+(__auneaPg12View==='comparison'?'pg12-side-by-side':'')+'">'+
    (__auneaPg12View!=='proposed'?'<section class="pg12-map" aria-label="Proceso actual AS-IS"><h3>Actual · AS-IS confirmado</h3>'+
      '<div class="pg12-map-viewport">'+currentMap+'</div></section>':'')+
    (__auneaPg12View!=='actual'?'<section class="pg12-map" aria-label="Proceso futuro TO-BE"><h3>Propuesto · TO-BE revisado</h3>'+
      futureMap+'</section>':'')+'</div>';
  const selected=__auneaPg12SelectedSource||String(p.items[0]?.sourceStepId||'');
  const diagnostic=currentDiagnosticOutput(e),pt=diagnostic?.process_time_projection||null;
  const metrics='<div class="grid g3"><div class="notice"><b>Impacto activo cuantificado AS-IS</b><br>'+
    (pt?.annual_active_hours!=null?num(pt.annual_active_hours)+' h/año':'No disponible con evidencia suficiente')+
    '<small>Proyección AS-IS, sin hipótesis futura.</small></div><div class="notice"><b>Espera anual AS-IS</b><br>'+
    (pt?.annual_wait_exposure_hours!=null?num(pt.annual_wait_exposure_hours)+' caso-horas/año':'No disponible con evidencia suficiente')+
    '<small>Exposición a espera, no trabajo activo.</small></div><div class="notice"><b>Retrabajo AS-IS</b><br>'+
    (pt?.annual_rework_hours!=null?num(pt.annual_rework_hours)+' h/año':'No disponible con evidencia suficiente')+
    '<small>TO-BE sin cifra comparable aprobada.</small></div><div class="notice"><b>Capacidad liberada</b><br>No disponible con evidencia suficiente</div>'+
    '<div class="notice"><b>Ahorro de caja</b><br>No disponible con evidencia suficiente</div>'+
    '<div class="notice"><b>Riesgo residual futuro</b><br>No disponible con evidencia suficiente</div></div>';
  return pageTop('AS-IS vs TO-BE','Versión AS-IS '+esc(source.version)+' · TO-BE v'+esc(p.version)+
    '. Comparación derivada de fuentes revisadas; ninguna métrica económica se calcula en el navegador.',
    '<button class="btn" data-page="tobe">Volver a TO-BE</button>')+
    section('Visualización del cambio','Actual | Propuesto | Comparación, manteniendo la correspondencia entre actividades.',
      selector+maps+
      '<section class="pg12-selected-detail" id="pg12SelectedDetail" aria-live="polite">'+
      tobeComparisonDetail(e,p,selected)+'</section>')+
    section('Qué cambia','Incluye actividades originales, eliminadas e incorporadas, con su correspondencia al AS-IS.',
      '<div class="table-wrap"><table class="data-table"><thead><tr>'+
      '<th>Paso</th><th>Actor actual</th><th>Actor propuesto</th>'+
      '<th>Herramienta actual</th><th>Herramienta propuesta</th><th>Transformación</th>'+
      '<th>Automatización / IA</th><th>Intervención humana</th><th>Control</th>'+
      '</tr></thead><tbody>'+rows+'</tbody></table></div>')+
    section('Métricas comparables','Se muestran sólo outputs del backend. Ninguna mejora futura se deduce de la etiqueta TO-BE.',metrics);
}
// [AUNEA-FE-PG12-TOBE-GRAPH-234] END

// [AUNEA-FE-PG12-MAP-SELECT-235] START — comparison-only map selection and lifecycle.
function registerPg12Interactions(){
  document.addEventListener('click',event=>{
    const view=event.target?.closest?.('[data-pg12-view]');
    const node=event.target?.closest?.('[data-pg12-source]');
    if(state.activePage!=='comparacion'||(!view&&!node))return;
    event.preventDefault();
    if(view){
      const next=view.getAttribute('data-pg12-view');
      if(!['actual','proposed','comparison'].includes(next))return;
      __auneaPg12View=next;render();return;
    }
    const id=String(node.getAttribute('data-pg12-source')||'');
    const e=currentEng(),p=latestTobe(e);
    if(!tobeFlowItem(e,p,id))return;
    __auneaPg12SelectedSource=id;
    const detail=document.getElementById('pg12SelectedDetail');
    if(detail)detail.innerHTML=tobeComparisonDetail(e,p,id);
    document.querySelectorAll('[data-pg12-source]').forEach(el=>{
      const selected=el.getAttribute('data-pg12-source')===id;
      el.classList.toggle('pg12-node-selected',selected);
      el.setAttribute('aria-selected',String(selected));
    });
  },true);
  document.addEventListener('keydown',event=>{
    if(state.activePage!=='comparacion'||!['Enter',' '].includes(event.key))return;
    const node=event.target?.closest?.('[data-pg12-source][role="button"]');
    if(node){event.preventDefault();node.click();}
  },true);

}
function pg12AfterBind(){
  if(state.activePage==='comparacion'&&typeof drawProcessGraph==='function'&&
    typeof requestAnimationFrame==='function'){
    requestAnimationFrame(()=>{
      document.querySelectorAll('.pg12-map .process-graph-board').forEach(
        board=>drawProcessGraph(board));
      document.querySelectorAll('[data-pg12-source]').forEach(el=>{
        el.classList.toggle('pg12-node-selected',
          el.getAttribute('data-pg12-source')===__auneaPg12SelectedSource);
      });
    });
  }
}
// [AUNEA-FE-PG12-MAP-SELECT-235] END
