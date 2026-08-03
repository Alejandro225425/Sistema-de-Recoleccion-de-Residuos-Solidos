# AGENTS.md - Convenciones del Proyecto SIR Cusco

> **Versión:** 5.5.3
> **Rama de producción:** `main` y `version-5.5`

## Estructura del proyecto

```
sir-cusco/
├── frontend/                  # React + TypeScript + Vite (SPA)
├── backend-python/            # FastAPI REST API (Python 3.11)
├── backend-typescript/        # Servicio geo/alertas (Node.js 20 / Express)
├── database/                  # Esquema y datos PostgreSQL
│   ├── schema.sql             # Esquema de base de datos
│   ├── seed.sql               # Datos iniciales
│   ├── docker-compose.yml     # PostgreSQL local en contenedor
│   └── backup/                # Respaldos (.dump, .gitkeep)
├── scripts/                   # Scripts de arranque y despliegue
│   ├── start-all.ps1          # Inicia los 3 servicios localmente
│   ├── db-backup.ps1          # Respaldo de PostgreSQL
│   ├── db-restore.ps1         # Restauración de PostgreSQL
│   └── deploy-cloudflare.ps1  # Despliegue temporal con Cloudflare Tunnel
├── docs/                      # Documentación técnica y académica
│   ├── DESPLIEGUE.md          # Guía completa de despliegue
│   ├── entrega-2.md           # Informe académico
│   ├── diagrama-casos-uso.puml
│   └── diagrama-clases.puml
├── AGENTS.md                  # Este archivo
├── CHANGELOG.md               # Historial de cambios
├── VERSION.md                 # Versiones y características
├── README.md                  # Documentación principal
├── DEPLOYMENT.md              # Guía rápida de despliegue
├── Dockerfile                 # Build alternativo (Railway)
├── render.yaml                # Configuración Blueprint (Render)
├── railway.toml               # Configuración Railway (Dockerfile)
├── netlify.toml               # Configuración Netlify (frontend)
├── .vercelignore              # Exclusión de backend en Vercel
└── package.json               # Scripts raíz y utilidades
```

## Comandos de desarrollo

```powershell
# Iniciar todos los servicios localmente
npm run dev:all

# Verificación completa (build + tests)
npm run check:all

# Tests del backend
cd backend-python && .\.venv\Scripts\python.exe -m pytest -q

# Tests del frontend
cd frontend && npx vitest run

# Build de producción del frontend
cd frontend && npm run build

# Build del servicio geo
cd backend-typescript && npm run build
```

## Puertos por defecto

| Servicio | Puerto | URL |
|----------|--------|-----|
| Frontend Vite | 5173 | http://localhost:5173 |
| API FastAPI | 8000 | http://localhost:8000 |
| Geo/Alertas TS | 3100 | http://localhost:3100 |

## Convenciones de código

- **Python**: FastAPI, estilo PEP 8, tipado con Pydantic v2.
- **TypeScript**: strict mode, JSX con React 19, Vite como bundler.
- **Commits**: mensajes descriptivos en español, referenciando el componente afectado.
- **Documentación**: mantener `README.md`, `VERSION.md` y `CHANGELOG.md` sincronizados.

## Credenciales de demo

| Rol | Email | Password | Zona |
|-----|-------|----------|------|
| Admin | `admin@ecocusco.pe` | `admin123` | Centro Historico |
| Ciudadano | `ciudadano@ecocusco.pe` | `Test12345!` | Centro Historico |
| Operador | `operador@ecocusco.pe` | `Test12345!` | Wanchaq |
| Conductor | `conductor@ecocusco.pe` | `Test12345!` | Santiago |
| Admin | `admin2@ecocusco.pe` | `Test12345!` | San Sebastian |

- El sistema funciona en **modo memoria (demo)** sin `DATABASE_URL`.
- En **producción** (Render), `render.yaml` provisiona automáticamente una base de datos PostgreSQL 16 y el backend inicializa el esquema y datos semilla vía `init_db()` al arranque. Las cuentas y datos persisten en la base de datos real.
- Estas cuentas existen tanto en el backend local como en el backend de producción (Render).

## Despliegue

- **Recomendado:** Render (backend) + Vercel (frontend). Ver `docs/DESPLIEGUE.md`.
- **Alternativas:** Render + Netlify, Railway + Netlify, Koyeb + Vercel.
- **Temporal:** Cloudflare Tunnel (sin cuenta, URLs cambiantes).
