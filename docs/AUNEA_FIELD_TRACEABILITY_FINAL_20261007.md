# AUNEA Internal — Matriz final de trazabilidad DF001–DF100

Fecha: 07/10/2026  
Rama: `work/as-is-ux-simplification-20260930`  
Estado: IMPLEMENTED / NATIVE QA PASS / FUNCTIONAL ACCEPTANCE GATE SUCCESS

## Criterio de aceptación

Cada Field_ID debe conservar: primera captura/derivación, owner de escritura, requiredness/branch, política de no-repregunta, consumidores y plan downstream de invalidación. El DiagnosticOutput oficial sigue ligado a un snapshot; cuando cambia un input se retira como vigente y se conserva el plan exacto de componentes STALE.

| Field | Stage | Ask mode | Owner / destino | Requiredness | Reask | Consumers | STALE / recalcular |
|---|---|---|---|---|---|---|---|
| DF001 | S01 | PREFILL_CONFIRM | RT_COMPANY.Company_Name | REQUIRED_90M | CONFIRM_ONLY_IF_CHANGED | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF002 | S01 | PREFILL_CONFIRM | RT_COMPANY.Sector | OPTIONAL_90M | CONFIRM_ONLY_IF_CHANGED | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF003 | S01 | PREFILL_OR_OPTIONAL | RT_COMPANY.Employee_Count | OPTIONAL_90M | NO_REASK | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF004 | S01 | PREFILL_OR_OPTIONAL | RT_COMPANY.Revenue_Band | OPTIONAL_90M | NO_REASK | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF005 | S01 | PREFILL_CONFIRM | RT_COMPANY.Country | OPTIONAL_90M | NO_REASK | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF006 | S01 | PREFILL_CONFIRM | RT_CONTACT | REQUIRED_90M | CONFIRM_ONLY_IF_CHANGED | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF007 | S01 | CONDITIONAL_ASK | RT_CONTACT.Decision_Role | OPTIONAL_90M | NO_REASK | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF008 | S01 | ASK | RT_ENGAGEMENT.Objective | REQUIRED_90M | NO_REASK | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF009 | S01 | ASK | RT_ENGAGEMENT.Success_Criteria | OPTIONAL_90M | NO_REASK | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF010 | S01 | CONDITIONAL_ASK | RT_ENGAGEMENT.Initial_Constraints | CONDITIONAL_90M | REUSE_AND_DRILL_ONLY | Recommendation; Governance | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Governance |
| DF011 | S02 | ASK | RT_PROCESS.Process_Name_Client | REQUIRED_90M | NO_REASK | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF012 | S02 | ASK | RT_PROCESS.Trigger | REQUIRED_90M | NO_REASK | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF013 | S02 | ASK | RT_PROCESS.Outcome | REQUIRED_90M | NO_REASK | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF014 | S02 | CONDITIONAL_ASK | RT_PROCESS.Start_Boundary | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF015 | S02 | CONDITIONAL_ASK | RT_PROCESS.End_Boundary | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF016 | S02 | CONDITIONAL_ASK | RT_PROCESS.Process_Owner | CONDITIONAL_90M | NO_REASK | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF017 | S02 | PREFILL_CONFIRM | RT_PROCESS.Participants | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF018 | S02 | ASK | RT_PROCESS.Criticality_1_5 | CONDITIONAL_90M | NO_REASK | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF019 | S02 | ASK | RT_PROCESS.Documented_Currently | CONDITIONAL_90M | NO_REASK | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF020 | S02 | CONDITIONAL_ASK | RT_PROCESS.Known_Variants | CONDITIONAL_90M | NO_REASK | Pain; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF021 | S03 | ASK | RT_PROCESS.Volume_Value | REQUIRED_90M | NO_REASK | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF022 | S03 | ASK | RT_PROCESS.Volume_Period | REQUIRED_90M | NO_REASK | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF023 | S03 | CONDITIONAL_ASK | RT_PROCESS.Peak_Volume | OPTIONAL_90M | ASK_ONLY_IF_BRANCH | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF024 | S03 | ASK | RT_PROCESS.Seasonality | OPTIONAL_90M | NO_REASK | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF025 | S03 | CONDITIONAL_ASK | RT_PROCESS.SLA_Target | CONDITIONAL_90M | ASK_ONLY_IF_BRANCH | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF026 | S03 | CONDITIONAL_ASK | RT_PROCESS.Baseline_Cycle_Time | CONDITIONAL_90M | DERIVE_THEN_VALIDATE | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF027 | S03 | CONDITIONAL_ASK | RT_PROCESS.Backlog | CONDITIONAL_90M | ASK_ONLY_IF_BRANCH | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF028 | S03 | CONDITIONAL_ASK | RT_PROCESS.Failure_Rate | CONDITIONAL_90M | DERIVE_THEN_VALIDATE | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF029 | S03 | CONDITIONAL_ASK | RT_PROCESS.Service_Priority | OPTIONAL_90M | NO_REASK | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF030 | S03 | OPTIONAL_ASK | RT_PROCESS.Demand_Change | OPTIONAL_90M | NO_REASK | Pain; Economics | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF031 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Step_Name | REQUIRED_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF032 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Step_Type_ID | REQUIRED_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF033 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Actor | REQUIRED_90M | SELECT_REUSE_NOT_RETYPE | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF034 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Tool | CONDITIONAL_90M | SELECT_REUSE_NOT_RETYPE | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF035 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Inputs | CONDITIONAL_90M | SELECT_REUSE_NOT_RETYPE | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF036 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Outputs | CONDITIONAL_90M | SELECT_REUSE_NOT_RETYPE | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF037 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Active_Time_Min | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF038 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Wait_Time_Min | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF039 | S04 | CONDITIONAL_IN_STEP | RT_PROCESS_STEP.Rework_Time_Min | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF040 | S04 | CONDITIONAL_IN_STEP | RT_PROCESS_STEP.Error_Rate_Pct | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF041 | S04 | CONDITIONAL_IN_STEP | RT_PROCESS_STEP.Decision_Criteria | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF042 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Normal_Next_Step | CONDITIONAL_90M | SELECT_REUSE_NOT_RETYPE | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF043 | S04 | CONDITIONAL_IN_STEP | RT_PROCESS_STEP.Exception_Path | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF044 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Manual_Actions | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF045 | S04 | CAPTURE_IN_PROCESS_STEP | RT_PROCESS_STEP.Automation_State | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation; Risk | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF046 | S04 | DERIVE_AND_CONFIRM | RT_PROCESS.Current_Tools | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF047 | S04 | DERIVE_AND_CONFIRM | RT_PROCESS.Data_Sources | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF048 | S04 | CONDITIONAL_ASK | RT_PROCESS.Master_Data | CONDITIONAL_90M | NO_REASK | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF049 | S04 | DERIVE_AND_CONFIRM | RT_PROCESS.Current_Documents | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF050 | S04 | DERIVE_AND_CONFIRM | RT_PROCESS.Communication_Channels | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF051 | S04 | SYSTEM_SUGGEST_THEN_CONFIRM | RT_FINDING | CONDITIONAL_90M | DO_NOT_ASK_IF_DERIVABLE | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF052 | S04 | CONDITIONAL_ASK | RT_FINDING | CONDITIONAL_90M | NO_REASK | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF053 | S04 | SYSTEM_SUGGEST_THEN_CONFIRM | RT_FINDING | CONDITIONAL_90M | DO_NOT_ASK_IF_DERIVABLE | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF054 | S04 | SYSTEM_SUGGEST_THEN_CONFIRM | RT_FINDING | CONDITIONAL_90M | DO_NOT_ASK_IF_DERIVABLE | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF055 | S04 | CONDITIONAL_ASK | RT_FINDING | CONDITIONAL_90M | NO_REASK | Pain; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF056 | S05 | CAPTURE_IN_FRICTION | RT_PAIN.Client_Description | REQUIRED_90M | NO_REASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF057 | S05 | DERIVED | RT_PAIN.Pain_ID | CONDITIONAL_90M | NEVER_ASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF058 | S05 | CAPTURE_IN_FRICTION | RT_PAIN.Cause | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF059 | S05 | CAPTURE_IN_FRICTION | RT_PAIN.Step_Instance_IDs | CONDITIONAL_90M | SELECT_REUSE_NOT_RETYPE | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF060 | S05 | CAPTURE_IN_FRICTION | RT_PAIN.Frequency_Value | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF061 | S05 | CAPTURE_IN_FRICTION | RT_PAIN.Severity_1_5 | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF062 | S05 | CONDITIONAL_IN_FRICTION | RT_PAIN.Time_Loss_Min_Per_Occurrence | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF063 | S05 | CONDITIONAL_IN_FRICTION | RT_PAIN.Direct_Cost_Loss | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF064 | S05 | CAPTURE_IN_FRICTION | RT_PAIN.Non_Time_Impact | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF065 | S05 | CAPTURE_IN_FRICTION | RT_PAIN.Current_Workaround | CONDITIONAL_90M | NO_REASK | Pain; Economics; Recommendation | Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF066 | S06 | DERIVE_AND_CONFIRM | RT_PROCESS.Exception_Types | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF067 | S06 | DERIVE_AND_CONFIRM | RT_PROCESS.Approval_Paths | CONDITIONAL_90M | DERIVE_THEN_CONFIRM | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF068 | S06 | CONDITIONAL_ASK | RT_RISK.Description | CONDITIONAL_90M | NO_REASK | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF069 | S06 | CAPTURE_IN_RISK | RT_RISK.Risk_Category_ID | CONDITIONAL_90M | NO_REASK | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF070 | S06 | CAPTURE_IN_RISK | RT_RISK.Likelihood_1_5 | CONDITIONAL_90M | NO_REASK | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF071 | S06 | CAPTURE_IN_RISK | RT_RISK.Impact_1_5 | CONDITIONAL_90M | NO_REASK | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF072 | S06 | CAPTURE_IN_RISK | RT_RISK.Current_Control | CONDITIONAL_90M | NO_REASK | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF073 | S06 | CONDITIONAL_ASK | RT_PROCESS.Sensitive_Data | CONDITIONAL_90M | NO_REASK | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF074 | S06 | CONDITIONAL_ASK | RT_PROCESS.Irreversible_Actions | CONDITIONAL_90M | NO_REASK | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF075 | S06 | CONDITIONAL_ASK | RT_PROCESS.Human_Approval_Required | CONDITIONAL_90M | REUSE_AND_DRILL_ONLY | Risk; Recommendation | Risk → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF076 | S07 | CONDITIONAL_ASK | RT_ECONOMIC_INPUT | CONDITIONAL_90M | SELECT_REUSE_NOT_RETYPE | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF077 | S07 | CONDITIONAL_ASK | RT_ECONOMIC_INPUT | CONDITIONAL_90M | ASK_ONLY_IF_BRANCH | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF078 | S07 | DERIVED | RT_ECONOMIC_INPUT | CONDITIONAL_90M | NEVER_REASK_IF_COMPLETE | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF079 | S07 | DERIVED | RT_ECONOMIC_INPUT | CONDITIONAL_90M | NEVER_REASK_IF_COMPLETE | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF080 | S07 | CONDITIONAL_ASK | RT_ECONOMIC_INPUT | CONDITIONAL_90M | DERIVE_THEN_VALIDATE | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF081 | S07 | CONDITIONAL_ASK | RT_ECONOMIC_INPUT | CONDITIONAL_90M | DERIVE_THEN_VALIDATE | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF082 | S07 | CONDITIONAL_ASK | RT_ECONOMIC_INPUT | CONDITIONAL_90M | DERIVE_THEN_VALIDATE | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF083 | S07 | CONDITIONAL_ASK | RT_ECONOMIC_INPUT | CONDITIONAL_90M | SELECT_REUSE_NOT_RETYPE | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF084 | S07 | CONDITIONAL_ASK | RT_ECONOMIC_INPUT | CONDITIONAL_90M | NO_REASK | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF085 | S07 | DERIVED | RT_ENGAGEMENT.Economic_Confidence | CONDITIONAL_90M | NEVER_ASK | Economics; Recommendation | Economics → Recommendation → ProductPricing → ScenarioComparator → Deliverables |
| DF086 | S08 | ASK | RT_PROCESS.Desired_Outcome | REQUIRED_90M | NO_REASK | Recommendation; Risk; ProductPricing(future) | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Risk |
| DF087 | S08 | CONDITIONAL_ASK | RT_PROCESS.Must_Keep | CONDITIONAL_90M | REUSE_AND_DRILL_ONLY | Recommendation; Risk; ProductPricing(future) | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Risk |
| DF088 | S08 | CONDITIONAL_ASK | RT_PROCESS.Must_Not_Automate | CONDITIONAL_90M | REUSE_AND_DRILL_ONLY | Recommendation; Risk; ProductPricing(future) | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Risk |
| DF089 | S08 | CONDITIONAL_ASK | RT_PROCESS.Preferred_Platforms | CONDITIONAL_90M | REUSE_AND_DRILL_ONLY | Recommendation; Risk; ProductPricing(future) | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Risk |
| DF090 | S08 | CONDITIONAL_ASK | RT_PROCESS.Security_Constraints | CONDITIONAL_90M | REUSE_AND_DRILL_ONLY | Recommendation; Risk; ProductPricing(future) | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Risk |
| DF091 | S08 | CONDITIONAL_ASK | RT_PROCESS.Change_Constraints | CONDITIONAL_90M | REUSE_AND_DRILL_ONLY | Recommendation; Risk; ProductPricing(future) | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Risk |
| DF092 | S08 | OPTIONAL_ASK | RT_ENGAGEMENT.Budget_Context | OPTIONAL_90M | NO_REASK | Recommendation; Risk; ProductPricing(future) | Recommendation → ProductPricing → ScenarioComparator → Deliverables → Risk |
| DF093 | S09 | CLIENT_CONFIRMATION | RT_ENGAGEMENT.Summary_Confirmed | REQUIRED_90M | FINAL_CONFIRMATION_ONLY | Governance; All | Governance → Deliverables → Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator |
| DF094 | S09 | SYSTEM_GENERATED | RT_ENGAGEMENT.Missing_Information | CONDITIONAL_90M | NEVER_ASK_OPEN | Governance; All | Governance → Deliverables → Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator |
| DF095 | S09 | SYSTEM_GENERATED | RT_ENGAGEMENT.Evidence_To_Request | CONDITIONAL_90M | NEVER_ASK_OPEN | Governance; All | Governance → Deliverables → Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator |
| DF096 | S09 | CLIENT_CONFIRMATION | RT_ENGAGEMENT.Priority_Pains | CONDITIONAL_90M | SELECT_REUSE_NOT_RETYPE | Governance; All | Governance → Deliverables → Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator |
| DF097 | S09 | OPTIONAL_ASK | RT_ENGAGEMENT.Decision_Timeline | OPTIONAL_90M | NO_REASK | Governance; All | Governance → Deliverables → Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator |
| DF098 | S09 | ASK | RT_ENGAGEMENT.Next_Step | REQUIRED_90M | NO_REASK | Governance; All | Governance → Deliverables → Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator |
| DF099 | S09 | CONDITIONAL_ASK | RT_ENGAGEMENT.Permission_To_Use_Data | OPTIONAL_90M | NO_REASK | Governance; All | Governance → Deliverables → Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator |
| DF100 | S09 | OPTIONAL_ASK | RT_ENGAGEMENT.Consultant_Notes | OPTIONAL_90M | NO_REASK | Governance; All | Governance → Deliverables → Pain → Economics → Risk → Recommendation → ProductPricing → ScenarioComparator |

## Reglas transversales verificadas

- DF001–DF100 existen exactamente una vez.
- Todos declaran Ask_Mode, Requiredness, Branch_Rule_ID, Write_Target, Engine_Consumers, Reask_Policy, Validation, Evidence_Expected y Evidence_Fallback.
- DF002 consume el sector canónico `REF_INDUSTRY_CNAE25` y escribe/reutiliza `RT_COMPANY.Sector`.
- Economics distingue existencia de filas de cobertura canónica de inputs.
- Risk conserva los IN-K utilizados y gaps aplicables.
- Recommendation conserva precondiciones, información pendiente e IN-R utilizados; FL-03 se activa por complejidad material de excepciones.
- Scenario economics sólo se calcula con estado futuro o supuestos explícitos; no existe porcentaje universal de recuperación.
- Scenario_ID y Assumption_Set_Hash son deterministas.
- Payback usa únicamente ahorro de caja realizable explícito; capacidad y espera permanecen separadas.
- Los cambios por Field_ID conservan el plan downstream STALE; el output oficial del snapshot anterior deja de considerarse vigente.


## QA nativa de cierre

- AUNEA Internal V2 REVIEW Acceptance Gate run 1218: SUCCESS.
- SHA funcional validado: `25ba58e2b6e8336b8cce08b7937991f9f4f4fbbe`.
- Backend: SUCCESS.
- Frontend modular/UX regression: SUCCESS.
- Chromium end-to-end sobre la UAT única y el editor cliente real: SUCCESS.
- La UAT visible usa un único engagement sintético de recepción/aprobación de facturas; los fixtures phased UAT1/UAT2 han sido retirados del runtime y conservados en `9_ARCHIVO/AUNEA_INTERNAL_UAT_PHASED_20260922/`.
- PG09 es el único cierre que sella el snapshot; las cuatro capas AS-IS sólo habilitan la validación final. El cierre PG09 persiste el snapshot síncronamente antes de Trabajo interno.
