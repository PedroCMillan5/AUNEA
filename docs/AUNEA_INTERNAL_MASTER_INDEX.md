# AUNEA Internal — Master Index (espejo técnico)

Estado: ACTIVE · versión del espejo: 1.2 · verificación: 30/09/2026.
Drive continúa como fuente de gobierno humano. Este archivo es únicamente navegación.

## Fuentes vigentes consultadas

- `00_AUNEA_INTERNAL_MASTER_INDEX` v1.37: Drive `16ZaNWcBHZ0WoHKH1aizAfrxnAJLeD89O9_ruu5Q1OZ4`.
- `PROJECT_RULES.md` v1.7 y `CODE_CONVENTIONS.md` en el repositorio.
- `DECISIONES_AUNEA`: DEC-065 (anclajes técnicos), DEC-066 (FROZEN), DEC-068 (atribución temporal) aplican a esta auditoría.
- Diagnostic Master **v0.9.2 / v1.2 CANONICAL**: Drive `1HRlB30kpziDc3WNPxMVj0HfXuRUdOgbW`. Gobierna DF001–DF100, relaciones, opciones y reglas; versiones v1/v1.1 anteriores son ARCHIVED.
- Simulator **v1.14 CANONICAL**: Drive `1aPc5BIKBxvhsxJQIt-MkgQPEJWUX9PaJuxU2h2bh3SM`. Orquesta páginas y superficies sin sustituir reglas del Diagnostic Master.
- Architecture Contract identificado como **v1.7 CANONICAL** por el índice de Drive: `1K5jfYePIEU25LYH1KAEgWa8QOEvV9HpgQoGN6pWelyM`. La portada extraída aún indica v1.5: inconsistencia documental registrada, sin modificar su estado.

## Estado técnico de esta rama

Repositorio: PedroCMillan5/AUNEA. Backend `3_SYSTEM/backend/`; frontend `3_SYSTEM/frontend/`.
AUNEA Internal v2.0.0 permanece REVIEW; la baseline v1.0.4 no queda sustituida por esta auditoría.

- Base remota exacta: `fix/session90-snapshot-invalidation-20260929` en `c4280744f2595decbb859264b46f4fc5573fcaa9`.
- Rama única vigente: `reconcile/frontend-v1.0.4-source`. Contiene todo B01/B02/B03, incluida la auditoría publicada originalmente desde Astra. B04 no iniciado.
- Alcance: auditar/corregir exclusivamente B02/B03 existentes.
- Informe: [Auditoría B02/B03](SESSION90_B02_B03_AUDIT_20260930.md).
- QA en la rama única: 356/356 frontend y 76/76 backend PASS en Acceptance Gate run 36688583671. Integración DOM + HTTP PASS como script independiente; no equivale a UAT visual/nativa Windows.
- Handoff: `3_SYSTEM/02_HERRAMIENTAS/simulador/SESSION90_EXECUTION_HANDOFF_20260929.md`.
- Sin merge a main ni promoción automática.

## Candidatos que no gobiernan todavía

- Diagnostic Master v1.3 B02 REVIEW: `1sHGwsiOhG4FAOaLLDvKu8AXGQP6N3eBZ`.
- Simulator v1.15 B02 REVIEW (incluye adenda B03): `1HCsrj75N2Z5AMVcGTEgpYophZanaQkeedoGK-971J5E`.
- Architecture Contract v1.8 B02 REVIEW: `1pDIyvYeEE0lkmMB1L5K09LmMkG5skISO`.

## Protección y continuidad

FROZEN: Inicio, Empresas, Contactos, Interacciones, Oportunidades, Estudios, S01, S02 y S08. La auditoría no cambia páginas, estilos o snapshots protegidos. S03 y editor client-first permanecen REVIEW.

Datos → reglas → interfaz → entregables. Drive = documentación; GitHub = implementación; Airtable = operación viva; entorno cliente = producción. Revisar las fuentes actuales antes de cada cambio. Actualizar decisiones sólo si cambia una regla, estado si cambia materialmente, roadmap si cambia secuencia/dependencias, y registrar hitos en BITACORA. Ningún resultado de esta auditoría promociona los candidatos REVIEW.

## Consolidación de ramas · 30/09/2026

La rama original `reconcile/frontend-v1.0.4-source` avanzó sin force push desde `0ed29e1` hasta `5b8fbc1` (69 commits, sin divergencia). Un commit de preservación histórica `2d12588a` incorpora como ascendencia la antigua rama `tmp-b03-build` sin cambios en archivos ni runtime. `fix/session90-snapshot-invalidation-20260929`, `work/astra-session90-b04` y `tmp-b03-build` son referencias auxiliares pendientes de eliminación remota; nunca bases futuras. `main` permanece intacta. Master Index gobernante de Drive v1.38, ESTADO y BITACORA sincronizados; sin decisión nueva ni variación del ROADMAP. B02/B03 siguen REVIEW y los tres candidatos documentales no se promocionan.
