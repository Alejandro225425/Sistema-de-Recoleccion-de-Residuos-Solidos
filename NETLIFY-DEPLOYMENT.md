# Despliegue alternativo: Render (backend) + Netlify (frontend)

> **Nota:** La estrategia de despliegue principal recomendada es **Render + Vercel**.
> Esta guía documenta Netlify como **alternativa gratuita** al frontend en Vercel.

Esta guía despliega el proyecto usando **Render** para los backends (FastAPI + servicio geo)
y **Netlify** para el frontend React/Vite. Ambos tienen planes gratuitos permanentes.

## Arquitectura

```
Usuario
  ↓
Netlify (Frontend React/Vite)
  https://sir-cusco.netlify.app
  ↓  VITE_API_URL / VITE_GEO_URL
Render (Backend FastAPI Python)
  https://sir-cusco-api.onrender.com
Render (Servicio Geo Node.js)
  https://sir-cusco-geo.onrender.com
```

## URLs en producción

| Servicio | URL |
|---------|-----|
| Frontend (Netlify) | https://sir-cusco.netlify.app |
| Backend API (Render) | https://sir-cusco-api.onrender.com |
| Geo Service (Render) | https://sir-cusco-geo.onrender.com |
| Health check API | https://sir-cusco-api.onrender.com/api/health |
| Health check Geo | https://sir-cusco-geo.onrender.com/health |
| Alertas | https://sir-cusco-geo.onrender.com/alerts |

---

## 1. Subir el código a GitHub

Confirma que tus cambios están en GitHub antes de importar:

```powershell
git add .
git commit -m "Prepare public deployment"
git push origin main
git push origin v2.0.0
```

## 2. Backend en Render

El archivo `render.yaml` ya está configurado para crear dos servicios:
- `sir-cusco-api` (FastAPI Python)
- `sir-cusco-geo` (Node.js geo service)

### Pasos:

1. Entra a https://dashboard.render.com/
2. Haz clic en **New** → **Blueprint**
3. Conecta el repositorio `Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos`
4. Selecciona la rama `main` (o `v2.0.0`).
5. Render detectará `render.yaml` y creará ambos servicios automáticamente
6. En el paso de configuración, establece la variable de entorno:
   - `JWT_SECRET` → una cadena larga y aleatoria (ej: `openssl rand -hex 32`)
7. Espera a que ambos servicios muestren estado `Live`

### Verificación:

```text
https://sir-cusco-api.onrender.com/api/health
https://sir-cusco-geo.onrender.com/health
```

## 3. Frontend en Netlify

### Pasos:

1. Entra a https://app.netlify.com/
2. Haz clic en **Add new site** → **Import an existing project**
3. Conecta tu cuenta de GitHub y selecciona el repositorio
4. En **Branch to deploy**, escribe: `main` (o `v2.0.0`).
5. Netlify detectará `netlify.toml` automáticamente
6. Antes de desplegar, agrega las variables de entorno (Build & deploy settings → Environment):

| Variable | Valor | Descripción |
|---------|-------|-------------|
| `VITE_API_URL` | `https://sir-cusco-api.onrender.com/api` | Base URL de la API REST |
| `VITE_GEO_URL` | `https://sir-cusco-geo.onrender.com` | Base URL del servicio geo |

7. Haz clic en **Deploy site**

Al terminar, Netlify te dará una URL como:

```text
https://sir-cusco.netlify.app
```

## 4. Compartir por WhatsApp

Comparte la URL final de Netlify:

```text
https://sir-cusco.netlify.app
```

---

## Notas

- **Render (plan gratuito):** los servicios pueden "dormir" tras 15 minutos de inactividad.
  La primera carga puede tardar ~30 segundos. Nunca se suspenden por agotar crédito.
- **Netlify (plan gratuito):** hospedaje estático permanente, sin límites de tiempo.
- **Modo demo:** el backend funciona con `MemoryStore` si no configuras PostgreSQL.
  El endpoint `/api/health` retorna `"database": "memory"` y `"mode": "demo"`.
- **PostgreSQL:** si más adelante agregas una base de datos, configura `DATABASE_URL`
  en el dashboard de Render como variable de entorno.
- **CORS:** el `render.yaml` incluye una regex que permite tanto dominios de
  Netlify (`*.netlify.app`) como de Vercel (`*.vercel.app`).

## Como redesplegar

```powershell
git add .
git commit -m "descripcion del cambio"
git push origin main
git push origin v2.0.0
```

- **Render:** redeploy automático al detectar el nuevo commit en GitHub.
- **Netlify:** también redeploy automático al hacer push a la rama configurada.
