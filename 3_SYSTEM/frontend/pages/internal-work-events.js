// [AUNEA-FE-INTERNAL-WORK-EVENTS-381] START — Internal work UI event ownership
// PURPOSE: Register workbench interactions without mixing them with read-only result views.
// SOURCE: Simulator CANONICAL; PROJECT_RULES.md; DEC-050/052/055.
// INPUTS: existing pages, dom, state and governed TO-BE transactions.
// OUTPUTS: the same registered handlers. No data, rules, or markup changes.
// CHANGE_RISK: HIGH; requires integration regression and browser UAT.
function registerInternalWorkPages(){
  if(typeof pages==='undefined'||registerInternalWorkPages.done)return;
  registerInternalWorkPages.done=true;
  pages.revision=outputReviewPage;
  pages.tobe=tobePage;
  pages.comparacion=tobeComparisonPage;
  registerPg12Interactions();
  // [AUNEA-FE-PG11-REMAINING-CTA-295] START — local button must work in guided inspector.
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-tobe-generate-all-remaining]');
    if(!button||state.activePage!=='tobe')return;
    event.preventDefault();
    event.stopImmediatePropagation(); // exactly one PG11 generator dispatch
    if(button.disabled)return;
    const e=currentEng(),p=e?latestTobe(e):null;
    if(!e||!p||!tobeEditable(p))return toast('No hay un borrador TO-BE vigente.');
    if(typeof generateTobeAiPilot!=='function')return toast('El motor IA no está disponible. Recarga PG11.');
    button.textContent='Iniciando análisis pendiente…';
    button.disabled=true;
    const progress=document.getElementById('tobeStepAiProgress');
    if(progress)progress.textContent='Iniciando análisis de las actividades pendientes; se conservarán las ya verificadas…';
    void generateTobeAiPilot(e).catch(error=>{
      console.error('PG11: fallo al iniciar actividades pendientes',error);
      if(progress)progress.textContent='No se pudo iniciar el análisis: '+String(error?.message||error);
      toast('No se pudo iniciar el análisis pendiente. Revisa el estado de Ollama y del backend.');
    }).finally(()=>{
      if(button.isConnected){button.disabled=false;button.textContent='Analizar actividades pendientes';}
    });
  },true);
  // [AUNEA-FE-PG11-REMAINING-CTA-295] END
  // [AUNEA-FE-PG11-DRAFT-CLICK-181] START — Single durable action for creating a read-only-AS-IS-derived DRAFT.
  // SOURCE: Simulator CANONICAL PG11; DEC-034/050/052/055. No second data owner, no automatic proposal approval.
  // A delegated click survives UI refreshes and never relies on successful binding of unrelated page controls.
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#createTobeDraft');
    if(!button)return;
    event.preventDefault();
    if(button.dataset.working==='1')return;
    button.dataset.working='1';
    button.disabled=true;
    try{
      const engagement=currentEng();
      if(!engagement||!confirmedSnapshot(engagement)){
        toast('No se puede crear el borrador: el AS-IS no está confirmado.');
        return;
      }
      if(engagement.tobeProposals!=null&&!Array.isArray(engagement.tobeProposals)){
        toast('No se puede crear el borrador: el historial TO-BE tiene un formato no reconocido. No se ha modificado el estudio.');
        return;
      }
      // If an earlier click persisted a proposal but failed to repaint the page, do not create a duplicate.
      if(latestTobe(engagement)){
        render();
        toast('Se ha recuperado el borrador TO-BE existente.');
        return;
      }
      const draft=createTobeDraft(engagement);
      if(!draft){
        toast('No se ha creado el borrador. Comprueba la confirmación del AS-IS.');
        return;
      }
      if(!saveState('Crear borrador TO-BE v'+draft.version)){
        toast('El borrador sólo está en memoria. No cambies de página hasta guardarlo.');
        return;
      }
      render();
      toast('Borrador TO-BE v'+draft.version+' creado desde AS-IS confirmado.');
    }catch(error){
      console.error('PG11: error al crear o mostrar el borrador TO-BE',error);
      try{toast('No se ha podido completar la creación del borrador TO-BE. Revisa el error y no vuelvas a confirmar el AS-IS.')}catch(_ignore){}
    }finally{
      button.dataset.working='0';
      button.disabled=false;
    }
  },true);
  // [AUNEA-FE-PG11-DRAFT-CLICK-181] END
  // [AUNEA-FE-PG11-CANVAS-MODE-250] START — separate move from route editing.
  let __auneaTobeLink=null,__auneaTobeMovedClick=false;
  // [AUNEA-FE-PG11-CANVAS-MODE-250] END
  // [AUNEA-FE-PG11-ARTIFACT-OTHER-252] START — match AS-IS Other behavior.
  document.addEventListener('change',event=>{
    const toggle=event.target?.closest?.('.tobe-artifact-field [data-v1-other-toggle]');
    if(!toggle||state.activePage!=='tobe')return;
    const wrap=toggle.closest('.tobe-artifact-field')?.querySelector(
      '[data-v1-other-wrap="'+toggle.dataset.v1OtherToggle+'"]');
    if(!wrap)return;
    wrap.style.display=toggle.checked?'':'none';
    if(!toggle.checked){const detail=wrap.querySelector('input');if(detail)detail.value='';}
  },true);
  document.addEventListener('input',event=>{
    const detail=event.target?.closest?.('.tobe-artifact-field [id$="_detail"]');
    if(!detail||state.activePage!=='tobe')return;
    const toggle=detail.closest('.tobe-artifact-field')?.querySelector('[data-v1-other-toggle]');
    if(toggle){
      toggle.checked=!!detail.value.trim()||toggle.checked;
      toggle.disabled=!!detail.value.trim();
    }
  },true);
  // [AUNEA-FE-PG11-ARTIFACT-OTHER-252] END
  // [AUNEA-FE-PG11-GUIDED-ACTIONS-264] START — UI-only review/map mode
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('[data-tobe-mode-switch]');
    if(!btn||state.activePage!=='tobe')return;
    event.preventDefault();
    const mode=btn.dataset.tobeModeSwitch;
    if(!['guided','map'].includes(mode))return;
    __auneaTobeMode=mode;
    const root=document.querySelector('.tobe-workspace');
    if(root)root.dataset.tobeMode=mode;
    document.querySelectorAll('[data-tobe-mode-switch]').forEach(el=>{
      const active=el.dataset.tobeModeSwitch===mode;
      el.classList.toggle('btn-primary',active);
      el.classList.toggle('btn-outline',!active);
      el.setAttribute('aria-pressed',String(active));
    });
    if(mode==='map'&&typeof drawProcessGraph==='function'&&typeof requestAnimationFrame==='function')
      requestAnimationFrame(drawProcessGraph);
  },true);

  document.addEventListener('click',event=>{
    const save=event.target?.closest?.('[data-tobe-guided-save]');
    const check=event.target?.closest?.('[data-tobe-guided-check]');
    if((!save&&!check)||state.activePage!=='tobe')return;
    event.preventDefault();
    const target=document.getElementById(save?'saveTobe':'checkTobeReadiness');
    if(target)target.click();
    else toast('No está disponible la acción de esta versión TO-BE.');
  },true);
  // [AUNEA-FE-PG11-GUIDED-ACTIONS-264] END
  // [AUNEA-FE-PG11-OPTIMIZATION-RECHECK-315] START — user-requested
  // recheck only. Save a version-owned draft, never approve or reconnect.
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-tobe-recheck-optimization]');
    if(!button||state.activePage!=='tobe')return;
    event.preventDefault();
    const e=currentEng(),p=latestTobe(e);
    if(!e||!tobeEditable(p))return toast('Esta versión TO-BE no es editable.');
    if(!saveTobeFromDom(e)||!saveState('Guardar diseño TO-BE y verificar dependencias'))
      return toast('No se guardó el cambio; la comprobación sigue usando el borrador anterior.');
    const live=currentEng(),draft=latestTobe(live),
      item=tobeSelectedItem(live,draft),
      results=tobeOptimizationFindings(live,draft,item);
    const panel=document.getElementById('tobeStepOptimization');
    if(panel)panel.outerHTML=tobeOptimizationPanelHtml(live,draft,item);
    toast(results.length?
      'Dependencias actualizadas: '+results.length+' puntos por comprobar.':
      'Dependencias actualizadas. No se han detectado incompatibilidades evidentes.');
  },true);
  // [AUNEA-FE-PG11-OPTIMIZATION-RECHECK-315] END

  // [AUNEA-FE-PG11-GUIDED-INSPECTOR-253] START
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-tobe-jump]');
    if(!button||state.activePage!=='tobe')return;
    event.preventDefault();
    const section=document.getElementById(button.dataset.tobeJump);
    const details=section?.querySelector('details.tobe-subdetails');
    if(details)details.open=true;
    section?.scrollIntoView({behavior:'smooth',block:'start'});
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||!__auneaTobeLink||state.activePage!=='tobe')return;
    __auneaTobeLink=null;
    document.querySelector('.tobe-free-board')?.classList.remove('tobe-connect-active');
    const status=document.getElementById('tobeFlowModeStatus');
    if(status)status.textContent='Conexión cancelada; el proceso no se ha modificado.';
    toast('Conexión cancelada.');
  },true);
  // [AUNEA-FE-PG11-GUIDED-INSPECTOR-253] END
  // [AUNEA-FE-PG11-TRANSFORMATION-LIVE-259] START
  // The canonical select emits change on its hidden owner input. Update only
  // the visible label/help; values remain untouched until explicit save.
  document.addEventListener('change',event=>{
    const target=event.target;
    if(state.activePage!=='tobe'||target?.dataset?.tobeField!=='transformation')return;
    const root=target.closest('.tobe-inspector')||document.getElementById('tobeInspector');
    if(!root)return;
    const value=String(target.value||''),row=root.querySelector('[data-tobe-rationale-wrapper]'),
      label=row?.querySelector('[data-tobe-rationale-label]'),
      textarea=row?.querySelector('[data-tobe-field="problemResolved"]');
    if(label)label.textContent=tobeTransformationRationaleLabel(value);
    if(textarea){
      textarea.placeholder=tobeFieldHelp('problemResolved',{transformation:value});
      // Never rewrite text already typed under the previous transformation.
    }
    const status=root.querySelector('.tobe-selected-status');
    if(status)status.textContent=value||'Sin definir';
    const hint=root.querySelector('[data-tobe-transformation-message]');
    if(hint)hint.textContent=value==='Se mantiene'?
      'Has seleccionado «Se mantiene». Explica por qué no cambias esta actividad y cómo se atienden sus hallazgos. La recomendación IA no se aplica automáticamente.':
      value==='Se elimina'?
      'Has seleccionado «Se elimina». Justifica la retirada y revisa las conexiones afectadas en el mapa TO-BE.':
      value?
      'Has seleccionado «'+value+'». Completa el motivo del cambio y los datos operativos futuros. La recomendación IA sigue pendiente de tu decisión explícita.':
      'Selecciona «Qué cambia» y justifica la decisión antes de revisar.';
    const advice=root.querySelector('[data-tobe-ai-transform]');
    const aiTransform=advice?.dataset?.tobeAiTransform||'';
    const difference=advice?.querySelector('[data-tobe-ai-difference]');
    if(difference){
      const mismatch=!!value&&!!aiTransform&&value!==aiTransform;
      difference.hidden=!mismatch;
      if(mismatch)difference.textContent='La IA propone «'+aiTransform+
        '» y tu diseño indica «'+value+
        '». Decide si aceptar, modificar o descartar; cambiar el selector no aplica la propuesta.';
    }
  },true);
  // [AUNEA-FE-PG11-TRANSFORMATION-LIVE-259] END
  // [AUNEA-FE-PG11-SELECT-206] START — retain unsaved consultant data before switching inspector.
  document.addEventListener('click',event=>{
    const selected=event.target?.closest?.('[data-tobe-select]');
    if(!selected||state.activePage!=='tobe')return;
    const e=currentEng(),p=latestTobe(e),sourceId=selected.getAttribute('data-tobe-select');
    if(!e||!p||!tobeFlowItem(e,p,sourceId))return;
    if(__auneaTobeMovedClick){
      event.preventDefault();event.stopImmediatePropagation();
      __auneaTobeMovedClick=false;return;
    }
    if(__auneaTobeLink){
      event.preventDefault();
      const {from,kind}=__auneaTobeLink;
      __auneaTobeLink=null;
      document.querySelector('.tobe-free-board')?.classList.remove('tobe-connect-active');
      if(!tobeEditable(p)||!tobeFlowItem(e,p,from)||from===String(sourceId))
        return toast('Selecciona otra actividad futura válida para conectar.');
      if(!saveTobeFromDom(e)||!saveState('Guardar campos antes de conectar el proceso'))
        return toast('No se guardaron los campos actuales; la ruta no ha cambiado.');
      const live=currentEng(),draft=latestTobe(live),flow=tobeMutableFlow(live,draft),
        previous=JSON.parse(JSON.stringify(flow));
      if(!flow.routes[from])flow.routes[from]={normal:'__PENDING__',exception:''};
      flow.routes[from][kind]=String(sourceId);
      markDirty('Ruta '+kind+' del TO-BE '+from+' hacia '+sourceId);
      if(!saveState('Guardar conexión editada TO-BE')){
        draft.flow=previous;return toast('No se guardó la conexión; se restauró el flujo.');
      }
      render();toast('Conexión guardada. Comprueba las rutas y la coherencia antes de revisar.');
      return;
    }
    event.preventDefault();
    if(tobeEditable(p)&&(!saveTobeFromDom(e)||!saveState('Guardar edición TO-BE antes de cambiar actividad'))){
      toast('No se ha guardado la edición. Mantén la actividad actual abierta.');
      return;
    }
    const fromGlobal=selected.hasAttribute('data-tobe-global-link');
    __auneaTobeSelection={engagementId:e.id,version:p.version,stepId:String(sourceId)};
    const inspector=document.getElementById('tobeInspector');
    const savedEngagement=currentEng(),savedProposal=latestTobe(savedEngagement);
    if(inspector&&savedEngagement&&savedProposal)inspector.innerHTML=tobeInspectorHtml(savedEngagement,savedProposal);
    const navigation=document.querySelector('.tobe-guided-nav');
    if(navigation&&savedEngagement&&savedProposal)
      navigation.outerHTML=tobeGuidedNavHtml(savedEngagement,savedProposal);
    const viewport=document.querySelector('.tobe-canvas-viewport'),
      left=viewport?.scrollLeft||0,top=viewport?.scrollTop||0;
    if(viewport&&savedEngagement&&savedProposal){
      viewport.outerHTML=tobeCanvasHtml(savedEngagement,savedProposal);
      const next=document.querySelector('.tobe-canvas-viewport');
      if(next){next.scrollLeft=left;next.scrollTop=top;}
      if(typeof drawProcessGraph==='function'&&typeof requestAnimationFrame==='function')
        requestAnimationFrame(drawProcessGraph);
    }
    document.querySelectorAll('[data-tobe-select]').forEach(node=>{
      const active=node.getAttribute('data-tobe-select')===String(sourceId);
      node.classList.toggle('is-selected',active);node.setAttribute('aria-pressed',String(active));
    });
    // A global card is above the activity inspector. Navigate to the actual
    // review only when this selection originated from a global recommendation.
    if(fromGlobal)document.getElementById('tobeInspector')?.
      scrollIntoView?.({behavior:'smooth',block:'start'});
  },true);
  // [AUNEA-FE-PG11-SELECT-206] END
  // [AUNEA-FE-PG11-FLOW-ACTIONS-229] START — explicit future-only additions and supersession.
  // SOURCE: Simulator CANONICAL PG11, DEC-050/055. Every new activity links to an AS-IS step.
  document.addEventListener('click',event=>{
    const add=event.target?.closest?.('#addTobeStep');
    const discard=event.target?.closest?.('[data-tobe-discard-added]');
    const removeOriginal=event.target?.closest?.('[data-tobe-remove-original]');
    if((!add&&!discard&&!removeOriginal)||state.activePage!=='tobe')return;
    event.preventDefault();
    const e=currentEng(),p=latestTobe(e);
    if(!e||!tobeEditable(p))return;
    if(!saveTobeFromDom(e)||!saveState('Conservar borrador antes de editar flujo TO-BE'))
      return toast('No se guardó el borrador. No se ha modificado el flujo.');
    const live=currentEng(),draft=latestTobe(live),flow=tobeMutableFlow(live,draft);
    if(add){
      const selected=tobeSelectedItem(live,draft),
        source=tobeSourceSteps(live).find(x=>String(x.id)===String(selected?.sourceStepId));
      if(!source)return toast('Selecciona primero una actividad AS-IS como origen de la nueva actividad.');
      const seq=flow.addedSteps.length+1,id='TOBE-ADD-'+draft.version+'-'+seq;
      if(flow.addedSteps.some(x=>x.id===id))return toast('Identificador duplicado; revisa la versión.');
      flow.addedSteps.push({
        id,isAddition:true,sourceStepId:String(source.id),
        sourceStepName:String(source.step_name||source.name||source.id),
        stepName:'',stepType:'ST02',status:'DRAFT',transformation:'',problemResolved:'',
        futureActor:'',tool:'',inputs:'',outputs:'',automationAi:'',
        humanSupervision:'',controlsRisk:'',futureTime:'',futureTimeAssumption:''
      });
      flow.routes[id]={normal:'__PENDING__',exception:''};
      markDirty('Actividad TO-BE incorporada como borrador con origen AS-IS '+source.id);
      if(!saveState('Guardar actividad TO-BE incorporada'))
        return toast('La actividad no se ha guardado. Conserva el estudio abierto.');
      __auneaTobeSelection={engagementId:live.id,version:draft.version,stepId:id};
      render();
      toast('Actividad vinculada al AS-IS. Define nombre, intervención, responsable y rutas.');
      return;
    }
    if(removeOriginal){
      const id=String(removeOriginal.getAttribute('data-tobe-remove-original')||''),
        original=draft.items.find(x=>String(x.sourceStepId)===id);
      if(!original||original.transformation==='Se elimina')
        return toast('La actividad ya está retirada del TO-BE.');
      const previousFlow=JSON.parse(JSON.stringify(flow)),previousTransformation=original.transformation;
      original.transformation='Se elimina';
      // Never invent replacement routes when a confirmed source activity is removed.
      for(const route of Object.values(flow.routes)){
        if(route?.normal===id)route.normal='__PENDING__';
        if(route?.exception===id)route.exception='__PENDING__';
      }
      if(flow.startStepId===id)flow.startStepId=String(draft.items.find(x=>
        x.transformation!=='Se elimina')?.sourceStepId||'');
      markDirty('Retirada de actividad original únicamente del TO-BE '+id);
      if(!saveState('Retirar actividad heredada del proceso futuro')){
        draft.flow=previousFlow;original.transformation=previousTransformation;
        return toast('No se pudo guardar la retirada; se ha recuperado la actividad.');
      }
      __auneaTobeSelection={engagementId:live.id,version:draft.version,stepId:id};
      render();
      toast('Actividad retirada del TO-BE. Permanece en el AS-IS; revisa las conexiones pendientes.');
      return;
    }
    const id=discard?.getAttribute('data-tobe-discard-added'),
      item=flow.addedSteps.find(x=>x.id===id&&x.status!=='SUPERSEDED');
    if(!item)return toast('La actividad ya no se encuentra en el TO-BE.');
    const previousFlow=JSON.parse(JSON.stringify(flow));
    item.status='SUPERSEDED';item.updatedAt=now();
    delete flow.routes[id];
    delete flow.positions?.[id];
    for(const route of Object.values(flow.routes)){
      if(route?.normal===id)route.normal='__PENDING__';
      if(route?.exception===id)route.exception='__PENDING__';
    }
    if(flow.startStepId===id)flow.startStepId=String(draft.items.find(x=>x.transformation!=='Se elimina')?.sourceStepId||'');
    markDirty('Actividad TO-BE incorporada descartada sin borrar el historial');
    if(!saveState('Descartar actividad TO-BE')){
      draft.flow=previousFlow;
      return toast('No se guardó el descarte; se restauró el flujo anterior.');
    }
    const latest=currentEng(),next=latestTobe(latest);
    __auneaTobeSelection={engagementId:latest.id,version:next.version,
      stepId:String(next.items[0]?.sourceStepId||'')};
    render();
    toast('Actividad retirada del flujo futuro. Comprueba sus conexiones entrantes.');
  },true);
  // [AUNEA-FE-PG11-FLOW-ACTIONS-229] END
  // [AUNEA-FE-PG11-FLOW-DRAG-247] START — move free-layout nodes by pointer.
  // Movement changes only flow.positions. Connection changes only flow.routes.
  let tobePointer=null, redrawQueued=false;
  const tobeRedraw=board=>{
    if(redrawQueued||typeof requestAnimationFrame!=='function')return;
    redrawQueued=true;
    requestAnimationFrame(()=>{redrawQueued=false;if(board.isConnected&&typeof drawProcessGraph==='function')drawProcessGraph(board);});
  };
  document.addEventListener('pointerdown',event=>{
    const target=event.target?.closest?.('.tobe-free-board .tobe-graph-node,.tobe-free-board [data-tobe-move]');
    if(!target||state.activePage!=='tobe'||event.button!==0)return;
    if(!tobeEditable(latestTobe(currentEng()))||__auneaTobeLink)return;
    const cell=target.closest('.process-graph-cell'),board=target.closest('.tobe-free-board');
    if(!cell||!board)return;
    const id=String(cell.dataset.graphNode||'');
    if(!tobeFlowItem(currentEng(),latestTobe(currentEng()),id))return;
    tobePointer={id,cell,board,pointerId:event.pointerId,startX:event.clientX,
      startY:event.clientY,x:parseFloat(cell.style.left)||0,y:parseFloat(cell.style.top)||0,moved:false};
  },true);
  document.addEventListener('pointermove',event=>{
    const d=tobePointer;
    if(!d||event.pointerId!==d.pointerId||state.activePage!=='tobe')return;
    const dx=event.clientX-d.startX,dy=event.clientY-d.startY;
    if(!d.moved&&Math.hypot(dx,dy)<5)return;
    d.moved=true;event.preventDefault();
    const x=Math.max(0,Math.min(10000,Math.round(d.x+dx))),
      y=Math.max(0,Math.min(10000,Math.round(d.y+dy)));
    d.cell.style.left=x+'px';d.cell.style.top=y+'px';
    d.cell.classList.add('tobe-move-active');
    d.board.style.width=Math.max(d.board.offsetWidth,x+252)+'px';
    d.board.style.height=Math.max(d.board.offsetHeight,y+320)+'px';
    tobeRedraw(d.board);
  },true);
  document.addEventListener('pointerup',event=>{
    const d=tobePointer;
    if(!d||event.pointerId!==d.pointerId)return;
    tobePointer=null;d.cell.classList.remove('tobe-move-active');
    if(!d.moved)return;
    __auneaTobeMovedClick=true;
    if(typeof setTimeout==='function')setTimeout(()=>{__auneaTobeMovedClick=false;},0);
    const e=currentEng(),p=latestTobe(e);
    if(!e||!tobeEditable(p))return;
    const point={x:parseInt(d.cell.style.left,10),y:parseInt(d.cell.style.top,10)};
    if(!saveTobeFromDom(e)||!saveState('Guardar campos antes de mover actividad')){
      render();return toast('No se guardaron los campos; el movimiento no se ha confirmado.');
    }
    const live=currentEng(),draft=latestTobe(live),flow=tobeMutableFlow(live,draft),
      previous=JSON.parse(JSON.stringify(flow));
    flow.positions[d.id]=point;
    markDirty('Posición de actividad TO-BE '+d.id);
    if(!saveState('Guardar posición visual TO-BE')){
      draft.flow=previous;render();
      return toast('No se guardó la nueva posición; se restauró la anterior.');
    }
    const viewport=document.querySelector('.tobe-canvas-viewport');
    const left=viewport?.scrollLeft||0,top=viewport?.scrollTop||0;
    render();
    const restored=document.querySelector('.tobe-canvas-viewport');
    if(restored){restored.scrollLeft=left;restored.scrollTop=top;}
    if(typeof drawProcessGraph==='function'&&typeof requestAnimationFrame==='function')
      requestAnimationFrame(drawProcessGraph);
    toast('Posición guardada en el borrador TO-BE.');
  },true);
  document.addEventListener('pointercancel',()=>{if(tobePointer){tobePointer=null;render();}},true);
  document.addEventListener('click',event=>{
    const connect=event.target?.closest?.('[data-tobe-connect]');
    if(!connect||state.activePage!=='tobe')return;
    event.preventDefault();
    const e=currentEng(),p=latestTobe(e);
    const from=String(connect.dataset.tobeConnect||''),kind=String(connect.dataset.tobeKind||'normal');
    if(!e||!tobeEditable(p)||!tobeFlowItem(e,p,from)||!['normal','exception'].includes(kind))return;
    const item=tobeFlowItem(e,p,from);
    const isDecision=item.isAddition?item.stepType==='ST04':
      processDecisionStep(tobeProposalSourceSteps(e,p).find(x=>String(x.id)===from));
    if(kind==='exception'&&!isDecision)return;
    __auneaTobeLink={from,kind};
    document.querySelector('.tobe-free-board')?.classList.add('tobe-connect-active');
    const status=document.getElementById('tobeFlowModeStatus');
    if(status)status.textContent='Conectando '+tobeFlowItemName(item)+
      ' · Ruta '+(kind==='exception'?'NO':'principal / SÍ')+
      ': selecciona la tarjeta de destino o pulsa Esc para cancelar.';
    toast('Selecciona ahora la tarjeta de destino para la ruta '+(kind==='exception'?'NO':'principal / SÍ')+'.');
  },true);
  // [AUNEA-FE-PG11-FLOW-DRAG-247] END

  // [AUNEA-FE-PG11-DECISION-TYPE-245] START — reuse canonical ProcessStep
  // decision type for a new future step, without altering AS-IS.
  document.addEventListener('change',event=>{
    const input=event.target?.closest?.('[data-tobe-field="stepType"]');
    if(!input||state.activePage!=='tobe')return;
    const live=currentEng(),draft=latestTobe(live);
    if(!tobeEditable(draft)||!tobeAddedSteps(draft).some(x=>x.id===input.dataset.tobeItem))return;
    if(!saveTobeFromDom(live)||!saveState('Guardar tipo de actividad TO-BE'))
      return toast('No se pudo guardar el tipo de actividad. No se modificó el AS-IS.');
    render();
    toast('Tipo de actividad futura actualizado. Configura sus rutas y revisa la coherencia.');
  },true);
  // [AUNEA-FE-PG11-DECISION-TYPE-245] END


  // [AUNEA-FE-PG11-HUMAN-DECISION-SAVE-224] START — explicit consultant
  // decision with durable version/source/diagnostic binding; no proposal is applied.
  document.addEventListener('click',event=>{
    const control=event.target?.closest?.('[data-tobe-human-decision]');
    if(!control||state.activePage!=='tobe')return;
    event.preventDefault();
    const choice=control.getAttribute('data-tobe-human-decision'),
      sourceId=control.getAttribute('data-tobe-human-source');
    const e=currentEng(),p=latestTobe(e),item=p?.items?.find(x=>String(x.sourceStepId)===sourceId);
    if(!e||!tobeEditable(p)||!item||!TOBE_HUMAN_DECISIONS.includes(choice))
      return toast('La actividad ya no corresponde al borrador vigente.');
    if(choice==='ACCEPT'){
      const issue=tobeAiAcceptanceIssue(e,p,sourceId);
      if(issue)return toast('No se puede aceptar la propuesta: '+issue);
    }
    const reason=String(document.getElementById('tobeHumanReviewNote')?.value||'').trim();
    if(reason.length<20)
      return toast('Explica tu decisión con al menos 20 caracteres; identifica fuentes y condiciones sin inventar datos.');
    if(!saveTobeFromDom(e))return toast('No se pudo conservar el diseño editado. La decisión no se ha registrado.');
    const source=p.aiDraft?.proposal||p.aiDraft?.checkpoint;
    const inputHash=source?.input_hash||source?.inputHash;
    const diagnostic=currentDiagnosticOutput(e),snapshot=confirmedSnapshot(e);
    if(!inputHash||!diagnostic||!snapshot||p.sourceSnapshotVersion!==snapshot.version||
       !(p.aiDraft?.proposal&&typeof internalAiSavedDraft==='function'&&internalAiSavedDraft(e))&&
       !(typeof internalAiCheckpointValid==='function'&&internalAiCheckpointValid(e,p.aiDraft?.checkpoint)))
      return toast('La propuesta ha cambiado de versión o diagnóstico. No se registró la decisión.');
    const previous=p.aiDraft.humanReview?JSON.parse(JSON.stringify(p.aiDraft.humanReview)):null;
    const record=tobeHumanReviewRecord(e,p)||{tobeVersion:p.version,
      sourceSnapshotVersion:snapshot.version,diagnosticInputHash:diagnostic.input_snapshot_hash,
      proposalInputHash:inputHash,proposalFingerprint:tobeCandidateFingerprint(p),decisions:{}};
    record.decisions={...(record.decisions||{}),
      [sourceId]:{status:choice,note:reason,decidedAt:now(),
        proposalStepFingerprint:tobeCandidateFingerprint(p,sourceId)}};
    p.aiDraft.humanReview=record;
    markDirty('PG11: decisión del consultor sobre actividad '+sourceId);
    if(!saveState('Registrar decisión humana PG11 '+sourceId)){
      if(previous)p.aiDraft.humanReview=previous;
      else delete p.aiDraft.humanReview;
      return toast('No se pudo guardar la decisión. Conserva la página abierta; no se ha aprobado el diseño.');
    }
    const live=currentEng(),stored=tobeHumanReviewRecord(live,latestTobe(live))?.decisions?.[sourceId];
    if(!stored||stored.status!==choice||stored.note!==reason)
      return toast('No se pudo verificar la persistencia de la decisión. No se ha aprobado ningún cambio.');
    render();
    if(typeof requestAnimationFrame==='function'&&__auneaTobeMode==='guided')
      requestAnimationFrame(()=>document.getElementById('tobeStepDesign')?.
        scrollIntoView({behavior:'smooth',block:'start'}));
    toast('Decisión guardada: '+TOBE_HUMAN_LABELS[choice]+'. Revisa los campos propuestos; el diseño sigue en borrador.');
  },true);
  // [AUNEA-FE-PG11-HUMAN-DECISION-SAVE-224] END
  // [AUNEA-FE-PG11-TRANSACTION-EVENTS-333] START — explicit, version-bound actions.
  document.addEventListener('click',async event=>{
    const button=event.target?.closest?.('[data-tobe-load-alternatives], [data-tobe-alternative], [data-tobe-alternative-discard], [data-tobe-alternative-restore], [data-tobe-confirm-alternative], [data-tobe-cancel-alternative], [data-tobe-undo-alternative]');
    if(!button||state.activePage!=='tobe')return;
    event.preventDefault();
    try{
      const e=currentEng(),p=latestTobe(e);
      if(button.hasAttribute('data-tobe-cancel-alternative')){
        document.getElementById('tobeAlternativeDialog')?.close();return;
      }
      if(button.hasAttribute('data-tobe-confirm-alternative')){
        const preview=__auneaTobePreview;tobeCommitAlternative(e,preview);
        document.getElementById('tobeAlternativeDialog')?.close();render();
        toast('Intervención guardada. El mapa y la validación global reflejan el mismo borrador.');return;
      }
      if(button.hasAttribute('data-tobe-undo-alternative')){
        if(!saveTobeFromDom(e)||!saveState('Conservar edición antes de deshacer'))throw Error('No se guardó tu edición.');
        tobeUndoAlternative(currentEng());render();toast('Intervención deshecha; se conservan las demás decisiones.');return;
      }
      if(button.hasAttribute('data-tobe-load-alternatives')){
        const id=button.dataset.tobeLoadAlternatives;
        if(!saveTobeFromDom(e)||!saveState('Conservar diseño antes del análisis por reglas'))throw Error('No se guardó tu edición.');
        const live=currentEng(),draft=latestTobe(live),key=tobeAlternativeKey(live,draft,id),
          diagnostic=currentDiagnosticOutput(live),snapshot=confirmedSnapshot(live);
        if(!diagnostic||!snapshot)throw Error('Falta un AS-IS confirmado o un diagnóstico vigente.');
        __auneaTobeAlternativeErrors.delete(key);
        __auneaTobeAlternatives.delete(key);
        // The old DOM must not remain clickable or look current while loading.
        button.closest('.tobe-alternatives')?.querySelectorAll('.tobe-alternative').forEach(card=>{
          card.hidden=true;
        });
        button.disabled=true;button.textContent='Analizando actividad…';
        const response=await fetch(state.backendUrl+'/v1/tobe/activity-alternatives',{
          method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            request:{engagement:buildBackendPayload(live),diagnostic,confirmed_as_is:live.confirmedAsIs===true,snapshot_version:snapshot.version},
            source_step_id:id})});
        const data=await response.json().catch(()=>({detail:'Respuesta del backend no interpretable.'}));
        if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:
          'El backend rechazó el análisis con HTTP '+response.status+'.');
        const incompatible=tobeRulesResultIssue(data);
        if(incompatible)throw Error(incompatible);
        const current=currentEng(),currentDraft=latestTobe(current);
        if(!current||!currentDraft||tobeAlternativeKey(current,currentDraft,id)!==key||
          currentDiagnosticOutput(current)?.input_snapshot_hash!==data.input_hash)throw Error('El estudio cambió durante el análisis. Vuelve a analizar la actividad.');
        __auneaTobeAlternativeErrors.delete(key);
        __auneaTobeAlternatives.set(key,data);render();return;
      }
      const id=button.dataset.tobeAlternativeSource,key=tobeAlternativeKey(e,p,id),data=__auneaTobeAlternatives.get(key);
      if(!data||currentDiagnosticOutput(e)?.input_snapshot_hash!==data.input_hash)throw Error('El análisis ya no corresponde al diagnóstico vigente.');
      const discard=button.hasAttribute('data-tobe-alternative-discard'),
        restore=button.hasAttribute('data-tobe-alternative-restore'),
        index=Number(discard?button.dataset.tobeAlternativeDiscard:
          restore?button.dataset.tobeAlternativeRestore:button.dataset.tobeAlternative);
      const candidate=data.candidates[index];if(!candidate)throw Error('La alternativa ya no está disponible.');
      if(restore){
        if(!saveTobeFromDom(e)||!saveState('Guardar edición antes de recuperar'))
          throw Error('No se guardó tu edición. La alternativa sigue descartada.');
        const draft=latestTobe(currentEng()),before=tobeClone(draft),
          entry=(draft.aiDraft?.applyHistory||[]).findLast(x=>
            String(x.candidateId)===String(candidate.id)&&x.action==='DISCARD'&&!x.undoneAt);
        if(!entry)throw Error('No existe un descarte vigente que recuperar.');
        entry.undoneAt=now();draft.updatedAt=now();
        markDirty('PG11: recuperar alternativa descartada');
        if(!saveState('Recuperar alternativa por reglas')){
          Object.keys(draft).forEach(k=>delete draft[k]);Object.assign(draft,before);
          throw Error('No se guardó la recuperación del descarte.');
        }
        render();return;
      }
      if(discard){
        if(!saveTobeFromDom(e)||!saveState('Guardar edición antes de descartar'))throw Error('No se guardó tu edición.');
        const draft=latestTobe(currentEng()),before=tobeClone(draft);
        if(!draft.aiDraft)draft.aiDraft={};
        draft.aiDraft.applyHistory=[...(draft.aiDraft.applyHistory||[]),{
          action:'DISCARD',candidateId:candidate.id,sourceStepId:id,fields:[],
          provenance:'RULES',sourceRefs:candidate.sourceRefs,appliedAt:now()}].slice(-100);
        markDirty('PG11: descartar alternativa por reglas');
        if(!saveState('Guardar descarte de alternativa')){
          Object.keys(draft).forEach(k=>delete draft[k]);Object.assign(draft,before);throw Error('No se guardó el descarte.');
        }
        render();return;
      }
      tobeOpenAlternative(e,candidate);
    }catch(error){
      const message=error instanceof TypeError&&button.hasAttribute('data-tobe-load-alternatives')?
        'No se puede contactar con el backend local. Comprueba el puerto 8010 y reinicia el backend si el endpoint es nuevo.':
        (error.message||'No se pudo completar la intervención.');
      if(button.hasAttribute('data-tobe-load-alternatives')){
        const live=currentEng(),draft=latestTobe(live);
        if(live&&draft){
          const key=tobeAlternativeKey(live,draft,button.dataset.tobeLoadAlternatives);
          __auneaTobeAlternatives.delete(key);
          __auneaTobeAlternativeErrors.set(key,message);
        }
        render();
      }
      toast(message);
    }finally{
      if(button.isConnected){
        button.disabled=false;
        if(button.hasAttribute('data-tobe-load-alternatives'))button.textContent='Generar alternativas con reglas';
      }
    }
  },true);
  // [AUNEA-FE-PG11-TRANSACTION-EVENTS-333] END

  // [AUNEA-FE-PG11-AI-STEP-APPLY-231] START — human-authorized per-field actions.
  // Per-field IA recommendation actions; the original input remains editable.
  document.addEventListener('click',event=>{
    const apply=event.target?.closest?.('[data-tobe-ai-use-field]');
    const blocked=event.target?.closest?.('[data-tobe-ai-apply-unavailable]');
    const keep=event.target?.closest?.('[data-tobe-ai-keep-field]');
    const edit=event.target?.closest?.('[data-tobe-ai-edit-field]');
    if((!apply&&!blocked&&!keep&&!edit)||state.activePage!=='tobe')return;
    event.preventDefault();
    if(blocked){
      toast(blocked.dataset.tobeAiReason||'La propuesta IA todavía no puede aplicarse.');
      const destination=document.querySelector('.tobe-human-review-shell')||
        document.querySelector('[data-tobe-generate-selected]');
      destination?.scrollIntoView?.({behavior:'smooth',block:'center'});
      return;
    }
    if(apply){
      try{
        const e=currentEng(),p=latestTobe(e),id=apply.dataset.tobeAiActionSource,
          diff=tobeAiReviewDiff(e,p,id),field=diff.fields.find(x=>x.key===apply.dataset.tobeAiUseField);
        if(diff.issue||!field)throw Error(diff.issue||'El valor IA ya no está disponible.');
        tobeOpenAlternative(e,{id:'AI:'+id+':'+field.key,sourceId:id,provenance:'AI',
          title:'IA · '+field.label,fields:{[field.key]:field.value},operations:[],sourceRefs:[id],
          conditions:diff.warnings});
      }catch(error){toast(error.message);}
      return;
    }
    if(keep){
      tobeKeepAiReviewedField(currentEng(),keep.dataset.tobeAiActionSource,
        keep.dataset.tobeAiKeepField);
      return;
    }
    const root=edit.closest('.tobe-ai-field-row')?.querySelector('.tobe-ai-field-control .field')||edit.closest('.field');
    const control=root?.querySelector('.tobe-artifact-compact>summary')||
      root?.querySelector('details.aunea-select>summary')||
      root?.querySelector('[data-model-set]')||
      root?.querySelector('textarea:not([disabled])')||
      root?.querySelector('input:not([type="hidden"]):not([disabled])');
    if(!control)return toast('No se ha encontrado el editor de este campo.');
    control.scrollIntoView?.({behavior:'smooth',block:'center'});
    control.focus();
    if(control.matches('.tobe-artifact-compact>summary, details.aunea-select>summary'))
      control.click();
  },true);
  // [AUNEA-FE-PG11-AI-STEP-APPLY-231] END
  // [AUNEA-FE-PG11-ARTIFACT-CHIPS-276] START — refresh chip labels
  // without unmounting the canonical multiselect or erasing unsaved edits.
  document.addEventListener('change',event=>{
    const input=event.target?.closest?.('.tobe-artifact-compact [data-v1-multi]');
    if(!input||state.activePage!=='tobe')return;
    const root=input.closest('.tobe-artifact-compact'),slot=root?.querySelector('.tobe-artifact-chips');
    if(!slot)return;
    const chosen=[...root.querySelectorAll('[data-v1-multi]:checked')];
    slot.innerHTML=chosen.length?chosen.map(control=>{
      const label=control.closest('label')?.textContent?.trim()||control.value;
      return '<span class="tobe-selected-data-chip">'+esc(label)+'</span>';
    }).join(''):'<span class="tobe-muted">Selecciona formatos</span>';
  },true);
  // [AUNEA-FE-PG11-ARTIFACT-CHIPS-276] END




  const originalPostBind=postBind;
  postBind=function(){
    originalPostBind();
    const e=currentEng(),by=id=>document.getElementById(id);
    if(by('createOutputReview'))by('createOutputReview').onclick=()=>{createOutputReview(e);render()};
    if(by('advanceOutputReview'))by('advanceOutputReview').onclick=()=>{advanceOutputReview(e,!!by('authorizeResultsPrice')?.checked);render()};
    if(by('analyzeAsisOnly'))by('analyzeAsisOnly').onclick=()=>runAsisAnalysis(e);
    bindDiagnosticMapPointNavigation();
    document.querySelectorAll('[data-draft-conditional-scenario]').forEach(x=>x.onclick=()=>createScenario(Number(x.dataset.draftConditionalScenario)));
    if(by('saveTobe'))by('saveTobe').onclick=()=>{
      // Recovery merges and replaces Engagement references; always save the live owner.
      const live=currentEng();
      if(live&&saveTobeFromDom(live)&&saveState('Guardar borrador TO-BE'))render();
    };
    if(by('advanceTobe'))by('advanceTobe').onclick=()=>{
      // Persistence reconciles and replaces state.engagements. Reacquire the live
      // owner after each save; never advance an orphaned Engagement reference.
      const before=currentEng(),current=latestTobe(before),previous=current?.status;
      if(!before||!current||(tobeEditable(current)&&!saveTobeFromDom(before))||
        !saveState('Guardar campos TO-BE antes de revisión'))return;
      const live=currentEng();
      if(!live||!advanceTobeStatus(live))return;
      if(!saveState('Confirmar revisión humana TO-BE')){
        const present=latestTobe(currentEng());
        if(present){present.status=previous;present.updatedAt=now();}
        markDirty('Cambio de estado TO-BE pendiente de guardar');
        toast('El cambio de estado no se ha guardado. Conserva el estudio abierto.');
        return;
      }
      render();
    };
    if(by('newTobeVersion'))by('newTobeVersion').onclick=()=>{
      const live=currentEng();
      if(!createNextTobeVersion(live))return toast('No es posible crear una nueva versión con las fuentes actuales.');
      if(saveState('Nueva versión TO-BE'))render();
    };
    if(by('checkTobeReadiness'))by('checkTobeReadiness').onclick=()=>{
      const live=currentEng(),current=latestTobe(live);
      if(tobeEditable(current)&&(!saveTobeFromDom(live)||
        !saveState('Guardar TO-BE antes de comprobar coherencia')))
        return toast('No se pudo guardar el diseño antes de validarlo.');
      const actual=currentEng(),issue=tobeReviewReadiness(actual,latestTobe(actual));
      const feedback=by('tobeReadinessStatus');
      if(feedback)feedback.innerHTML='<div class="notice '+(issue?'warn':'info')+'">'+
        esc(issue||'Los requisitos estructurales están completos. Revisa la coherencia y las fuentes antes de marcar como revisado.')+'</div>';
    };
    if(state.activePage==='tobe'&&by('tobeInspector')&&typeof drawProcessGraph==='function'&&
      typeof requestAnimationFrame==='function')requestAnimationFrame(drawProcessGraph);
    if(typeof pg12AfterBind==='function')pg12AfterBind();
  };
}
// [AUNEA-FE-INTERNAL-WORK-EVENTS-381] END
