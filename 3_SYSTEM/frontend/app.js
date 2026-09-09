// [AUNEA-FE-BOOT-INIT-010] START — Arranque único
// PURPOSE: Iniciar los módulos cargados en orden por index.html usando el Diagnostic Master canónico vigente.
// SOURCE: AUNEA Internal v1.0.4 aceptada; Diagnostic Master v1.1 CANONICAL; PROJECT_RULES.md.
// INPUTS: módulos, DOM y adapter AUNEA-DATA-DIAG-ADAPTER-010 listos.
// OUTPUTS: primera pantalla y estado del backend.
// SIDE_EFFECTS: carga de schema canónico efectivo y comprobación HTTP.
// CHANGE_RISK: HIGH.
initCanonicalV11();
// [AUNEA-FE-BOOT-INIT-010] END
