/* PG12 — Single, read-only AS-IS / TO-BE overlay.
   SOURCE: Simulator CANONICAL PG12; DEC-034/050/052/055/075.
   No new data owners, inferred savings, changes to PG11, or duplicate maps. */
function comparable(v){return v===null||v===undefined||v===''?'No disponible con evidencia suficiente':String(v)}
function stepMetric(step,key){return step?.[key]??step?.[key.replace(/[A-Z]/g,m=>'_'+m.toLowerCase())]??''}

// [AUNEA-FE-PG12-OVERLAY-MODEL-469] START
// PURPOSE: Compose one immutable source-linked comparison of original and proposed routes.
// SOURCE: confirmed AS-IS snapshot, reviewed TO-BE items/flow; PG12 canonical contract.
// INPUTS: engagement, reviewed proposal, pinned snapshot.
// OUTPUTS: one graph layout with two read-only route layers and source issues.
// SIDE_EFFECTS: none. No estimates or changes to historical snapshots.
// CHANGE_RISK: HIGH; tested with decisions, additions, removals and source-only routes.
let __auneaPg12View='comparison';
let __auneaPg12SelectedSource='';
function pg12Related(values,id){
  return typeof processRefIncludes==='function'?processRefIncludes(values,id):
    (Array.isArray(values)?values:[values]).some(v=>String(v)===String(id));
}
function pg12OriginalSignals(source,sourceId){
  const step=(source.processSteps||[]).find(s=>String(s.id)===String(sourceId));
  const frictions=(source.frictions||[]).filter(f=>f.status!=='SUPERSEDED'&&pg12Related(f.affected_steps,sourceId));
  const risks=(source.risks||[]).filter(r=>r.status!=='SUPERSEDED'&&pg12Related(r.step_ids,sourceId));
  const positive=field=>{const v=Number(stepMetric(step,field));return Number.isFinite(v)&&v>0?v:null};
  return {step,frictions,risks,wait:positive('waitTime'),rework:positive('reworkTime'),active:positive('activeTime')};
}
function pg12OverlayModel(e,p,source){
  const asis=(source.processSteps||[]).filter(s=>s.status!=='SUPERSEDED'),
    proposed=tobeFutureSteps(e,p),items=[...(p.items||[]),...tobeAddedSteps(p)],
    originalIds=new Set(asis.map(s=>String(s.id))),futureIds=new Set(proposed.map(s=>String(s.id))),
    flow=tobeFlowOwner(e,p),start=String(flow.startStepId||proposed[0]?.id||''),
    ordered=[...proposed.filter(s=>String(s.id)===start),...proposed.filter(s=>String(s.id)!==start)],
    graphSteps=[...ordered,...asis.filter(s=>!futureIds.has(String(s.id)))],
    layout=processGraphData(e,graphSteps),
    originalEdges=processGraphData(e,asis).edges,
    futureEdges=processGraphData(e,ordered).edges,
    positions=new Map([...layout.positions].map(([id,pos])=>[String(id),pos])),
    nodes=[...layout.nodes],
    edgeIds=new Set([...originalEdges,...futureEdges].flatMap(x=>[String(x.from),String(x.to)])),
    existing=new Set(nodes.map(x=>String(x.id)));
  let cols=layout.cols,rows=layout.rows;
  for(const id of edgeIds){
    if(existing.has(id))continue;
    if(id==='__END__'||id==='__START__')continue;
    cols+=1;rows=Math.max(rows,3);
    nodes.push({id,kind:'pending',route:'Ruta pendiente'});
    positions.set(id,{row:3,col:cols});existing.add(id);
  }
  const findings=typeof tobeCoherenceFindings==='function'?tobeCoherenceFindings(e,p):[];
  const byId=new Map(items.map(item=>[String(tobeFlowItemId(item)),item]));
  const originals=new Map(asis.map(s=>[String(s.id),s]));
  return {nodes,positions,cols,rows,asis,items,originals,byId,originalIds,futureIds,
    originalEdges,futureEdges,findings};
}
function pg12EdgeKey(edge){return [String(edge.from),String(edge.to),String(edge.label||'')].join('|')}
function pg12OverlayNode(model,source,node,i,selected){
  const id=String(node.id),item=model.byId.get(id),
    original=model.originals.get(id),
    signals=original?pg12OriginalSignals(source,id):{frictions:[],risks:[],wait:null,rework:null,active:null},
    state=item?.isAddition?'added':item?.transformation==='Se elimina'?'removed':
      item?.transformation&&item.transformation!=='Se mantiene'?'changed':'unchanged',
    issues=model.findings.filter(x=>String(x.stepId)===id),
    warnings=issues.filter(x=>x.severity!=='COMPATIBLE').length,
    sourceName=String(original?.step_name||item?.sourceStepName||''),
    futureName=String(item?tobeFlowItemName(item):sourceName),
    name=futureName||sourceName||'Actividad sin nombre';
  if(node.kind==='start'||node.kind==='end')
    return '<div class="pg12-overlay-cell pg12-boundary" style="grid-row:'+model.positions.get(id).row+
      ';grid-column:'+model.positions.get(id).col+'" data-pg12-node="'+attr(id)+'"><div class="pg12-boundary-card">'+
      (node.kind==='start'?'Inicio del proceso':'Fin del proceso')+'</div></div>';
  if(node.kind==='pending')
    return '<div class="pg12-overlay-cell" style="grid-row:'+model.positions.get(id).row+
      ';grid-column:'+model.positions.get(id).col+'" data-pg12-node="'+attr(id)+'"><div class="pg12-pending">Destino pendiente de conectar</div></div>';
  const markers=[
    signals.frictions.length?'Fricciones '+signals.frictions.length:'',
    signals.risks.length?'Riesgos '+signals.risks.length:'',
    signals.wait!==null?'Espera AS-IS '+signals.wait+' min':'',
    signals.rework!==null?'Retrabajo AS-IS '+signals.rework+' min':'',
    warnings?'Avisos '+warnings:''
  ].filter(Boolean);
  const originalLabel=original?String(labelFrom('OS_ACTOR_ROLE',original.actor)||original.actor||'Sin responsable'):
    'Sin actividad AS-IS propia',
    futureLabel=item&&!item.isAddition&&item.transformation!=='Se elimina'?
      String(labelFrom('OS_ACTOR_ROLE',item.futureActor)||item.futureActor||'Sin responsable'):
      item?.isAddition?String(labelFrom('OS_ACTOR_ROLE',item.futureActor)||item.futureActor||'Sin responsable'):
      'Actividad retirada';
  const status=item?.isAddition?'Nueva en TO-BE':item?.transformation||'Sin decisión';
  return '<div class="pg12-overlay-cell" data-pg12-node="'+attr(id)+'" style="grid-row:'+
    model.positions.get(id).row+';grid-column:'+model.positions.get(id).col+'">'+
    '<button type="button" class="pg12-overlay-node pg12-node-'+state+
      (id===selected?' pg12-node-selected':'')+'" data-pg12-source="'+attr(id)+'" aria-pressed="'+
      (id===selected?'true':'false')+'">'+
      '<span class="pg12-node-kicker">'+(item?.isAddition?'TO-BE · NUEVA':'AS-IS · ACTIVIDAD '+(model.asis.findIndex(s=>String(s.id)===id)+1))+'</span>'+
      '<strong class="pg12-title-to-be">'+esc(name)+'</strong>'+
      (original?'<strong class="pg12-title-as-is">'+esc(sourceName)+'</strong>':'')+
      '<span class="pg12-node-origin">AS-IS · '+esc(originalLabel)+'</span>'+
      '<span class="pg12-node-proposed">TO-BE · '+esc(futureLabel)+'</span>'+
      '<span class="pg12-node-change">'+esc(status)+'</span>'+
      (original&&sourceName!==name?'<small class="pg12-node-previous">Antes: '+esc(sourceName)+'</small>':'')+
      (markers.length?'<span class="pg12-node-signals">'+markers.map(t=>
        '<span>'+esc(t)+'</span>').join('')+'</span>':'')+
      '</button></div>';
}
function pg12OverlayHtml(e,p,source,selected){
  if(typeof processGraphData!=='function')
    return '<p class="notice warn">No está disponible el mapa de proceso. No se han modificado datos.</p>';
  const model=pg12OverlayModel(e,p,source),
    counts={
      unchanged:model.items.filter(i=>i.transformation==='Se mantiene').length,
      changed:model.items.filter(i=>!i.isAddition&&i.transformation!=='Se mantiene'&&i.transformation!=='Se elimina').length,
      added:model.items.filter(i=>i.isAddition).length,
      removed:model.items.filter(i=>i.transformation==='Se elimina').length,
      warnings:model.findings.filter(i=>i.severity!=='COMPATIBLE').length
    };
  const legend='<div class="pg12-overlay-legend" aria-label="Leyenda del mapa">'+
    '<span><i class="pg12-key-original"></i>AS-IS de origen</span>'+
    '<span><i class="pg12-key-change"></i>Cambio TO-BE</span>'+
    '<span><i class="pg12-key-add"></i>Nueva</span>'+
    '<span><i class="pg12-key-remove"></i>Eliminada</span>'+
    '<span><i class="pg12-key-routing"></i>Ruta TO-BE cambiada</span>'+
    '<span>Fricciones, riesgos y tiempos: AS-IS declarado</span></div>';
  const stats='<div class="pg12-diff-stats">'+[
    [counts.unchanged,'Se mantienen'],[counts.changed,'Modificadas / control'],
    [counts.added,'Añadidas'],[counts.removed,'Eliminadas'],[counts.warnings,'Observaciones']
  ].map(x=>'<div><strong>'+x[0]+'</strong><span>'+x[1]+'</span></div>').join('')+'</div>';
  const board='<div class="pg12-overlay-viewport"><div class="pg12-overlay-board" data-pg12-view="'+
    attr(__auneaPg12View)+'" style="--pg12-cols:'+model.cols+';--pg12-rows:'+model.rows+'"'+
    ' data-pg12-asis-edges="'+attr(JSON.stringify(model.originalEdges))+'"'+
    ' data-pg12-tobe-edges="'+attr(JSON.stringify(model.futureEdges))+'">'+
    '<svg class="pg12-overlay-lines" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg>'+
    model.nodes.map((node,i)=>pg12OverlayNode(model,source,node,i,selected)).join('')+
    '</div></div>';
  return stats+legend+board;
}
// [AUNEA-FE-PG12-OVERLAY-MODEL-469] END

// [AUNEA-FE-PG12-OVERLAY-VIEW-470] START
// PURPOSE: Read-only single-map UI and linked activity evidence; shared UI surfaces.
// SOURCE: Simulator CANONICAL PG12; no duplicate UI owner and no generated business values.
// INPUTS: pinned sources and process_time_projection from backend.
// OUTPUTS: selected detail, map controls and metrics; SIDE_EFFECTS: none.
// CHANGE_RISK: HIGH; regression covers map, details and readiness gates.
function pg12EvidenceHtml(source,id){
  const signals=pg12OriginalSignals(source,id);
  const friction=signals.frictions.map(f=>
    '<li>'+esc(labelFrom('OS_FRICTION_TYPE',f.friction_type)||f.description||'Fricción AS-IS')+
      (f.signal?': '+esc(f.signal):'')+'</li>').join('');
  const risk=signals.risks.map(r=>'<li>'+esc(r.description||r.category||'Riesgo AS-IS')+'</li>').join('');
  const times=[signals.active!==null?'Trabajo activo: '+signals.active+' min':'',
    signals.wait!==null?'Espera: '+signals.wait+' min':'',
    signals.rework!==null?'Retrabajo: '+signals.rework+' min':''].filter(Boolean);
  return '<div class="pg12-evidence-grid">'+
    '<div><b>Tiempo declarado AS-IS</b><p>'+esc(times.join(' · ')||'Sin tiempos declarados')+'</p>'+
      '<small>Espera y retrabajo no equivalen a ahorro futuro.</small></div>'+
    '<div><b>Fricciones vinculadas</b>'+(friction?'<ul>'+friction+'</ul>':'<p>Ninguna vinculada a esta actividad.</p>')+'</div>'+
    '<div><b>Riesgos vinculados</b>'+(risk?'<ul>'+risk+'</ul>':'<p>Ninguno vinculado a esta actividad.</p>')+'</div>'+
    '</div>';
}
function tobeComparisonDetail(e,p,sourceId){
  const item=tobeFlowItem(e,p,sourceId),source=tobeProposalSnapshot(e,p),
    original=(source?.processSteps||[]).find(s=>String(s.id)===String(item?.sourceStepId)),
    name=item?tobeFlowItemName(item):'';
  if(!item)return '<p class="tobe-muted">Selecciona una actividad del mapa para ver el cambio y su evidencia.</p>';
  const removed=item.transformation==='Se elimina',added=!!item.isAddition,
    label=added?'Actividad nueva':removed?'Actividad retirada':'Actividad transformada',
    sourceName=original?.step_name||item.sourceStepName||'Sin correspondencia',
    issues=(typeof tobeCoherenceFindings==='function'?tobeCoherenceFindings(e,p):[])
      .filter(x=>String(x.stepId)===String(tobeFlowItemId(item))),
    initial=(label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>',
    owner=labelFrom('OS_ACTOR_ROLE',item.futureActor)||comparable(item.futureActor),
    tool=labelFrom('OS_TOOL_CATEGORY',item.tool)||comparable(item.tool),
    originalOwner=original?(labelFrom('OS_ACTOR_ROLE',original.actor)||String(original.actor||'—')):'No existía',
    originalTool=original?(labelFrom('OS_TOOL_CATEGORY',original.tool)||String(original.tool||'—')):'No existía';
  return '<div class="pg12-difference-detail">'+
    '<span class="tobe-eyebrow">'+esc(label)+' · '+esc(item.transformation||'Pendiente')+'</span>'+
    '<h3>'+esc(name)+'</h3>'+
    '<p><b>Origen AS-IS:</b> '+esc(sourceName)+'</p>'+
    '<p><b>Qué cambia y por qué:</b> '+esc(item.problemResolved||'No documentado')+'</p>'+
    '<dl class="pg12-before-after">'+
      initial('Responsable AS-IS',originalOwner)+initial('Responsable TO-BE',removed?'Actividad eliminada':owner)+
      initial('Herramienta AS-IS',originalTool)+initial('Herramienta TO-BE',removed?'Actividad eliminada':tool)+
      initial('Entradas TO-BE',removed?'No aplica':tobeArtifactDisplay(item.inputs,item._details?.inputs))+
      initial('Salidas TO-BE',removed?'No aplica':tobeArtifactDisplay(item.outputs,item._details?.outputs))+
      '</dl>'+
    '<div class="pg12-detail-text"><p><b>Automatización / IA:</b> '+esc(comparable(item.automationAi))+'</p>'+
    '<p><b>Supervisión humana:</b> '+esc(comparable(item.humanSupervision))+'</p>'+
    '<p><b>Control / riesgo:</b> '+esc(comparable(item.controlsRisk))+'</p></div>'+
    (!added?pg12EvidenceHtml(source,String(item.sourceStepId)):'<p class="tobe-muted">Actividad añadida: conserva la referencia al origen y su justificación en PG11.</p>')+
    (issues.length?'<div class="pg12-detail-alerts"><strong>Comprobaciones de PG11</strong><ul>'+
      issues.map(x=>'<li class="'+(x.severity==='BLOCKING'?'pg12-alert-block':'')+'">'+esc(x.message)+'</li>').join('')+'</ul></div>':'')+
    '<p class="tobe-muted">Las modificaciones no implican ahorros, tiempos futuros ni viabilidad técnica demostrados.</p>'+
    '</div>';
}
function tobeComparisonPage(){
  const e=currentEng(),snap=typeof confirmedSnapshot==='function'?confirmedSnapshot(e):null,p=latestTobe(e);
  if(!snap||!p||!['REVIEWED','APPROVED_FOR_CLIENT','PUBLISHED'].includes(p.status))
    return pageTop('AS-IS vs TO-BE','La comparación reutiliza las fuentes versionadas; no captura datos nuevos.',
      '<button class="btn" data-page="tobe">Volver a TO-BE</button>')+
      auneaEmptyState('TO-BE revisado requerido','La comparación se habilita cuando el TO-BE ha pasado revisión humana.');
  const source=tobeProposalSnapshot(e,p);
  if(!source)return pageTop('AS-IS vs TO-BE','No se encuentra el AS-IS de origen.',
    '<button class="btn" data-page="tobe">Volver a TO-BE</button>')+
    '<p class="notice warn">La versión histórica de AS-IS no está disponible. La comparación no puede reconstruirse.</p>';
  const items=[...(p.items||[]),...tobeAddedSteps(p)],
    selected=items.some(i=>String(tobeFlowItemId(i))===__auneaPg12SelectedSource)?
      __auneaPg12SelectedSource:String(tobeFlowItemId(items[0])||''),
    options=[['actual','Actual'],['proposed','Propuesto'],['comparison','Comparación']],
    selector='<nav class="pg12-view-selector" aria-label="Capas del mapa">'+options.map(([value,label])=>
      '<button type="button" data-pg12-view="'+value+'" class="btn '+
      (__auneaPg12View===value?'btn-primary':'btn-outline')+'" aria-pressed="'+
      String(__auneaPg12View===value)+'">'+label+'</button>').join('')+'</nav>';
  const rows=items.map(item=>{
    const name=tobeFlowItemName(item);
    return '<tr><td><button type="button" class="btn btn-outline btn-small" data-pg12-source="'+
      attr(tobeFlowItemId(item))+'">'+esc(name)+'</button></td>'+
      '<td>'+esc(item.isAddition?'No existía':item.sourceStepName||name)+'</td>'+
      '<td>'+esc(item.transformation||'Pendiente')+'</td>'+
      '<td>'+esc(comparable(item.problemResolved))+'</td></tr>';
  }).join('');
  const diagnostic=currentDiagnosticOutput(e),pt=diagnostic?.process_time_projection||null;
  const metric=(title,value,note)=>'<div class="pg12-metric"><b>'+title+'</b><strong>'+value+'</strong>'+
    '<small>'+note+'</small></div>';
  const metrics='<div class="pg12-metrics">'+
    metric('Trabajo activo AS-IS',pt?.annual_active_hours!=null?num(pt.annual_active_hours)+' h/año':'No disponible','Proyección del backend, sin hipótesis TO-BE')+
    metric('Espera anual AS-IS',pt?.annual_wait_exposure_hours!=null?num(pt.annual_wait_exposure_hours)+' caso-horas/año':'No disponible','Exposición a espera, no trabajo activo')+
    metric('Retrabajo AS-IS',pt?.annual_rework_hours!=null?num(pt.annual_rework_hours)+' h/año':'No disponible','Sin cifra futura comparable aprobada')+
    metric('Capacidad liberada','No disponible con evidencia suficiente','No inferida de la transformación')+
    metric('Ahorro de caja','No disponible con evidencia suficiente','No equiparar con capacidad')+
    metric('Riesgo residual futuro','No disponible con evidencia suficiente','Sin verificación del nuevo control')+'</div>';
  return pageTop('AS-IS vs TO-BE','Versión AS-IS '+esc(source.version)+
      ' · TO-BE v'+esc(p.version)+'. Comparación de fuentes revisadas; sin cálculos económicos en el navegador.',
      '<button class="btn" data-page="tobe">Volver a TO-BE</button>')+
    '<main class="pg12-workspace">'+
      '<section class="aunea-ui-work-surface pg12-primary" aria-label="Mapa comparativo único">'+
        '<header class="pg12-work-head"><div><span class="tobe-eyebrow">01 · COMPARACIÓN DE PROCESO</span>'+
        '<h2 class="aunea-ui-section-title">Mapa AS-IS con cambios TO-BE</h2>'+
        '<p class="aunea-ui-section-caption">Circuito original en verde tenue. Intervenciones, nuevas actividades, rutas modificadas y hallazgos sobre el mismo mapa.</p></div>'+
        selector+'</header>'+pg12OverlayHtml(e,p,source,selected)+
        '<section class="pg12-selected-detail" id="pg12SelectedDetail" aria-live="polite">'+
          tobeComparisonDetail(e,p,selected)+'</section>'+
      '</section>'+
      '<section class="aunea-ui-work-surface pg12-secondary">'+
        '<details class="pg12-changes-disclosure"><summary>02 · Listado de cambios ('+items.length+' actividades)</summary>'+
        '<p class="aunea-ui-section-caption">Vista textual secundaria; las decisiones originales y futuras se consultan seleccionando una actividad.</p>'+
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Actividad</th><th>Origen</th><th>Transformación</th><th>Problema que resuelve</th></tr></thead>'+
        '<tbody>'+rows+'</tbody></table></div></details>'+
      '</section>'+
      '<section class="aunea-ui-work-surface pg12-secondary"><header><span class="tobe-eyebrow">03 · MÉTRICAS COMPARABLES</span>'+
        '<h2 class="aunea-ui-section-title">Impactos documentados</h2>'+
        '<p class="aunea-ui-section-caption">Valores procedentes del backend. Sin atribuir beneficios futuros no validados.</p></header>'+
        metrics+'</section></main>';
}
// [AUNEA-FE-PG12-OVERLAY-VIEW-470] END

// [AUNEA-FE-PG12-OVERLAY-EVENTS-471] START
// PURPOSE: Render both route layers in the same SVG, react to mode and selection.
// SOURCE: reviewed PG11 flow and original AS-IS. No mutations or duplicate graph.
// INPUTS: rendered graph cells; OUTPUTS: SVG connectors and selected detail.
// SIDE_EFFECTS: DOM-only. CHANGE_RISK: HIGH; browser visual QA required.
function pg12DrawOverlay(){
  if(typeof document==='undefined')return;
  const board=document.querySelector('.pg12-overlay-board');if(!board)return;
  const svg=board.querySelector('.pg12-overlay-lines');if(!svg)return;
  const rect=board.getBoundingClientRect(),map=new Map();
  board.querySelectorAll('[data-pg12-node]').forEach(el=>map.set(String(el.dataset.pg12Node),el));
  const read=name=>{try{return JSON.parse(board.getAttribute(name)||'[]')}catch(_){return []}};
  const original=read('data-pg12-asis-edges'),proposed=read('data-pg12-tobe-edges'),
    okeys=new Set(original.map(pg12EdgeKey)),pkeys=new Set(proposed.map(pg12EdgeKey)),
    view=board.dataset.pg12View||'comparison',
    ns='http://www.w3.org/2000/svg';
  svg.setAttribute('viewBox','0 0 '+board.scrollWidth+' '+board.scrollHeight);
  svg.innerHTML='<defs>'+
    '<marker id="pg12ArrBase" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#7d9d8e"/></marker>'+
    '<marker id="pg12ArrNew" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#bd813e"/></marker></defs>';
  const nodeRect=id=>{
    const el=map.get(String(id));if(!el)return null;
    return (el.querySelector('.pg12-overlay-node,.pg12-boundary-card,.pg12-pending')||el).getBoundingClientRect();
  };
  const draw=(edge,kind)=>{
    const a=nodeRect(edge.from),b=nodeRect(edge.to);if(!a||!b)return;
    const x1=a.right-rect.left,y1=a.top+a.height/2-rect.top,
      x2=b.left-rect.left,y2=b.top+b.height/2-rect.top;
    const backwards=x2<x1+12;
    const mid=backwards?x1+24:x1+Math.max(24,(x2-x1)/2);
    const d=backwards?
      'M'+x1+' '+y1+'H'+mid+'V'+(Math.max(a.bottom,b.bottom)-rect.top+36)+
      'H'+(x2-24)+'V'+y2+'H'+x2:
      'M'+x1+' '+y1+'H'+mid+'V'+y2+'H'+(x2-6);
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d',d);
    path.setAttribute('class','pg12-route pg12-route-'+kind+
      (edge.label==='NO'?' pg12-route-no':''));
    path.setAttribute('marker-end',kind==='future'?'url(#pg12ArrNew)':'url(#pg12ArrBase)');
    svg.appendChild(path);
    if(edge.label){
      const label=document.createElementNS(ns,'text');
      label.setAttribute('x',String(mid+3));label.setAttribute('y',String((y1+y2)/2-8));
      label.setAttribute('class','pg12-route-label');
      label.textContent=edge.label;svg.appendChild(label);
    }
  };
  if(view!=='proposed')
    original.forEach(e=>draw(e,pkeys.has(pg12EdgeKey(e))?'shared':'original'));
  if(view!=='actual')
    proposed.forEach(e=>{
      const same=okeys.has(pg12EdgeKey(e));
      if(view==='comparison'&&same)return;
      draw(e,same?'shared':'future');
    });
}
function registerPg12Interactions(){
  document.addEventListener('click',event=>{
    if(state.activePage!=='comparacion')return;
    const view=event.target?.closest?.('[data-pg12-view]'),
      node=event.target?.closest?.('[data-pg12-source]');
    if(!view&&!node)return;
    event.preventDefault();
    if(view){
      const next=view.getAttribute('data-pg12-view');
      if(!['actual','proposed','comparison'].includes(next))return;
      __auneaPg12View=next;render();return;
    }
    const id=String(node.getAttribute('data-pg12-source')||''),
      e=currentEng(),p=latestTobe(e);
    if(!tobeFlowItem(e,p,id))return;
    __auneaPg12SelectedSource=id;
    const detail=document.getElementById('pg12SelectedDetail');
    if(detail)detail.innerHTML=tobeComparisonDetail(e,p,id);
    document.querySelectorAll('.pg12-overlay-node[data-pg12-source]').forEach(el=>{
      const selected=el.getAttribute('data-pg12-source')===id;
      el.classList.toggle('pg12-node-selected',selected);
      el.setAttribute('aria-pressed',String(selected));
    });
  },true);
  if(typeof window!=='undefined')
    window.addEventListener('resize',()=>{
      if(state.activePage==='comparacion'&&typeof requestAnimationFrame==='function')
        requestAnimationFrame(pg12DrawOverlay);
    });
}
function pg12AfterBind(){
  if(state.activePage==='comparacion'&&typeof requestAnimationFrame==='function')
    requestAnimationFrame(pg12DrawOverlay);
}
// [AUNEA-FE-PG12-OVERLAY-EVENTS-471] END
