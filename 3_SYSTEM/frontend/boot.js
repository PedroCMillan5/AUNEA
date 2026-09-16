// [AUNEA-FE-BOOT-INIT-010] START — Arranque único
// PURPOSE: Iniciar los módulos cargados en orden por index.html usando el Diagnostic Master canónico vigente.
// SOURCE: AUNEA Internal v1.0.4 aceptada; Diagnostic Master v1.1 CANONICAL; PROJECT_RULES.md.
// INPUTS: módulos, DOM y adapter AUNEA-DATA-DIAG-ADAPTER-010 listos.
// NOTE: la migración de almacenamiento corre aquí, no en loadState, porque cada migración vive en el
// módulo dueño de su schema y ésos se cargan después del estado.
// OUTPUTS: primera pantalla y estado del backend.
// SIDE_EFFECTS: carga de schema canónico efectivo y comprobación HTTP.
// CHANGE_RISK: HIGH.
// A window opened at #session is the client-facing surface: it renders the published projection and
// nothing else. It deliberately does not boot the Console, so the engagement never reaches it.
if(location.hash==='#session'){bootSessionDisplay();}
else{migrateLoadedState();initCanonicalV11();}
// [AUNEA-FE-BOOT-INIT-010] END
