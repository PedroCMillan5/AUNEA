# AUNEA Internal v1.0

Status: REVIEW / frontend funcional local  
Date: 2026-09-09

## Fuente de verdad

El frontend vive en GitHub. Las reglas de negocio no.

La captura canónica procede de:
`AUNEA_DIAGNOSTIC_DATABASE_v0.9_DIAGNOSTIC_MASTER_V1.xlsx`

Drive conserva el workbook canónico y el artefacto ZIP de revisión. El frontend consume una exportación estructurada del Diagnostic Master para construir la UI, pero no define preguntas, pricing, recommendation, economics ni risk rules.

## Qué incluye v1.0

- CRM local de revisión: empresas, contactos y estado comercial.
- Estudios/engagements históricos por contacto y empresa.
- Biblioteca de proyectos vinculados a engagements.
- Diagnóstico de 90 minutos schema-driven.
- 100 campos canónicos en español con objetivo, control, ejemplo, requiredness y reutilización.
- Editor estructurado de pasos del proceso.
- Fricciones vinculadas a uno o varios pasos.
- Revisión visual del AS-IS con edición in situ y confirmación.
- Captura estructurada de riesgos e inputs económicos.
- Results / Recommendation / Scenarios / Quote preparados para consumir backend v1.1.
- Guardado local explícito y auditoría básica de cambios.

## Regla de cálculo

El navegador no replica los motores de negocio. Pain, Economics, Risk, Recommendation, Scenario y Pricing oficiales sólo se muestran cuando se reciben de AUNEA Backend.

## Ejecutar localmente

```bash
python -m http.server 5180
```

Abrir `http://localhost:5180`.

En el paquete distribuido existe también `run.bat` para Windows.

## Estado

v1.0 es `REVIEW`, no `PRODUCTION`. Falta QA funcional con usuario, conexión completa del contrato de captura al backend, persistencia productiva/AUNEA Operations, autenticación y pilotaje real de los 90 minutos.
