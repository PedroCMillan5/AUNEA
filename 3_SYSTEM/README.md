# AUNEA System

AUNEA System organiza sus activos técnicos por uso real.

## Taxonomía

- `01_PRODUCTOS/` — **Producto = se vende.** Implementaciones técnicas de soluciones comercializables e implantables para clientes.
- `02_HERRAMIENTAS/` — **Herramienta = se usa.** Software que AUNEA utiliza para analizar, operar, calcular, demostrar, configurar o entregar trabajo.
- `99_ARCHIVO_TECNICO/` — versiones técnicas sustituidas que se conservan únicamente como histórico.

## Simulador

El simulador AUNEA System es una **Herramienta**. La versión técnica vigente está en:

`3_SYSTEM/02_HERRAMIENTAS/simulador/AUNEA_System_Simulador_v3.html`

Las versiones v1 y v2 están en:

`3_SYSTEM/99_ARCHIVO_TECNICO/simulador/`

## AUNEA Internal

El runtime actual de AUNEA Internal (`backend/`, `frontend/` y `reconciliation/`) mantiene temporalmente sus rutas técnicas existentes para no romper CI, Block_ID, launchers ni referencias de la release REVIEW durante esta reorganización. Su clasificación/migración física se hará como cambio técnico separado y trazado; no altera la regla Producto/Herramienta de AUNEA System.

## Fuente de verdad

Google Drive gobierna documentación humana, comercial y activos de negocio. GitHub conserva código, schemas, engines, componentes y artefactos ejecutables.
