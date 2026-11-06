// [AUNEA-FE-PG11-GLOBAL-STATE-295] START — view-only status and retry
// SOURCE: PG11 CANONICAL; DEC-050/052/055; versioned TO-BE aiGlobal.
// INPUT: existing tobeGlobalStored and tobeGlobalOverviewHtml.
// OUTPUT: readable status and a manual selective-retry control.
// SIDE EFFECTS: HTML decoration only. No fields, business writes or approvals.
(function(){
  const previous=tobeGlobalOverviewHtml;
  tobeGlobalOverviewHtml=function(e,p){
    let html=previous(e,p);
    const result=tobeGlobalStored(e,p);
    if(!result||!result.progress)return html;
    const progress=result.progress;
    const completed=Array.isArray(progress.focus_done)?
      progress.focus_done.length:Math.min(progress.completed||0,progress.total||0);
    const total=progress.total||0,pending=Math.max(0,total-completed);
    const cards=result.opportunities||[];
    const valid=cards.filter(item=>[item.how,item.why,
      ...(item.related||[]).flatMap(x=>[x.how,x.why])]
      .every(x=>typeof x==='string'&&/[.!?…]$/.test(x.trim()))).length;
    const errors=progress.failed||0;
    const review=typeof tobeHumanReviewRecord==='function'?
      tobeHumanReviewRecord(e,p):null;
    const decisions=Object.keys(review?.decisions||{}).length;
    const lines='<div class="tobe-global-progress" role="status" aria-live="polite">'+
      '<p><b>Generación:</b> '+completed+' de '+total+' fuentes completas'+
        (pending?' · '+pending+' pendientes':'')+
        (errors?' · '+errors+' con incidencia':'')+'.</p>'+
      '<p><b>Integridad:</b> '+valid+' de '+cards.length+
        ' recomendaciones con texto íntegro.'+
        (valid<cards.length?' Revisar las frases incompletas.':'')+'</p>'+
      '<p><b>Revisión humana:</b> '+decisions+' decisiones registradas por actividad. '+
        'Las recomendaciones globales siguen sin aprobar.</p></div>';
    const old=/<p class="tobe-global-feedback" role="status">Fuentes revisadas:[\s\S]*?<\/p>/;
    html=old.test(html)?html.replace(old,lines):
      html.replace('<p class="tobe-global-caution">',lines+'<p class="tobe-global-caution">');
    const working=typeof internalAiGlobalWorking==='function'&&internalAiGlobalWorking(e);
    if(p?.status==='DRAFT'&&result.complete===false&&pending>0&&
       Array.isArray(progress.focus_done)){
      const button='<button type="button" class="btn btn-outline btn-small" id="retryTobeGlobal"'+
        (working?' disabled aria-busy="true"':'')+
        '>Reintentar fuentes pendientes</button>';
      html=html.replace('</button></header>','</button>'+button+'</header>');
    }
    return html;
  };
})();
// [AUNEA-FE-PG11-GLOBAL-STATE-295] END
