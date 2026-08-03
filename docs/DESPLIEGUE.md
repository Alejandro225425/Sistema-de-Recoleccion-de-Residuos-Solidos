# 📦 Documentación de Despliegue
## Sistema Inteligente de Recolección de Residuos Sólidos — Cusco

> **Rama de producción:** `main`
> **Versión:** `3.0.0`
> **Repositorio:** [`Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos`](https://github.com/Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos)
> **Última actualización:** 2026-07-30
> **Estado actual:** Proyecto organizado y documentación consolidada. Render + Vercel (recomendado). Cloudflare Tunnel para demos temporales.

---

## Índice

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Opción A — Cloudflare Tunnel (local, temporal)](#2-opción-a--cloudflare-tunnel-local-temporal)
3. [Opción B — Render (backend) + Vercel (frontend) — RECOMENDADA](#3-opción-b--render-backend--vercel-frontend--recomendada)
4. [Opción C — Render (backend) + Netlify (frontend)](#4-opción-c--render-backend--netlify-frontend)
5. [Opción D — Railway (backend) + Netlify (frontend)](#5-opción-d--railway-backend--netlify-frontend)
6. [Variables de entorno](#6-variables-de-entorno)
7. [Verificación de salud](#7-verificación-de-salud)
8. [Flujo de actualización](#8-flujo-de-actualización)
9. [Historial de despliegues](#9-historial-de-despliegues)
10. [Problemas conocidos y soluciones](#10-problemas-conocidos-y-soluciones)
11. [Notas y limitaciones](#11-notas-y-limitaciones)

---

## 1. Arquitectura del sistema

El sistema está compuesto por **tres servicios independientes**:

```
┌──────────────────────────────────────────────────────┐
│                   INTERNET / USUARIO                 │
└──────────────────────┬───────────────────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │     FRONTEND (React/Vite)  │
          │   Vercel / localhost:5173  │
          └──────┬──────────┬──────────┘
                 │          │
    ┌────────────▼──┐   ┌───▼───────────────────┐
    │  API Python   │   │  Servicio Geo (TS)    │
    │  FastAPI      │   │  Express/TypeScript   │
    │  puerto 8000  │   │  puerto 3001 / 3100   │
    └───────────────┘   └───────────────────────┘
```

| Servicio       | Tecnología              | Puerto local | Plataforma cloud recomendada |
|---------------|------------------------|-------------|------------------------------|
| Frontend       | React + TypeScript + Vite | 5173     | **Vercel** (gratis, permanente) |
| Backend Python | FastAPI (Python / uvicorn)| 8000     | Render (gratis)              |
| Backend Geo    | Express (TypeScript)      | 3001–3100| Render (gratis)              |

---

## 2. Opción A — Cloudflare Tunnel (local, temporal)

Esta opción expone los servicios locales a internet **sin abrir puertos del router ni crear cuentas**.
Las URLs **cambian** cada vez que se reinicia `cloudflared`.

### Requisitos previos

- `cloudflared.exe` descargado en `scripts\cloudflared.exe` (incluido en el repositorio).
- Los tres servicios corriendo localmente.
- PowerShell con política de ejecución habilitada:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
  ```

### Iniciar todos los servicios y túneles (script automático)

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\deploy-cloudflare.ps1"
```

El script levanta los tres servicios y abre tres túneles. Las URLs quedan guardadas en `CLOUDFLARE-URLS.txt`.

### Iniciar manualmente (alternativa)

```powershell
# Terminal 1 — Backend Python
cd backend-python
..\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Backend Geo (TypeScript)
cd backend-typescript
npm run dev

# Terminal 3 — Frontend
cd frontend
npm run dev

# Terminal 4 — Túnel Frontend
scripts\cloudflared.exe tunnel --url http://localhost:5173

# Terminal 5 — Túnel API Python
scripts\cloudflared.exe tunnel --url http://localhost:8000

# Terminal 6 — Túnel Geo TS
scripts\cloudflared.exe tunnel --url http://localhost:3001
```

### URLs obtenidas en la sesión del 2026-06-18

```
FRONTEND:   https://concern-waters-criticism-shared.trycloudflare.com
API Python: https://experiencing-styles-emails-nutritional.trycloudflare.com
            /docs      → Swagger UI
            /api/health → health check
Geo TS:     https://except-associates-stops-rays.trycloudflare.com
            /api/truck-locations
```

> ⚠️ URLs **temporales**. Cambian al reiniciar `cloudflared` y solo funcionan mientras el equipo local esté encendido.

---

## 3. Opción B — Render (backend) + Vercel (frontend) — RECOMENDADA

Render y Vercel ofrecen planes gratuitos permanentes sin necesidad de tarjeta de crédito.
Esta es la combinación principal del proyecto.

### 3.1 Backend Python en Render (Web Service)

1. Entra a https://dashboard.render.com/ → **New** → **Web Service**.
2. Conecta el repositorio `Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos`.
3. Rama: `main` (o `version-3`).
4. Nombre: `sir-cusco-api`.
5. Runtime: **Python 3.11**.
6. Plan: **Free**.
7. Build Command:
   ```bash
   pip install -r backend-python/requirements.txt
   ```
8. Start Command:
   ```bash
   uvicorn app.main:app --app-dir backend-python --host 0.0.0.0 --port $PORT
   ```
9. En **Environment**, agrega:
   - `JWT_SECRET`: genera un string robusto único (mínimo 32 caracteres aleatorios).
   - `DATABASE_URL`: pega la Internal Database URL si creaste PostgreSQL (opcional).
   - `CORS_ORIGIN_REGEX`: `https://.*(\.vercel\.app|\.netlify\.app)`
   - `CORS_ORIGINS`: `http://localhost:5173,http://127.0.0.1:5173`
10. Crea el servicio y espera a que quede **Live**.
11. Anota la URL pública:
    ```
    https://sir-cusco-api.onrender.com
    ```

**Verificar:**
```
GET https://sir-cusco-api.onrender.com/api/health
```

### 3.2 Backend Geo en Render (Web Service)

1. Entra a https://dashboard.render.com/ → **New** → **Web Service**.
2. Conecta el mismo repositorio.
3. Rama: `main` (o `version-3`).
4. Nombre: `sir-cusco-geo`.
5. Runtime: **Node.js 20**.
6. Plan: **Free**.
7. Build Command:
   ```bash
   cd backend-typescript && npm install && npm run build
   ```
8. Start Command:
   ```bash
   cd backend-typescript && npm start
   ```
9. Crea el servicio y espera a que quede **Live**.
10. Anota la URL pública:
    ```
    https://sir-cusco-geo.onrender.com
    ```

**Verificar:**
```
GET https://sir-cusco-geo.onrender.com/health
```

### 3.3 Frontend en Vercel

1. Entra a https://vercel.com/new → importa el repositorio.
2. Rama: `main` (o `version-3`).
3. Vercel usará `.vercelignore` para excluir el backend y `vercel.json` para la configuración de build:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Agrega las variables de entorno **antes de desplegar**:
   ```
   VITE_API_URL = https://sir-cusco-api.onrender.com/api
   VITE_GEO_URL = https://sir-cusco-geo.onrender.com
   ```
5. Clic en **Deploy**.
6. Anota la URL final de Vercel:
   ```
   https://sir-cusco.vercel.app
   ```

### 3.4 Ajustar CORS en Render

1. Ve a `sir-cusco-api` → **Environment**.
2. La variable `CORS_ORIGIN_REGEX` ya está configurada como `https://.*(\.vercel\.app|\.netlify\.app)`.
3. Si usas un dominio personalizado, actualiza `CORS_ORIGINS` con la URL final del frontend.
4. Guarda cambios y espera el redeploy automático.

---

## 4. Opción C — Render (backend) + Netlify (frontend)

Si prefieres Netlify para el frontend (también gratis), la configuración es similar. El `render.yaml`
ya incluye la regex de CORS para ambas plataformas.

### 4.1 Backend en Render (Blueprint o Web Services manuales)

Puedes usar el Blueprint con `render.yaml` o crear Web Services manuales siguiendo
los pasos de la sección 3.1 y 3.2.

### 4.2 Frontend en Netlify

1. Entra a https://app.netlify.com/ → **Add new site** → **Import an existing project**.
2. Conecta tu cuenta de GitHub y selecciona el repositorio.
3. Rama a desplegar: `main` (o `version-3`).
4. Netlify detectará `netlify.toml` automáticamente. El build command será:
   ```
   npm install && npm run build
   ```
   y el publish directory será `dist` (relativo a `frontend/`).
5. Agrega las variables de entorno **antes de desplegar** (Site settings → Build & deploy → Environment):
   ```
   VITE_API_URL = https://sir-cusco-api.onrender.com/api
   VITE_GEO_URL = https://sir-cusco-geo.onrender.com
   ```
6. Clic en **Deploy site**.
7. Anota la URL final de Netlify:
   ```
   https://sir-cusco.netlify.app
   ```

---

## 5. Opción D — Railway (backend) + Netlify (frontend)

Railway se usa como alternativa si Render no está disponible. El backend Python ya tiene `railway.toml` configurado.

### 5.1 Backend en Railway

1. Ir a https://railway.app/ → **New Project → Deploy from GitHub**.
2. Seleccionar el repositorio y la rama `main`.
3. Railway detecta `railway.toml` (root) o `backend-python/railway.toml` automáticamente.
4. Configurar variables de entorno:
   - `JWT_SECRET`: string robusto único.
   - `DATABASE_URL`: opcional.
   - `CORS_ORIGIN_REGEX`: `https://.*(\.vercel\.app|\.netlify\.app)`
5. Desplegar → Railway genera URL tipo:
   ```
   https://sir-cusco-api.up.railway.app
   ```
   > **Nota:** Railway incluye $5 de crédito mensual. Si se agota, el servicio se suspende.

### 5.2 Frontend en Netlify

Mismos pasos que en la sección 4.2, usando las URLs de Railway:
```
VITE_API_URL = https://sir-cusco-api.up.railway.app/api
VITE_GEO_URL = https://sir-cusco-api.up.railway.app
```

> **Nota:** En este setup, el backend FastAPI también sirve las rutas geo (`/api/alerts`, `/api/truck-locations`, `/api/eta`), por lo que `VITE_GEO_URL` apunta a la misma base del API.

---

## 6. Variables de entorno

### Backend Python

| Variable            | Descripción                                   | Valor en producción                   |
|--------------------|-----------------------------------------------|---------------------------------------|
| `CORS_ORIGINS`      | Lista de URLs permitidas (separadas por `,`)  | `http://localhost:5173`               |
| `CORS_ORIGIN_REGEX` | Regex para permitir dominios de Vercel/Netlify | `https://.*(\.vercel\.app\|\.netlify\.app)` |
| `DATABASE_URL`      | URL de PostgreSQL (opcional)                  | `postgresql://user:pass@host/db`      |
| `JWT_SECRET`        | Secreto para firmar tokens JWT (obligatorio en producción) | Genera un string robusto único |

### Frontend (`frontend/.env.production` o variables en Vercel)

| Variable       | Descripción                      | Valor de ejemplo                               |
|---------------|----------------------------------|------------------------------------------------|
| `VITE_API_URL` | URL base de la API Python        | `https://sir-cusco-api.onrender.com/api`       |
| `VITE_GEO_URL` | URL del servicio Geo             | `https://sir-cusco-geo.onrender.com`           |

---

## 7. Verificación de salud

Después de cualquier despliegue, verifica estos endpoints:

```
# API Python
GET /api/health           → { "status": "ok", "database": "memory", "mode": "demo" }
GET /docs                 → Swagger UI interactivo

# Servicio Geo (TypeScript)
GET /health               → { "status": "ok", "service": "geo-alerts" }
GET /api/truck-locations  → Posiciones GPS de camiones en tiempo real
```

## 7.1 Pruebas de despliegue

- Validar el frontend con `npx vitest run`: `11 passed`.
- Validar el backend Python con `pytest -q`: `16 passed`.
- Ejecutar `npm run build` para confirmar el build de producción del frontend.
- Confirmar envíos operativos y CRUD administrativos a través de la UI del panel de administración.

---

## 8. Flujo de actualización

```powershell
git add .
git commit -m "descripcion del cambio"
git push origin main
git push origin version-3
```

| Plataforma          | Comportamiento ante un push        |
|--------------------|------------------------------------|
| **Vercel**          | Redespliega automáticamente       |
| **Render**          | Redespliega automáticamente       |
| **Netlify**         | Redespliega automáticamente       |
| **Railway**         | Redespliega automáticamente       |
| **Cloudflare Tunnel** | Requiere reiniciar el script manualmente |

---

## 9. Historial de despliegues

### 2026-07-30 — Sesión 8: Versión 3.0.0 — Organización y consolidación

- **Rama de producción:** `main` y `version-3`
- **Versión:** `3.0.0`
- **Acciones completadas:**
  - Eliminado `scripts/cloudflared.exe` (54 MB) y `CLOUDFLARE-URLS.txt` (URLs obsoletas)
  - Corregido `.vercelignore` (removida referencia a `nixpacks.toml` inexistente)
  - Reforzado `.gitignore` con exclusiones de binarios (`*.exe`, `*.bin`)
  - Versiones sincronizadas a `3.0.0` en `package.json` (raíz, frontend, backend-typescript), `backend-python/app/main.py` y `backend-python/tests/test_operational_logic.py`
  - Actualizada toda la documentación a versión 3.0.0
  - Creada rama `version-3` en GitHub
- **Estado:** ✅ Proyecto organizado, documentación consolidada y listo para despliegue.

### 2026-07-30 — Sesión 7: Configuración definitiva Render + Vercel

- **Rama de producción:** `main` y `v2.0.0`
- **Versión:** `2.0.0`
- **Plataformas:** Render (backend) + Vercel (frontend) — **recomendado**
- **Archivos creados/actualizados:**
  - `render.yaml` — añadida `DATABASE_URL` como `sync: false` (opcional para PostgreSQL)
  - `frontend/.env.production` — actualizada con URLs de Render como referencia
  - `DEPLOYMENT.md` — reescrita con Render + Vercel como estrategia primaria
  - `docs/DESPLIEGUE.md` — actualizada con Render + Vercel como Opción B (recomendada)
  - `README.md` — actualizada con estado de despliegue Render + Vercel
  - `VERSION.md` — actualizada con rutas de despliegue Render + Vercel
  - `CHANGELOG.md` — registrado el hito
- **Estado:** ✅ Configuración lista. Render despliega backend vía Blueprint o Web Services. Vercel despliega frontend con configuración de dashboard.

### 2026-07-30 — Sesión 6: Despliegue Render + Netlify (configuración lista)

- **Rama de producción:** `version-1-proyecto`
- **Versión:** `2.0.0`
- **Plataformas:** Render (backend) + Netlify (frontend)
- **Archivos creados/actualizados:**
  - `render.yaml` — actualizada `CORS_ORIGIN_REGEX` a `https://.*(\.vercel\.app|\.netlify\.app)`
  - `netlify.toml` — creado con configuración de build y redirects SPA
  - `NETLIFY-DEPLOYMENT.md` — guía paso a paso para despliegue en Netlify
  - `DEPLOYMENT.md` — actualizado con opción Netlify
  - `docs/DESPLIEGUE.md` — actualizado con opciones Render+Netlify y Render+Vercel
  - `README.md` — actualizado con estado de despliegue
  - `CHANGELOG.md` — registrado el hito
- **Estado:** ✅ Configuración lista.

### 2026-07-30 — Sesión 4: Configuración de despliegue lista para v2.0.0

- **Rama:** `v2.0.0-deploy-config`
- **Versión:** `2.0.0`
- **Archivos actualizados:**
  - `render.yaml` — se añadió `JWT_SECRET` como variable de entorno (`sync: false`)
  - `backend-python/.env.example` — se incluyó `JWT_SECRET` para referencia de producción
  - `backend-python/.env` — se añadió `JWT_SECRET` con valor de desarrollo
  - `docs/DESPLIEGUE.md` — se actualizó la tabla de variables de entorno
  - `CHANGELOG.md` — se registró el hito
  - `README.md` — se actualizó la versión y el estado de despliegue
  - `VERSION.md` — se registró la versión 2.0.0
- **Estado:** ✅ Configuración de despliegue lista.

### 2026-07-30 — Sesión 5: Checklist de despliegue en producción

Checklist para completar el despliegue de la rama `main` (o `version-3`):

#### Plataforma A: Render (backend) + Vercel (frontend) — RECOMENDADA

**Backend (Render):**
1. Ir a https://dashboard.render.com/ → **New** → **Web Service**.
2. Conectar el repositorio `Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos`.
3. Rama: `main`.
4. Nombre: `sir-cusco-api`.
5. Runtime: **Python 3.11**.
6. Build Command: `pip install -r backend-python/requirements.txt`
7. Start Command: `uvicorn app.main:app --app-dir backend-python --host 0.0.0.0 --port $PORT`
8. Environment → configurar:
   - `JWT_SECRET`: string robusto único (mínimo 32 caracteres).
   - `DATABASE_URL`: opcional para persistencia.
   - `CORS_ORIGIN_REGEX`: `https://.*(\.vercel\.app|\.netlify\.app)`
   - `CORS_ORIGINS`: `http://localhost:5173,http://127.0.0.1:5173`
9. Crear servicio y esperar estado **Live**.
10. Anotar URL pública: `https://sir-cusco-api.onrender.com`

Repetir para `sir-cusco-geo`:
1. Nombre: `sir-cusco-geo`.
2. Runtime: **Node.js 20**.
3. Build Command: `cd backend-typescript && npm install && npm run build`
4. Start Command: `cd backend-typescript && npm start`
5. Anotar URL: `https://sir-cusco-geo.onrender.com`

**Frontend (Vercel):**
1. Ir a https://vercel.com/new → importar el mismo repositorio.
2. Rama: `main`.
3. Configurar desde el `vercel.json` del repositorio:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Agregar variables de entorno **antes de desplegar**:
   ```
   VITE_API_URL = https://sir-cusco-api.onrender.com/api
   VITE_GEO_URL = https://sir-cusco-geo.onrender.com
   ```
5. Clic en **Deploy**.
6. Anotar URL final: `https://sir-cusco.vercel.app`

**Post-despliegue:**
1. Verificar `/api/health` → debe devolver `"mode": "demo"` (si `DATABASE_URL` no está configurada).
2. Verificar login con `admin@ecocusco.pe` / `admin123`.
3. Verificar dashboard, mapa y paneles en la URL de Vercel.
4. Verificar CORS: no hay errores en consola del navegador.

#### Checklist de verificación post-despliegue

- [ ] `/api/health` devuelve `"status": "ok"` y `"mode": "demo"` (si `DATABASE_URL` no está configurada).
- [ ] Login con `admin@ecocusco.pe` / `admin123` funciona correctamente.
- [ ] Frontend carga el dashboard, mapa y paneles sin errores.
- [ ] Reportes se pueden crear y listar.
- [ ] Panel administrativo carga zonas, horarios, camiones y mantenimiento.
- [ ] Filtros de búsqueda por conductor y por estado funcionan.
- [ ] Exportación a CSV y PDF funciona desde reportes y analytics.
- [ ] CORS permite el dominio de Vercel (no hay errores en consola del navegador).

---

## 10. Problemas conocidos y soluciones

| Problema | Causa | Solución aplicada |
|---------|-------|-------------------|
| `cloudflared` no encontrado en PATH | Instalado con `winget` pero sesión de PowerShell no refrescada | Descargar `.exe` directamente a `scripts\` |
| `npm` bloqueado por PowerShell | Política de ejecución restrictiva | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Puerto 5173/5174 ocupado | Procesos anteriores de Vite activos | Vite auto-seleccionó puerto 5175 |
| Vite bloquea host externo | `allowedHosts` no configurado | Añadir `allowedHosts: true` en `vite.config.ts` |
| Script falla con ruta con espacios | El nombre de la carpeta del proyecto contiene espacios y tildes | Script v2: copiar `cloudflared.exe` a `%TEMP%` y usar scripts helper en carpeta sin espacios |
| Koyeb pide tarjeta de crédito | Verificación de cuenta en plan gratuito | Alternativas: Render (sin tarjeta) o Railway |

---

## 10.1 Troubleshooting Render

### Error: `Exited with status 1 while building your code`

Este error ocurre cuando el build falla en Render. Causas y soluciones:

**Causa 1: Runtime de Python incorrecto**
- **Síntoma:** El build falla inmediatamente con error de Python.
- **Solución:** En el Web Service manual, configura **Runtime** como `Python 3.11` (no `Python` genérico). Render necesita una versión específica.

**Causa 2: Root Directory o comandos mal escritos**
- **Síntoma:** Render no encuentra `requirements.txt` o `app/main.py`.
- **Solución:** Asegúrate de que **Root Directory** esté vacío (por defecto) o sea `.` (raíz del repo). Los comandos deben ser exactamente:
  - Build Command: `pip install -r backend-python/requirements.txt`
  - Start Command: `uvicorn app.main:app --app-dir backend-python --host 0.0.0.0 --port $PORT`

**Causa 3: Variables de entorno faltantes**
- **Síntoma:** El build pasa pero el servicio no inicia.
- **Solución:** Verifica que `JWT_SECRET` esté configurado. Sin esta variable, el backend puede fallar al iniciar.

**Causa 4: Plan Free sin recursos**
- **Síntoma:** Build lento o timeout.
- **Solución:** Render Free tiene límites. Si el build tarda más de 15 minutos, prueba a usar una región más cercana o reduce dependencias.

### Logs para diagnosticar

1. Ve al servicio en Render → **Logs**
2. Filtra por **Build logs**
3. Busca líneas que empiecen con `ERROR` o `Failed`
4. Si ves `ModuleNotFoundError`, faltan dependencias
5. Si ves `FileNotFoundError`, revisa las rutas de archivos

---

## 10.2 Troubleshooting Vercel

### Error: Vercel detecta el backend Python y falla el build

- **Causa:** Vercel intenta instalar dependencias de Python en la raíz del repo.
- **Solución:** El archivo `vercel.json` en la raíz del repositorio configura automáticamente el build en Vercel:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Error: build falla con TypeScript (`Property 'performance' does not exist on type 'Bootstrap'`)

- **Causa:** El tipo `Bootstrap` no incluye la propiedad `performance`, pero el dashboard/analytics la usa.
- **Solución aplicada:** Se corrigió `frontend/src/types.ts` agregando `performance` como propiedad opcional en `Bootstrap`.
- **Estado:** Corregido en commit `f43ea0c` y listo para redeploy en Vercel.

### Error: `npm run build` falla en Vercel pero funciona localmente

- **Causa:** Dependencias distintas o lockfile desactualizado.
- **Solución:** Asegúrate de que `frontend/package-lock.json` esté subido al repositorio. Si no existe, ejecuta `npm install` en `frontend/` y haz commit del lockfile.

### Error: Variables `VITE_*` no están disponibles en el build

- **Causa:** Las variables de entorno deben estar configuradas **antes** del primer deploy.
- **Solución:** Ve a Project Settings → Environment Variables. Agrega `VITE_API_URL` y `VITE_GEO_URL`, luego haz clic en **Deploy** nuevamente.

### Logs para diagnosticar

1. Ve al proyecto en Vercel → **Deployments** → clic en el deployment fallido.
2. Revisa la pestaña **Build Logs**.
3. Busca líneas que empiecen con `ERROR` o `Failed`.
4. Si el error es de TypeScript, revisa que no haya tipos desactualizados después de cambios recientes.

---

## 10.3 Troubleshooting Netlify (alternativa)

### Error: Build falla con `npm install` o `npm run build`

- **Causa:** Dependencias no instaladas o lockfile faltante.
- **Solución:** Asegúrate de que `frontend/package-lock.json` esté en el repositorio. Si no existe, ejecuta `npm install` en `frontend/` y haz commit.

### Error: `Cannot find module` al importar Leaflet

- **Causa:** Vite no resuelve Leaflet correctamente en build de producción.
- **Solución:** El `netlify.toml` incluye `[build.processing.javascript] bundle = true` que fuerza el bundling correcto.

### Error: SPA devuelve 404 en rutas client-side

- **Causa:** Netlify no reescribe todas las rutas a `index.html`.
- **Solución:** El `netlify.toml` incluye el redirect `[[redirects]] from = "/*" to = "/index.html" status = 200`.

### Error: Las variables `VITE_*` no están disponibles en el build

- **Causa:** Las variables de entorno deben estar configuradas **antes** del primer deploy.
- **Solución:** Ve a Site settings → Build & deploy → Environment → Environment variables. Agrega `VITE_API_URL` y `VITE_GEO_URL`, luego haz clic en **Trigger deploy** → **Deploy site**.

---

## 11. Notas y limitaciones

### Cloudflare Tunnel
- Completamente **gratuito y sin registro** (modo Quick Tunnel con `trycloudflare.com`).
- URLs aleatorias y temporales — **cambian** cada vez que se reinicia `cloudflared`.
- Requiere que el equipo local **esté encendido y con conexión** permanente.
- Ideal para demostraciones rápidas o compartir por WhatsApp temporalmente.

### Render (plan gratuito)
- Los servicios se **duermen** tras 15 min de inactividad.
- La primera petición tras el sueño tarda **30–60 segundos**.
- Para mantenerlos activos: usar https://uptimerobot.com/ con ping cada 5 min.

### Vercel (plan gratuito)
- Hospedaje estático **permanente** sin límite de tiempo.
- Incluye 100 GB de bandwidth y 125,000 build seconds/mes.
- Deploy automático al hacer push a la rama configurada.

### Netlify (plan gratuito)
- Hospedaje estático **permanente** sin límite de tiempo.
- Incluye 100 GB de bandwidth y 300 build minutes/mes.
- Deploy automático al hacer push a la rama configurada.

### Railway (plan gratuito)
- Incluye $5 de crédito mensual — suficiente para uso ligero.
- Sin límite de sueño (siempre activo dentro del crédito).

### Koyeb (plan gratuito)
- Puede requerir **tarjeta de crédito** para validación.
- Si no se quiere ingresar tarjeta, usar **Render** o **Railway**.

### Base de datos
- El backend opera en **modo demo / memoria** si `DATABASE_URL` no está configurada.
- Para persistencia real: usar [Supabase](https://supabase.com/), [Neon](https://neon.tech/) o [Railway PostgreSQL](https://railway.app/).
- Render ofrece PostgreSQL gratuito (90 MB, 10 conexiones) desde su dashboard.

### CORS
- `render.yaml` incluye `CORS_ORIGIN_REGEX: https://.*(\.vercel\.app|\.netlify\.app)` que permite ambos dominios.
- Al agregar un dominio propio, actualiza `CORS_ORIGINS` en la plataforma del backend.

---
