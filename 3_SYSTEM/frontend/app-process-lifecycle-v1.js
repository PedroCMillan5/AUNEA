// [AUNEA-FE-PROC-LIFECYCLE-030] START — Trazabilidad y confirmación AS-IS
// PURPOSE: Own lifecycle-only actions for Process Steps/Friction records and AS-IS confirmation, separate from editors and engine adapters.
// SOURCE: Process/Friction Models; DEC-033/040.
// INPUTS: current Engagement, step/friction ids and explicit consultant confirmation.
// OUTPUTS: SUPERSEDED lifecycle state and AS-IS confirmation state.
// SIDE_EFFECTS: engagement state mutation, audit/dirty state and DOM re-render.
// CHANGE_RISK: HIGH.
function supersedeStep(stepId){
  const e=currentEng(),x=e.processSteps.find(s=>s.id===stepId);
  if(!x)return;
  if(!confirm('El paso no se borrará físicamente: quedará SUPERSEDED para conservar trazabilidad. ¿Continuar?'))return;
  x.status='SUPERSEDED';e.confirmedAsIs=false;markDirty(`Paso ${stepId} superseded`);render();
}

function supersedeFriction(frId){
  const e=currentEng(),x=e.frictions.find(s=>s.id===frId);
  if(!x)return;
  if(!confirm('La fricción quedará SUPERSEDED para conservar trazabilidad. ¿Continuar?'))return;
  x.status='SUPERSEDED';e.confirmedAsIs=false;markDirty(`Fricción ${frId} superseded`);render();
}

function confirmAsIs(){
  const e=currentEng();
  if(!e.processSteps.filter(x=>x.status!=='SUPERSEDED').length)return toast('Añade al menos un paso.');
  e.confirmedAsIs=true;e.answers.DF093='YES';e.asIsConfirmedAt=now();
  markDirty('AS-IS confirmado por revisión');render();
  toast('Flujo AS-IS confirmado. Si se edita después, volverá a quedar pendiente.');
}
// [AUNEA-FE-PROC-LIFECYCLE-030] END
