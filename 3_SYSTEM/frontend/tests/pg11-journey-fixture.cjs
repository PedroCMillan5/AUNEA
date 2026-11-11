// Synthetic AS-IS and actual backend diagnosis; shared by DOM and Chromium acceptance.
module.exports=async function setupPg11Journey({kind,backend}){
   const fixture=await (await fetch('uat/cases/invoices.json')).json(),row=uat3Seed(fixture),e=row.engagement;
   const original=e.processSteps;
   const names=kind==='invoice'?['Recibir factura','Determinar si procede aprobación','Aprobar factura','Registrar en ERP']:['Recibir mercancía','Validar entrega','Tratar incidencias','Expedir mercancía'];
   e.processSteps=[original[0],original[3],original[4],original[5]].map((s,i)=>({...s,id:'P'+(i+1),step_name:names[i],step_type:i===1?'ST04':i===2&&kind==='invoice'?'ST05':'ST02',normal_next_step:i===3?'__END__':'P'+(i+2),exception_path:i===1?{destination_step:'P4',condition:'No procede intervención'}:undefined}));
   e.frictions=e.frictions.slice(0,1).map(f=>({...f,affected_steps:['P1'],client_label:'Reintroducción duplicada',time_attribution:{mode:'INCLUDED',step_id:'P1'}}));
   e.risks=e.risks.slice(0,1).map(r=>({...r,step_ids:['P1']}));e.economicInputs=e.economicInputs.map(x=>({...x,step_ids:['P1']}));e.answers.DF093='YES';
   e.confirmedAsIs=true;e.confirmedSnapshots=[];e.tobeProposals=[];e.answers.DF075=['P3'];
   state.companies.push(row.company);state.contacts.push(...row.contacts);state.engagements.push(e);state.activeEngagementId=e.id;
   sealConfirmedSnapshot(e,'UAT sintética explícita — no cliente real');
   const snap=confirmedSnapshot(e);e.engineGates=Object.fromEntries(ENGINE_GATE_CONTRACT.map(c=>[c.key,c.key==='existing_tool_can_close'?'YES':'NO']));
   e.engineGateReview={snapshotVersion:snap.version,decisions:Object.fromEntries(ENGINE_GATE_CONTRACT.map(c=>[c.key,{answer:e.engineGates[c.key]}]))};
   state.backendUrl=backend;state.backendOnline=true;
   const response=await fetch(backend+'/v1/diagnose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(buildBackendPayload(e))});
   const output=await response.json();if(!response.ok)throw Error(JSON.stringify(output));
   e.diagnosticOutput=output;e.lastEngineSnapshotVersion=snap.version;e.lastEngineGateFingerprint=engineGateFingerprint(e);
   createTobeDraft(e);state.activePage='tobe';markDirty('UAT fixture');if(!saveState('UAT fixture'))throw Error('fixture save failed');render();

};
