# Plan de Refactorización de la API — SIR Cusco

## Objetivo

Dividir `backend-python/app/main.py` (~1777 líneas, monolito) en una estructura modular con responsabilidades separadas, facilitando el mantenimiento, las pruebas y la escalabilidad.

## Estructura destino

```
backend-python/app/
├── __init__.py
├── main.py              # Solo: FastAPI app, middleware, startup, registro de routers
├── models.py            # Todos los modelos Pydantic (request/response schemas)
├── store.py             # MemoryStore (datos en memoria para modo demo)
├── utils.py             # Funciones auxiliares compartidas (JWT, bcrypt, CORS, DB helpers)
├── services/
│   ├── __init__.py
│   ├── auth.py          # Lógica de autenticación (login, register, tokens, password reset)
│   ├── users.py         # CRUD de usuarios
│   ├── zones.py         # CRUD de zonas + priorización
│   ├── schedules.py     # CRUD de horarios
│   ├── trucks.py        # CRUD de camiones
│   ├── maintenance.py   # CRUD de mantenimiento
│   ├── collections.py   # CRUD de recolecciones + confirmación ciudadana
│   ├── reports.py       # CRUD de reportes + resolución
│   ├── monitor.py       # Lógica de monitor/operations (bootstrap, simulaciones, alertas)
│   └── analytics.py     # Cálculos analíticos
├── routes/
│   ├── __init__.py
│   ├── auth.py          # Endpoints /api/auth/*
│   ├── users.py         # Endpoints /api/users/*
│   ├── zones.py         # Endpoints /api/zones/*
│   ├── schedules.py     # Endpoints /api/schedules/*
│   ├── trucks.py        # Endpoints /api/trucks/*
│   ├── maintenance.py   # Endpoints /api/maintenance/*
│   ├── collections.py   # Endpoints /api/collections/*
│   ├── reports.py       # Endpoints /api/reports/*
│   ├── monitor.py       # Endpoints /api/operations/*, /api/monitor
│   ├── alerts.py        # Endpoints /api/alerts, /alerts
│   ├── eta.py           # Endpoints /api/eta, /eta
│   ├── bootstrap.py     # Endpoint /api/bootstrap
│   └── health.py        # Endpoint /api/health, /
└── __pycache__/
```

## Archivos origen y su distribución

| Archivo original | Líneas | Destino |
|-----------------|--------|---------|
| Imports + logging + config | 1-24 | `main.py`, `utils.py` |
| Pydantic models (LoginRequest → CollectionCreate) | 26-167 | `models.py` |
| MemoryStore | 168-278 | `store.py` |
| cors_origins, cors_origin_regex | 280-294 | `utils.py` |
| app = FastAPI + middleware | 297-306 | `main.py` |
| memory + JWT config | 309-313 | `main.py`, `utils.py` |
| database_url, database_mode | 316-325 | `utils.py` |
| DB helpers (init_db, fetch_all, execute_one, etc.) | 331-473 | `utils.py` |
| normalize_role | 476-478 | `utils.py` |
| build_alerts, prioritize_zones, optimize_routes, etc. | 481-656 | `services/monitor.py`, `services/alerts.py` |
| build_user_payload, create_token, decode_token | 659-683 | `utils.py` |
| get_user_record_by_email, get_user_by_email, create_user_record, list_users, update_user, delete_user | 686-774 | `services/auth.py`, `services/users.py` |
| get_zone_name, build_zone_payload, create_zone_record, update_zone, delete_zone | 776-848 | `services/zones.py` |
| build_schedule_payload, create_schedule_record, update_schedule, delete_schedule | 851-915 | `services/schedules.py` |
| build_truck_payload, create_truck_record, update_truck, delete_truck | 917-993 | `services/trucks.py` |
| build_maintenance_payload, create_maintenance_record, update_maintenance, delete_maintenance | 995-1051 | `services/maintenance.py` |
| create_collection_record, confirm_collection_by_citizen | 1054-1127 | `services/collections.py` |
| Password reset helpers | 1130-1155 | `services/auth.py` |
| bootstrap() | 1158-1185 | `services/monitor.py` |
| require_current_user, require_role, get_current_user_optional | 1188-1220 | `utils.py` |
| Root endpoint (/) | 1223-1239 | `routes/health.py` |
| /api/health | 1242-1251 | `routes/health.py` |
| /api/bootstrap | 1254-1277 | `routes/bootstrap.py` |
| /api/auth/register | 1280-1287 | `routes/auth.py` |
| /api/auth/login | 1290-1302 | `routes/auth.py` |
| /api/auth/me | 1305-1307 | `routes/auth.py` |
| /api/auth/forgot-password | 1310-1318 | `routes/auth.py` |
| /api/auth/reset-password | 1321-1342 | `routes/auth.py` |
| /api/users (CRUD) | 1345-1367 | `routes/users.py` |
| /api/zones (CRUD) | 1370-1388 | `routes/zones.py` |
| /api/schedules (CRUD) | 1391-1409 | `routes/schedules.py` |
| /api/trucks (CRUD) | 1412-1430 | `routes/trucks.py` |
| /api/maintenance (CRUD) | 1433-1454 | `routes/maintenance.py` |
| /api/truck-locations | 1457-1460 | `routes/eta.py` |
| /api/routes | 1463-1465 | `routes/monitor.py` |
| build_monitor() | 1468-1496 | `services/monitor.py` |
| /api/operations/monitor | 1499-1515 | `routes/monitor.py` |
| /api/operations/update | 1518-1619 | `routes/monitor.py` |
| /alerts, /api/alerts | 1622-1636 | `routes/alerts.py` |
| /api/eta | 1639-1648 | `routes/eta.py` |
| /api/reports (GET/POST) | 1651-1686 | `routes/reports.py` |
| /api/reports/{id}/resolve | 1689-1705 | `routes/reports.py` |
| /api/collections (GET/POST) | 1708-1742 | `routes/collections.py` |
| /api/collections/{id}/confirm | 1745-1751 | `routes/collections.py` |
| /api/analytics/summary | 1754-1777 | `routes/monitor.py` |

## Pasos de implementación

### Fase 1: Preparación (1 archivo)
1. Crear `models.py` — mover todos los Pydantic models de `main.py`
2. Crear `store.py` — mover `MemoryStore` de `main.py`
3. Crear `utils.py` — mover funciones auxiliares compartidas
4. Crear `services/__init__.py` y `routes/__init__.py`

### Fase 2: Servicios (10 archivos)
5. Crear `services/auth.py` — lógica de auth + usuarios
6. Crear `services/zones.py` — CRUD de zonas
7. Crear `services/schedules.py` — CRUD de horarios
8. Crear `services/trucks.py` — CRUD de camiones
9. Crear `services/maintenance.py` — CRUD de mantenimiento
10. Crear `services/collections.py` — CRUD de recolecciones
11. Crear `services/reports.py` — CRUD de reportes
12. Crear `services/monitor.py` — bootstrap, simulaciones, alertas, analytics
13. Crear `services/alerts.py` — lógica de alertas
14. Crear `services/analytics.py` — métricas analíticas

### Fase 3: Rutas (13 archivos)
15. Crear `routes/health.py`
16. Crear `routes/bootstrap.py`
17. Crear `routes/auth.py`
18. Crear `routes/users.py`
19. Crear `routes/zones.py`
20. Crear `routes/schedules.py`
21. Crear `routes/trucks.py`
22. Crear `routes/maintenance.py`
23. Crear `routes/collections.py`
24. Crear `routes/reports.py`
25. Crear `routes/monitor.py`
26. Crear `routes/alerts.py`
27. Crear `routes/eta.py`

### Fase 4: Reconstruir main.py
28. Reescribir `main.py` como coordinador delgado (importa y registra routers)

### Fase 5: Verificación
29. Ejecutar `npm run check:all` y tests del backend
30. Verificar que `/docs` y `/openapi.json` funcionan
31. Verificar que el frontend sigue funcionando

## Reglas de migración

1. **No cambiar la interfaz pública** — las rutas, parámetros y respuestas deben ser idénticos
2. **Migrar función por función** — cada función de `main.py` se mueve tal cual, sin modificar lógica
3. **Preservar el orden de importación** — `main.py` importa de `app.models`, `app.store`, `app.utils`, `app.services.*`, `app.routes.*`
4. **Tests primero** — después de cada fase, ejecutar los tests existentes para verificar que nada se rompió
5. **Commit por fase** — cada fase se commitea independientemente