// [AUNEA-FE-DIAG-NOREASK-055] START — Capacity branch canonical field correction
// PURPOSE: Ensure BR-CAPACITY reads the backend/canonical EconomicInput capacity field.
// SOURCE: EconomicInput.capacity_cost_rate_eur_hour; Diagnostic Master DF076/DF077; REQ-DIAG-006.
// INPUTS: engagement answers and economicInputs.
// OUTPUTS: correct BR-CAPACITY visibility decision.
// SIDE_EFFECTS: none; wraps branch visibility only.
// CHANGE_RISK: MEDIUM.
const __auneaBranchActiveBeforeCapacityFix=branchActive;
branchActive=function(ruleId,e){
  if(ruleId==='BR-CAPACITY'){
    const answers=e.answers||{};
    return valuePresent(answers.DF076)||valuePresent(answers.DF077)||(e.economicInputs||[]).some(x=>scalarNumber(x.capacity_cost_rate_eur_hour)>0);
  }
  return __auneaBranchActiveBeforeCapacityFix(ruleId,e);
};
// [AUNEA-FE-DIAG-NOREASK-055] END
