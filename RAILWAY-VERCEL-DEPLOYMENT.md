# Despliegue alternativo: Railway + Netlify (o Vercel)

> **Nota:** La estrategia de despliegue principal recomendada es **Render + Vercel**.
> Esta guía documenta Railway como alternativa si Render no está disponible.

## Arquitectura

```
Usuario
  ↓
Netlify (Frontend React/Vite)
  https://sir-cusco.netlify.app
  ↓  VITE_API_URL / VITE_GEO_URL
Railway (Backend FastAPI Python)
  https://sir-cusco-backend-production.up.railway.app
```

> **Nota:** Netlify es la opción gratuita recomendada (no requiere tarjeta).
> Vercel también funciona como alternativa si ya tienes una cuenta.

## URLs en producción

| Servicio | URL |
|---------|-----|
| Frontend (Netlify) | https://sir-cusco.netlify.app |
| Backend API (Railway) | https://sir-cusco-backend-production.up.railway.app |
| Health check | https://sir-cusco-backend-production.up.railway.app/api/health |
| Alertas | https://sir-cusco-backend-production.up.railway.app/api/alerts |

---

## Archivos de configuración agregados

### `Dockerfile` (raiz del repo)

Construye el backend FastAPI desde la subcarpeta `backend-python/`.
Se usa porque Railway con Nixpacks tenía conflictos al detectar
`package.json` (Node.js) y `requirements.txt` (Python) al mismo tiempo.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend-python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend-python/ .
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### `railway.toml` (raiz del repo)

Indica a Railway que use el Dockerfile como builder y configura
el health check del servicio.

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 60
restartPolicyType = "on_failure"
```

### `backend-python/railway.toml`

Configuracion alternativa para despliegue directo desde la subcarpeta
(si Railway se configura con Root Directory = backend-python).

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/health"
healthcheckTimeout = 60
restartPolicyType = "on_failure"
```

### `netlify.toml` (raiz del repo)

Indica a Netlify como construir el frontend desde la subcarpeta `frontend/`.

```toml
[build]
  base = "frontend"
  command = "npm install && npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> **Nota:** `vercel.json` fue eliminado del repositorio. Para Vercel, configura
> desde el dashboard: Framework Preset `Vite`, Root Directory `frontend`,
> Build Command `npm run build`, Output Directory `frontend/dist`.

### `.vercelignore` (raiz del repo)

Impide que Vercel detecte el backend Python y lo intente desplegar
junto al frontend (lo que causaba un error 401/404 al enrutar `/`
al servicio FastAPI en vez de al frontend).

```
backend-python/
backend-typescript/
database/
scripts/
docs/
.venv/
*.py
*.sql
render.yaml
railway.toml
Dockerfile
verify_system.py
```

---

## Proceso de despliegue paso a paso

### 1. Backend en Railway

**Herramienta:** Railway CLI (`@railway/cli`)

```powershell
# Instalar CLI
npm install -g @railway/cli

# Autenticarse (abre navegador con codigo de dispositivo)
railway login --browserless

# Vincular al proyecto existente "remarkable-vision" (vacio)
railway link --project "remarkable-vision"

# Crear servicio desde el repositorio de GitHub
railway add `
  --repo "Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos" `
   --branch "main" `
  --service "sir-cusco-backend" `
  --variables "CORS_ORIGIN_REGEX=https://.*(\.vercel\.app|\.netlify\.app)" `
  --json

# Generar dominio publico
railway domain --service "sir-cusco-backend" --json
```

**Problemas encontrados y soluciones:**

| Problema | Causa | Solución |
|---------|-------|---------|
| `Free plan resource provision limit exceeded` | Cuenta tenia 2 proyectos ocupando el limite | Se uso proyecto existente vacio (`remarkable-vision`) |
| `pip: command not found` | Nixpacks instala Python sin pip en PATH | Se cambio a Dockerfile con `python:3.11-slim` |
| `externally-managed-environment` | Nixpacks bloquea pip en entorno Nix | Se elimino `nixpacks.toml` y se uso Dockerfile |

**Resultado:** `Status: SUCCESS`

---

### 2. Frontend en Netlify (gratis, no Vercel)

**Herramienta:** Netlify (interfaz web)

1. Entra a https://app.netlify.com/ y conecta tu cuenta de GitHub.
2. Haz clic en **Add new site** → **Import an existing project**.
3. Selecciona el repositorio y la rama `main` (o `version-3`).
4. Netlify detectará `netlify.toml` automáticamente.
5. Agrega las variables de entorno **antes de desplegar** (Site settings → Build & deploy → Environment):

   ```text
   VITE_API_URL=https://sir-cusco-backend-production.up.railway.app/api
   VITE_GEO_URL=https://sir-cusco-backend-production.up.railway.app
   ```

   > **Importante:** Vite necesita estas variables en tiempo de compilación. Usa el
   > panel de Netlify, no flags del deploy.
6. Haz clic en **Deploy site**.
7. Comparte la URL final de Netlify:

   ```text
   https://sir-cusco.netlify.app
   ```

**Problemas encontrados y soluciones (Netlify):**

| Problema | Causa | Solución |
|---------|-------|---------|
| `Project name too long` | Nombre del directorio local tiene 100+ caracteres con tildes | No aplica a Netlify: se configura `netlify.toml` con `base = "frontend"` |
| Frontend muestra error de conexión con FastAPI | Variables `VITE_*` no configuradas o mal apuntan a la URL de Railway | Configurar `VITE_API_URL` y `VITE_GEO_URL` en Site settings → Environment |
| Netlify detecta backend Python y falla el build | El `netlify.toml` no especifica `base = "frontend"` correctamente | Verificar que `netlify.toml` tenga `base = "frontend"` y `publish = "dist"` |
| URL devuelve 404 en rutas client-side | Falta el redirect SPA | El `netlify.toml` incluye `[[redirects]] from = "/*" to = "/index.html" status = 200` |

**Resultado:** `readyState: READY` — https://sir-cusco.netlify.app

---

## Variables de entorno

### Railway (backend)

| Variable | Valor | Descripcion |
|---------|-------|-------------|
| `CORS_ORIGIN_REGEX` | `https://.*(\.vercel\.app|\.netlify\.app)` | Permite peticiones desde Netlify y Vercel |
| `PORT` | *(Railway la inyecta automaticamente)* | Puerto en que escucha uvicorn |

### Netlify (frontend — build-time)

| Variable | Valor | Descripcion |
|---------|-------|-------------|
| `VITE_API_URL` | `https://sir-cusco-backend-production.up.railway.app/api` | Base URL de la API REST |
| `VITE_GEO_URL` | `https://sir-cusco-backend-production.up.railway.app` | Base URL del servicio geo/alertas |

---

## Modo de operacion del backend

El backend corre en **modo demo** (sin base de datos PostgreSQL).
Todos los datos (zonas, camiones, rutas, reportes) vienen de
`MemoryStore` en `backend-python/app/main.py`.

El endpoint `/api/health` retorna:
```json
{
  "status": "ok",
  "database": "memory",
    "version": "3.0.0",
  "mode": "demo"
}
```

Para activar PostgreSQL, agregar en Railway la variable:
```
DATABASE_URL=postgresql://usuario:password@host:5432/sir_cusco
```
Railway puede crear una base de datos PostgreSQL integrada
desde el dashboard del proyecto.

---

## Duracion estimada del servicio gratuito

| Servicio | Plan | Duracion |
|---------|------|---------|
| Netlify | Hobby (gratis) | Permanente |
| Railway | Starter ($5 credito/mes) | ~3-4 semanas |

Cuando el credito de Railway se acabe, el backend se suspende
y el frontend mostrara el error de conexion.

**Alternativa gratuita permanente:** migrar el backend a Render.com
(el proyecto ya tiene `render.yaml` listo). El servicio en Render
se "duerme" tras 15 min de inactividad y tarda ~30 seg en la primera
peticion, pero nunca se suspende por credito.

---

## Como redesplegar

```powershell
# Subir cambios al repo
git add .
git commit -m "descripcion del cambio"
git push origin main
git push origin version-3

# Railway: redeploy automatico al detectar nuevo commit en GitHub
# Netlify: redeploy automatico al detectar nuevo commit en la rama configurada
```
