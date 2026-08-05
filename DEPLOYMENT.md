# Despliegue en Producción

Esta guía deja el proyecto accesible desde internet para compartirlo por WhatsApp.

## Estrategia de despliegue

| Componente | Plataforma | Plan |
|---|---|---|
| Backend Python (FastAPI) | **Render** | Gratis (Web Service) |
| Backend Geo (TypeScript) | **Render** | Gratis (Web Service) |
| Frontend (React/Vite) | **Vercel** | Gratis (Hobby) |

> **Render + Vercel** es la combinación recomendada. Ambas ofrecen planes gratuitos permanentes sin necesidad de tarjeta de crédito.

## 1. Subir el código a GitHub

Confirma que tus cambios están en GitHub antes de importar el proyecto:

```powershell
git add .
git commit -m "Prepare public deployment"
git push origin main
git push origin version-3
```

## 2. Backend en Render

### Opción A: Blueprint con render.yaml (recomendado)

1. Entra a https://dashboard.render.com/.
2. Haz clic en **New** → **Blueprint**.
3. Conecta el repositorio `Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos`.
4. Rama: `main` (o `version-5.7`).
5. Render detectará `render.yaml` y creará tres recursos:
   - Base de datos **PostgreSQL 16** (`sir-cusco-db`) — provisionada automáticamente.
   - `sir-cusco-api` (Python 3.11 / FastAPI) — `DATABASE_URL` se inyecta desde la base de datos.
   - `sir-cusco-geo` (Node.js 20 / TypeScript)
6. En la sección de variables de entorno, configura:
   - `JWT_SECRET` → una cadena larga y aleatoria (ej: `python -c "import secrets; print(secrets.token_hex(32))"`)
   - `DATABASE_URL` se conecta automáticamente desde `sir-cusco-db` (no se requiere configuración manual).
7. Espera a que todos los servicios queden en estado `Live`.
8. Copia las URLs públicas:
   - `https://sir-cusco-api.onrender.com`
   - `https://sir-cusco-geo.onrender.com`

Verifica:

```text
https://sir-cusco-api.onrender.com/api/health
https://sir-cusco-geo.onrender.com/health
```

El endpoint `/api/health` debe devolver `"connected": true`, `"database": "postgresql"` y `"mode": "production"`.

### Opción B: Web Services manuales

Si prefieres crear los servicios manualmente:

1. Entra a https://dashboard.render.com/ → **New** → **Web Service**.
2. Conecta el repositorio y selecciona la rama `main`.
3. Nombre: `sir-cusco-api`.
4. Runtime: **Python 3.11**.
5. Build Command:
   ```bash
   pip install -r backend-python/requirements.txt
   ```
6. Start Command:
   ```bash
   uvicorn app.main:app --app-dir backend-python --host 0.0.0.0 --port $PORT
   ```
7. Environment → agrega:
    - `JWT_SECRET` (sync: false, valor único)
    - `DATABASE_URL` → pega la Internal Database URL de tu base de datos PostgreSQL en Render.
    - `CORS_ORIGIN_REGEX`: `https://.*(\.vercel\.app|\.netlify\.app)`
   - `CORS_ORIGINS`: `http://localhost:5173,http://127.0.0.1:5173`
8. Repite para `sir-cusco-geo` con Runtime **Node.js 20**, Build Command `cd backend-typescript && npm install && npm run build`, Start Command `cd backend-typescript && npm start`.

## 3. Frontend en Vercel

1. Entra a https://vercel.com/new.
2. Importa el repositorio `Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos`.
3. Rama: `main` (o `version-3`).
4. Vercel usará `.vercelignore` para excluir el backend y `vercel.json` para la configuración de build:
   - **Framework Preset**: `Vite`
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/dist`
5. Agrega las variables de entorno **antes de desplegar**:
   ```text
   VITE_API_URL=https://sir-cusco-api.onrender.com/api
   VITE_GEO_URL=https://sir-cusco-geo.onrender.com
   ```
6. Despliega. La URL final será similar a:
   ```text
   https://sir-cusco.vercel.app
   ```

## 4. Ajustar CORS en Render

1. Ve a `sir-cusco-api` → **Environment**.
2. La variable `CORS_ORIGIN_REGEX` está configurada como `https://.*(\.vercel\.app|\.netlify\.app)`, lo que permite peticiones desde Vercel y Netlify.
3. Si usas un dominio personalizado, agrega la URL a `CORS_ORIGINS`.
4. Guarda cambios y espera el redeploy automático.

## Notas

- Render en plan gratuito puede dormir los servicios tras 15 minutos de inactividad; la primera carga puede tardar.
- El backend funciona en modo demo/memoria si no configuras PostgreSQL (sin `DATABASE_URL`).
- En producción, `render.yaml` provisiona PostgreSQL 16 automáticamente y el backend ejecuta `init_db()` al arranque para crear el esquema y cargar los datos semilla.
- Si más adelante agregas un dominio propio, actualiza `CORS_ORIGINS` en Render con la URL final del frontend.
- El `render.yaml` incluye una regex de CORS que permite tanto Vercel (`*.vercel.app`) como Netlify (`*.netlify.app`).
- Para más detalles sobre el despliegue en Netlify, consulta `NETLIFY-DEPLOYMENT.md`.
- Para más detalles sobre el despliegue en Render + Vercel, consulta `docs/DESPLIEGUE.md`.
