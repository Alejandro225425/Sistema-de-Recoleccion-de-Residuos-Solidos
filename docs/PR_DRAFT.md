# Draft PR: Proximity alerts: E2E tests, smoke script and staging docs

## Título
Proximity alerts: E2E tests, smoke script and staging docs

## Descripción (pegar en el cuerpo del PR)

Este PR agrega tests y utilidades para validar las alertas de proximidad en staging sin cambios de producción:

- `scripts/smoke_proximity_test.py` — script Python rápido para validar el flujo (login conductor → POST `track-location` → monitor → buscar notificación).
- `docs/STAGING.md` — guía para desplegar un entorno de staging y ejecutar el smoke-test.
- `frontend/e2e/proximity.spec.ts` — Playwright E2E que dispara una ubicación de conductor y verifica la notificación visible en el Dashboard del ciudadano.
- `frontend/playwright.config.js` — configuración de Playwright.
- `frontend/package.json` — script `test:e2e`.
- `.github/workflows/playwright-e2e.yml` — workflow que ejecuta Playwright E2E contra staging (usa secretos).
- `DEPLOYMENT.md` — documenté las variables de entorno `PROXIMITY_THRESHOLD_METERS` y `PROXIMITY_DEDUP_MINUTES`.

### Recomendaciones para reviewers

- Revisar `docs/STAGING.md` y `DEPLOYMENT.md` para validar los valores por defecto y recomendaciones operativas.
- Confirmar que los tests E2E son aceptables para CI (el workflow está configurado para `pull_request` y `workflow_dispatch`).

### Requisitos para CI

Agregar los siguientes secretos en GitHub → Settings → Secrets:

- `STAGING_API_URL` — URL base del API de staging (ej. `https://sir-cusco-api-staging.onrender.com/api`)
- `STAGING_FRONTEND_URL` — URL del frontend staging (ej. `https://sir-cusco-frontend-staging.vercel.app`)

### Comandos útiles

Usar GitHub CLI si la instalas:

```bash
gh pr create --base main --head feature/proximity-e2e --title "Proximity alerts: E2E tests, smoke script and staging docs" --body "<pega la descripción aquí>" --draft
```

Abrir el PR en el navegador:

https://github.com/Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos/compare/main...feature/proximity-e2e?expand=1

---
Si quieres, intento crear el PR automáticamente cuando instales `gh` o me des el permiso para usar otra integración. ¿Lo intento ahora si instalas `gh`? 
