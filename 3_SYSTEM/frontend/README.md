# AUNEA Internal Frontend MVP v0.1

Frontend estático sin dependencias de build. Puede abrirse directamente o servirse con cualquier servidor HTTP.

## Ejecutar

```bash
python -m http.server 5173
```

Abrir `http://localhost:5173`.

Por defecto funciona en **mock mode**, por lo que es navegable aunque FastAPI no esté desplegado.

Para usar el backend real desde la consola del navegador:

```js
localStorage.setItem('aunea_mock','false')
localStorage.setItem('aunea_api','http://localhost:8000')
location.reload()
```

## Flujo incluido

Inicio → Engagement → Diagnóstico → Resultados → Recomendación → Scenario Comparator → Quote → Admin.

El frontend no contiene reglas de recomendación/economics/pricing; en modo real consume el backend v0.8.
