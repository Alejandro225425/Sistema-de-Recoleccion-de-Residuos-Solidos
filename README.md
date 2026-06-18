# EcoCusco - Gestion Ambiental Urbana

Sistema inteligente para la recoleccion de residuos solidos segregados en la ciudad del Cusco. El proyecto integra un frontend React, una API principal en FastAPI y un microservicio TypeScript para alertas/geolocalizacion.

## Estado

- MVP funcional en modo demo sin base de datos.
- Interfaz responsive para computadora, tablet y celular.
- API preparada para trabajar con PostgreSQL mediante `DATABASE_URL`.
- Mapa operativo con Leaflet/OpenStreetMap.

## Arquitectura

```text
backend-python/
  app/main.py              API REST principal con FastAPI
  requirements.txt         Dependencias Python

backend-typescript/
  src/server.ts            Servicio auxiliar de alertas y ETA

frontend/
  src/main.tsx             Aplicacion React
  src/styles.css           Estilos responsive EcoCusco
  vite.config.ts           Proxy local hacia API y servicio geo

database/
  schema.sql               Esquema PostgreSQL principal
  seed.sql                 Datos iniciales
  docker-compose.yml       PostgreSQL local opcional

scripts/
  start-all.ps1            Inicio de los tres servicios
```

## Requisitos

- Python 3.9 o superior
- Node.js 18 o superior
- npm 9 o superior
- PowerShell en Windows
- Docker Desktop opcional, solo si se usara PostgreSQL en contenedor

Puertos usados por defecto:

| Servicio | Puerto | URL |
| --- | ---: | --- |
| Frontend Vite | 5173 | `http://localhost:5173` |
| API FastAPI | 8000 | `http://localhost:8000` |
| Geo/Alertas TS | 3100 | `http://localhost:3100` |

## Instalacion

Desde la raiz del proyecto:

```powershell
npm --prefix frontend install
npm --prefix backend-typescript install
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend-python\requirements.txt
```

## Ejecucion

Opcion rapida:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
```

Opcion manual, en tres terminales:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend-python --host 0.0.0.0 --port 8000
```

```powershell
npm --prefix backend-typescript run dev
```

```powershell
npm --prefix frontend run dev
```

Luego abre `http://localhost:5173`.

## Modo Demo

El sistema funciona sin PostgreSQL. Si no existe `DATABASE_URL` o la base de datos no esta disponible, FastAPI responde con datos en memoria para poder probar login, horarios, rutas, reportes, mapa y estadisticas.

Para iniciar sesion en demo:

- Nombre: cualquier nombre
- Email: cualquier correo valido
- Rol: ciudadano, operador, admin o conductor
- Zona: una zona disponible del formulario

## PostgreSQL Opcional

Si necesitas persistencia real:

```powershell
psql -U postgres -c "CREATE DATABASE sir_cusco;"
psql -U postgres -d sir_cusco -f database\schema.sql
psql -U postgres -d sir_cusco -f database\seed.sql
```

Configura la variable:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sir_cusco"
```

Reinicia el backend despues de configurar la variable.

## PostgreSQL con Docker

El proyecto incluye `database/docker-compose.yml` para levantar PostgreSQL local sin instalarlo manualmente.

Primero verifica que Docker este instalado:

```powershell
docker --version
docker compose version
```

Luego confirma que Docker Desktop este encendido:

```powershell
docker info
```

Si el comando muestra una seccion `Server`, Docker esta funcionando. Si aparece un error con `dockerDesktopLinuxEngine`, abre Docker Desktop y espera a que termine de iniciar.

Para iniciar PostgreSQL:

```powershell
cd database
docker compose up -d
```

El contenedor crea automaticamente la base `sir_cusco` y carga `schema.sql` y `seed.sql` en el primer arranque. Los datos quedan guardados en el volumen Docker `sir_cusco_data`.

Verifica que el contenedor este activo:

```powershell
docker ps
```

Debe aparecer un contenedor llamado `sir_cusco_postgres`.

Configura FastAPI para usar la base de datos. Ejecuta esto en la misma terminal donde levantaras el backend:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sir_cusco"
```

Si estas dentro de `database`, vuelve a la raiz del proyecto antes de iniciar FastAPI:

```powershell
cd ..
python -m uvicorn app.main:app --reload --app-dir backend-python --host 0.0.0.0 --port 8000
```

Si no tienes el entorno virtual activado, usa la ruta explicita desde la raiz:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend-python --host 0.0.0.0 --port 8000
```

Para comprobar que la API usa PostgreSQL, abre:

```text
http://localhost:8000/api/health
```

La respuesta debe indicar:

```json
{
  "database": "postgresql",
  "mode": "production"
}
```

Nota: `0.0.0.0` se usa para que FastAPI escuche conexiones, pero en el navegador se debe abrir `localhost` o `127.0.0.1`.

Para volver al modo demo en memoria:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
```

Luego reinicia FastAPI.

## Endpoints Principales

API FastAPI:

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| GET | `/api/health` | Estado de la API y modo de base de datos |
| GET | `/api/bootstrap` | Datos iniciales para el frontend |
| POST | `/api/auth/login` | Login/registro demo por rol |
| GET | `/api/zones` | Zonas de recoleccion |
| GET | `/api/schedules` | Horarios |
| GET | `/api/trucks` | Camiones |
| GET | `/api/routes` | Rutas activas |
| GET | `/api/reports` | Reportes ciudadanos |
| POST | `/api/reports` | Crear reporte |
| PATCH | `/api/reports/{id}/resolve` | Resolver reporte |
| GET | `/api/collections` | Historial de recolecciones |
| GET | `/api/analytics/summary` | Resumen estadistico |

Servicio Geo/Alertas:

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| GET | `/health` | Estado del servicio |
| GET | `/truck-locations` | Ubicaciones simuladas |
| GET | `/alerts` | Alertas de ETA |
| GET | `/eta?truck=C-01` | ETA por camion |

## Funcionalidades

- Login demo multirol.
- Consulta de horarios por zona.
- Registro y seguimiento de incidencias.
- Resolucion de incidencias desde administracion.
- Mapa operativo con zonas, camiones y rutas.
- Panel de metricas y estadisticas.
- Guia de clasificacion de residuos.
- Exportacion CSV en vistas con listados.
- Tema claro/oscuro.
- Diseno responsive para escritorio y celular.

## Verificacion

```powershell
npm --prefix frontend run build
npm --prefix backend-typescript run build
.\.venv\Scripts\python.exe -m py_compile backend-python\app\main.py
```

Tambien puedes ejecutar:

```powershell
python verify_system.py
```

## Pruebas Manuales Recomendadas

1. Abrir `http://localhost:5173`.
2. Iniciar sesion con un correo valido.
3. Revisar el panel principal y confirmar que el mapa carga.
4. Ir a Horarios y probar busqueda/filtros.
5. Ir a Reportes, registrar una incidencia y confirmar que aparece en seguimiento.
6. Ir a Administracion y marcar una incidencia como resuelta.
7. Probar la vista en ancho movil, por ejemplo 390 px, y confirmar que no haya scroll horizontal.

## Troubleshooting

| Problema | Solucion |
| --- | --- |
| `ModuleNotFoundError: uvicorn` | Instala dependencias con `.\.venv\Scripts\python.exe -m pip install -r backend-python\requirements.txt` |
| Puerto 8000 ocupado | Deten el proceso anterior o cambia `--port 8001` |
| Puerto 5173 ocupado | Vite suele elegir otro puerto; revisa la terminal |
| El mapa no carga | Verifica conexion a internet para tiles de OpenStreetMap |
| No conecta con API | Revisa `http://localhost:8000/api/health` y el proxy en `frontend/vite.config.ts` |
| PostgreSQL falla | El sistema cae a modo demo en memoria; revisa `DATABASE_URL` |
| `dockerDesktopLinuxEngine` no existe | Docker Desktop esta instalado pero apagado; abre Docker Desktop y ejecuta `docker info` otra vez |
| `.\.venv\Scripts\python.exe` no se reconoce desde `database` | Vuelve a la raiz con `cd ..` o usa `python` si el entorno virtual esta activado |
| `ERR_ADDRESS_INVALID` en `http://0.0.0.0:8000/` | Abre `http://localhost:8000/api/health`; `0.0.0.0` no se usa como URL del navegador |

## Documentacion Conservada

- `docs/entrega-2.md`: documento academico base de la entrega.
- `docs/diagrama-casos-uso.puml` y `docs/diagrama-clases.puml`: diagramas UML editables.
- `database/schema.sql` y `database/seed.sql`: referencia tecnica de la base de datos PostgreSQL.

La documentacion duplicada de resumen, guias rapidas y previews fue consolidada aqui para mantener el proyecto mas limpio.
