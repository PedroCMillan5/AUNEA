// [AUNEA-FE-BOOT-INIT-010] START — Arranque único
// PURPOSE: Iniciar los módulos cargados en orden por index.html usando el Diagnostic Master canónico vigente.
// SOURCE: AUNEA Internal v1.0.4 aceptada; Diagnostic Master v1.2 CANONICAL; PROJECT_RULES.md; DEC-053.
// INPUTS: módulos, DOM y adapter AUNEA-DATA-DIAG-ADAPTER-010 listos.
// NOTE: la migración de almacenamiento corre aquí, no en loadState, porque cada migración vive en el
// módulo dueño de su schema y ésos se cargan después del estado.
// OUTPUTS: Console interna o una de las superficies cliente independientes.
// SIDE_EFFECTS: carga de schema canónico efectivo y comprobación HTTP sólo en Console.
// CHANGE_RISK: HIGH.
// Shared windows deliberately do not boot the Console.
if(location.hash==='#session'){bootSessionDisplay();}
else if(location.hash==='#results'){bootResultsMode();}
else{document.body.classList.add('mode-internal');INTERNAL_WORK_NAV.push(['implementacion','✓','Decisión e implementación']);if(typeof registerInternalWorkPages==='function')registerInternalWorkPages();if(typeof registerResultsModeLauncher==='function')registerResultsModeLauncher();migrateLoadedState();initCanonicalV12();}
// [AUNEA-FE-BOOT-INIT-010] END
