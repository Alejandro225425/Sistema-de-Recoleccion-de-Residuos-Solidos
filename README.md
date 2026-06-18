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

## Documentacion Conservada

- `docs/entrega-2.md`: documento academico base de la entrega.
- `docs/diagrama-casos-uso.puml` y `docs/diagrama-clases.puml`: diagramas UML editables.
- `database/schema.sql` y `database/seed.sql`: referencia tecnica de la base de datos PostgreSQL.

La documentacion duplicada de resumen, guias rapidas y previews fue consolidada aqui para mantener el proyecto mas limpio.
