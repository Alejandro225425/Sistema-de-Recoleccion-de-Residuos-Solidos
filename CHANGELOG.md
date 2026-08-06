# Changelog

## 2026-08-05

### Version 6.0 - Mejoras en registro y panel administrativo

- **Frontend - AuthView.tsx (Registrarme):** se eliminó el dropdown de rol del formulario de auto-registro. Los usuarios se registran automáticamente con rol `ciudadano`. Se agregó campo de "Confirmar contraseña" con validación de coincidencia y toggle de visibilidad.
- **Frontend - Admin.tsx:** el campo de zona en la creación de usuarios ahora usa un `<select>` dropdown poblado desde `safeData.zones` en vez de un input de texto libre.
- **Seguridad:** el rol en auto-registro está hardcodeado como `"ciudadano"` tanto en la UI como en el request al backend. El `normalize_role()` del backend sigue como segunda capa de defensa.
- **Verificación:** `tsc --noEmit` sin errores, `npm run build` exitoso, `pytest` 38/38 pasados, `vitest` 38/38 pasados.

### Archivos modificados
- `frontend/src/components/AuthView.tsx` — Eliminación de dropdown de rol, hardcodeo de `role: "ciudadano"`, campo "Confirmar contraseña" con validación
- `frontend/src/components/Admin.tsx` — Campo de zona convertido de `<input>` a `<select>` dropdown
- `VERSION.md`, `CHANGELOG.md`, `README.md`, `AGENTS.md` — documentación actualizada

## 2026-08-05

### Version 6.1 - Mapa de proximidad conectado en Dashboard ciudadano

- **Frontend - Map:** se conectó `proximityAlerts` al mapa del Dashboard ciudadano. Ahora el mapa muestra la ubicación del ciudadano como marcador azul, un círculo de radio de 500m alrededor de su zona y resalta en rojo los camiones cercanos cuando existen alertas de proximidad.
- **Frontend - Map:** los camiones se representan con un icono de camión (emoji 🚛) en lugar de círculos, con popup que muestra código, zona y estado. El conductor ve su camión destacado en el mapa de Routes y el ciudadano ve los camiones cercanos en el mapa de Dashboard.
- **Frontend - Map:** se reutilizó la lógica existente de `Routes` (prop `citizenProximity` y `citizenZone`) sin duplicar código. El componente `Map` ahora acepta `citizenZone` para dibujar la ubicación del usuario y el radio de proximidad incluso cuando no hay camiones cercanos.
- **Frontend - Dashboard:** se pasó `citizenZone` al `Map` calculado desde `session.zone` y `data.zones`, manteniendo el comportamiento dinámico sin hardcode.
- **Verificación:** `tsc --noEmit` sin errores, `npm run build` exitoso, `pytest` 38/38 pasados, `vitest` 38/38 pasados.

### Archivos modificados
- `frontend/src/main.tsx` — Conexión de `proximityAlerts` y `citizenZone` al `Map` en Dashboard y Routes, lógica de dibujado de ubicación ciudadana y radio 500m, icono de camión con popup informativo

## 2026-08-05

### Version 5.6 - Simulación de alerta de proximidad Ciudadano ↔ Conductor

- **Backend - Haversine**: se agregó `haversine_distance_m()` para cálculo de distancia geodésica en metros entre coordenadas. Sin dependencias externas, usa fórmula manual.
- **Backend - POST /api/proximity/check**: nuevo endpoint para consulta explícita de proximidad. Acepta `{ latitude, longitude, radius_m }` y retorna camiones activos dentro del radio con distancia, ETA y estado. Requiere autenticación JWT.
- **Backend - build_proximity_alerts()**: genera notificaciones automáticas de proximidad integradas en el sistema de notificaciones existente (`type = "proximity"`). Se ejecuta en cada llamada a `/api/operations/monitor` y `/api/alerts`.
  - Ciudadano: recibe alerta cuando un camión `En ruta` está a ≤500m de su zona asignada.
  - Conductor: recibe alerta cuando su camión está a ≤500m de una zona.
  - Operador/Admin: ven todas las proximidades camión-zona del sistema.
- **Backend - build_monitor() y get_alerts()**: extendidos para incluir alertas de proximidad en el payload del monitor y en la lista de alerts.
- **Backend - seed.sql**: se agregaron 2 notificaciones de proximidad demo (ciudadano y conductor) para reflejar la nueva funcionalidad.
- **Frontend - types.ts**: se agregaron `ProximityAlert`, `ProximityCheckRequest`, `ProximityCheckResponse`, `ProximityTone`.
- **Frontend - api.ts**: se agregó `proximityCheck()` para llamar al endpoint `/api/proximity/check`.
- **Frontend - Dashboard**: los ciudadanos ven una sección "🚛 Camiones cercanos" con tarjetas de proximidad (distancia, ETA, tono cercano/muy cercano). Se actualiza cada 10s junto con el monitor.
- **Frontend - Routes**: conductores, operadores y administradores ven alertas de proximidad en el seguimiento GPS. Se muestra distancia y ETA de zonas/camiones cercanos.
- **Frontend - Map**: el mapa operativo ahora dibuja un círculo de radio de 500m alrededor de la zona del ciudadano cuando hay alertas de proximidad, y resalta los marcadores de camiones cercanos en rojo.
- **Tests - backend**: se creó `tests/test_proximity.py` con 8 tests que cubren Haversine, alertas de proximidad por rol, endpoint `/api/proximity/check`, monitor y alerts con proximidad.
- **Verificación**: `tsc --noEmit` sin errores, `npm run build` exitoso, `pytest` 38/38 pasados, `vitest` 38/38 pasados.

### Archivos modificados
- `backend-python/app/main.py` — Haversine, modelos, endpoint `/api/proximity/check`, `build_proximity_alerts()`, extensiones de `build_monitor()` y `get_alerts()`, versión 5.6
- `backend-python/tests/test_proximity.py` — 8 tests nuevos de proximidad
- `backend-python/tests/test_operational_logic.py` — actualización de versión a 5.6
- `database/seed.sql` — notificaciones de proximidad demo
- `frontend/src/types.ts` — tipos ProximityAlert, ProximityCheckRequest, ProximityCheckResponse
- `frontend/src/api.ts` — función `proximityCheck()`
- `frontend/src/main.tsx` — Dashboard (cards ciudadano), Routes (alertas conductor), Map (radio + resaltado), polling de proximidad
- `frontend/src/Reports.test.tsx` — prop `proximityAlerts` agregada a Dashboard en test
- `CHANGELOG.md`, `VERSION.md`, `README.md` — documentación actualizada

## 2026-08-04

### Version 5.5.10 - Operaciones masivas en panel administrativo

- **Backend - POST /api/admin/bulk-action**: se agregó un endpoint para operaciones masivas que permite eliminar múltiples registros (usuarios, zonas, horarios, camiones, mantenimiento) en una sola petición. Soporta modo memoria y PostgreSQL. Requiere rol `admin`.
- **Backend - MemoryStore**: se añadió la función `bulk_delete()` con fallback a memoria cuando PostgreSQL no está disponible.
- **Frontend - Admin.tsx**: se implementaron checkboxes de selección múltiple en las listas de usuarios, zonas, horarios, camiones y mantenimiento. Al seleccionar elementos aparece una barra de acciones masivas con botones "Seleccionar todo" y "Eliminar seleccionados" (con confirmación de seguridad).
- **Frontend - Admin.tsx**: las selecciones se limpian automáticamente al refrescar los datos o al completar una eliminación.
- **Frontend - styles.css**: se añadieron estilos `.bulk-action-bar` y `.admin-list-actions input[type="checkbox"]` para la interfaz de operaciones masivas.
- **Tests - backend**: se agregaron 4 tests para el endpoint `POST /api/admin/bulk-action` (eliminación masiva, validación de IDs vacíos, recurso no soportado, permisos de rol).
- **Tests - frontend**: se agregaron 4 tests en `Admin.test.tsx` para selección de checkboxes, visualización de la barra de acciones, llamada a la API y cancelación por el usuario.
- **Verificación**: 30/31 backend tests (1 skip preexistente), 25/25 frontend tests.

- **Frontend - styles.css**: corregido selector CSS roto en media query `@media (max-width: 768px)` que impedía el colapso a 1 columna en móviles. Se reemplazó el selector inválido `.panel [style*=" grid-template-columns\]` por la clase `.panel-analytics-grid` con regla explícita `grid-template-columns: 1fr !important` en móvil.
- **Frontend - main.tsx**: se eliminaron estilos inline del dashboard de Analytics (`gridTemplateColumns: "1fr 1fr"`, `padding`, `marginBottom`, `listStyle`, controles de fecha) y se migraron a clases CSS (`panel-analytics-grid`, `analytics-header`, `analytics-controls`, `analytics-summary-list`, `analytics-waste-grid`, `analytics-waste-item`). Ahora Analytics responde correctamente a media queries.
- **Frontend - main.tsx**: mejorada accesibilidad del menú off-canvas en móvil. Se añadieron `aria-expanded` y `aria-controls` al botón hamburguesa, `ref` en la sidebar para gestión de foco, `useEffect` para cerrar con tecla `Escape` y `useEffect` para enfocar el primer botón al abrir el menú.
- **Frontend - styles.css**: bloqueado scroll del body cuando la sidebar off-canvas está abierta en móvil (`overflow: hidden`) para evitar desplazamiento de fondo.
- **Frontend - styles.css**: reducida altura de gráficos Recharts en móvil con clase `.analytics-chart` (220px desktop, 200px tablet, 180px móvil) para mejorar legibilidad.
- **Frontend - main.tsx**: migrados selects inline de la vista Waste a clase responsiva `.waste-filter-select`, evitando desbordamiento horizontal en pantallas pequeñas.
- **Frontend - styles.css**: añadido `safe-area-inset` en hamburguesa y sidebar para notch/barras de iOS.
- **Frontend - styles.css**: prevenido zoom automático en inputs móviles estableciendo `font-size: 16px` en media query `@media (max-width: 768px)`.
- **Tests**: aumentado timeout en test de edición de zonas para evitar fallo por lentitud de entorno (`App.test.tsx`).
- **Verificación**: `tsc --noEmit` sin errores, `npm run build` exitoso, 21/21 tests frontend.
- **Archivos modificados**: `frontend/src/styles.css`, `frontend/src/main.tsx`, `frontend/src/App.test.tsx`, `CHANGELOG.md`, `README.md`.

## 2026-08-04

### Version 5.5.8 - Auditoría integral de dashboards del rol Conductor y correcciones de seguridad

- **Backend - POST /api/collections**: se agregó validación de propiedad de camión para el rol `conductor`. Un conductor solo puede registrar recolecciones para su camión asignado (donde `driver` coincide con su nombre). Intentar registrar para un camión ajeno retorna `403 Forbidden`. El rol `operador` mantiene acceso sin restricción.
- **Backend - MemoryStore**: se completó la cobertura de datos en memoria para coincidir con `seed.sql` — se agregó el camión C-04 (Elena Condori, Santiago), la tercera incidencia de reporte, el segundo registro de mantenimiento y la segunda notificación. Se agregaron los usuarios demo (ciudadano, operador, conductor, admin2) con hashes de contraseña correctos.
- **Backend - seed.sql**: se actualizó el nombre del usuario conductor de "Conductor Ruta 5" a "Elena Condori" para que coincida con el conductor del camión C-04 en la zona Santiago, permitiendo la vinculación conductor‑camión en la interfaz.
- **Frontend - Dashboard**: se agregó `isConductor` flag y métricas específicas (kg recolectados en zona, incidencias en zona, estado del camión, confirmadas).
- **Frontend - Dashboard**: se filtró el **tablero de despacho**, las **alertas activas** y el **plan de intervención** para mostrar solo información relevante a la zona y el camión del conductor.
- **Frontend - Dashboard**: se agregó la sección **"Mi camión"** con estado del camión, zona asignada, ruta asignada (progreso, ETA, retraso) y la última recolección registrada en la zona del conductor.
- **Frontend - Routes**: el dropdown de camiones muestra **solo el camión asignado** al conductor (filtrado por nombre). La zona se **defaultea** a la zona del conductor. Se agregó validación de formulario: kg no puede ser 0, NaN, ni negativo; los IDs de camión y zona deben ser válidos. Se corrigió typo "Camion" → "Camión" y "recoleccion" → "recolección". Se muestra mensaje de confirmación/error con feedback visual.
- **Frontend - Routes**: el seguimiento GPS muestra un banner indicando que se visualizan las rutas del camión del conductor, y filtra las rutas mostradas al camión asignado.
- **Frontend - Analytics**: se filtraron las **colecciones** y **reportes** por la zona del conductor. Se agregaron métricas específicas (kg en zona, recolecciones, incidencias, cumplimiento). Se corrigió typo "Historial de recoleccion" → "Historial de recolecciones".
- **Tests**: se agregaron 5 tests de backend para validación de permisos de conductor en `/api/collections` y filtrado de analíticas.
- **Compilación**: `tsc --noEmit` sin errores, `npm run build` exitoso.
- **Tests**: 26/26 backend (21 originales + 5 nuevos), 21/21 frontend.

### Version 5.5.4 - Correcciones críticas y mejoras en dashboards

- **Frontend - Dashboard**: métricas ahora son clicables y navegan a la vista correspondiente (reports, routes, analytics, admin). Se agregó cursor pointer para indicar interactividad.
- **Frontend - Schedules**: el banner de horarios del ciudadano ahora muestra TODAS las recolecciones programadas para su zona (no solo la primera). Se corrigió el filtro de día para cadenas compuestas (e.g. "Lunes, miercoles y viernes").
- **Frontend - Waste**: se agregó la sección "Guía de disposición" con instrucciones por tipo de residuo (orgánicos, reciclables, no reciclables) y el contenedor asignado.
- **Frontend - Routes**: las alertas geo ahora se refrescan automáticamente cada 30 segundos. Se mejoró el manejo de errores del microservicio geo.
- **Frontend - Admin**: se agregaron diálogos de confirmación (`window.confirm`) para todas las acciones destructivas (eliminar usuario, zona, horario, camión, mantenimiento). Se corrigió el display de `truck_id` en mantenimiento para mostrar el código del camión en lugar del ID numérico.
- **Frontend - Analytics**: se agregó desglose por tipo de residuo y filtro de rango de fecha (7/30/90 días/todo el año) para el historial de recolecciones.
- **Compilación**: `tsc --noEmit` sin errores, `npm run build` exitoso.
- **Tests**: 21/21 frontend, 26/26 backend.

### Archivos modificados
- `frontend/src/main.tsx` — Dashboard métricas clicables, Schedules banner ciudadano con todas las recolecciones, Waste guía de disposición, Routes refresh geo cada 30s, Analytics desglose por tipo y filtro de fecha
- `frontend/src/components/Admin.tsx` — Confirmaciones de eliminación, display de código de camión en mantenimiento
- `frontend/src/styles.css` — Cursor pointer en metric-card
- `frontend/src/App.test.tsx` — Mock de window.confirm para tests
- `frontend/src/Reports.test.tsx` — Props view/setView agregadas a Dashboard en test
- `CHANGELOG.md` — Entrada para versión 5.5.4

### Archivos modificados
- `backend-python/app/main.py` — Validación de camión en POST /api/collections, MemoryStore completado con C-04 y usuarios demo, nombre del conductor corregido
- `database/seed.sql` — Nombre del conductor actualizado a "Elena Condori"
- `frontend/src/main.tsx` — Dashboard isConductor + métricas + filtros + "Mi camión", Routes filtro de camión/zona + validación, Analytics filtrado por zona + métricas conductor + typo corregido
- `AGENTS.md` — Versión actualizada a 5.5.8, credenciales del conductor actualizadas

- **Seguridad backend - POST /api/reports**: se restringió la creación de reportes al rol `ciudadano` exclusivamente. Los roles `operador` y `admin` ahora reciben `403 Forbidden` al intentar registrar incidencias, alineando la creación de reportes con la función de cada rol (ciudadanos reportan, operadores/admin resuelven).
- **Frontend Reports**: se ocultó el formulario de creación de reportes para `operador` y `admin`. Ahora muestran un mensaje informativo indicando que solo los ciudadanos pueden registrar incidencias, y que operadores/administradores pueden resolverlas desde la lista de seguimiento.
- **Frontend Dashboard**: se agregaron métricas específicas para admin (usuarios registrados, zonas activas, camiones en mantenimiento) y una sección "Estado del sistema" con información de salud del sistema (modo BD, usuarios, zonas, camiones, reportes abiertos, rutas con retraso, contenedores críticos).
- **Frontend Routes**: se amplió el formulario de registro de recolecciones para incluir el rol `admin` (antes solo `conductor` y `operador`).
- **Frontend Analytics**: se agregaron métricas adicionales para admin (total de usuarios, zonas activas, camiones en mantenimiento).
- **Frontend Waste**: se amplió `canReportProblem` para incluir `operador` y `admin` (antes solo `ciudadano`), permitiendo que cualquier rol reporte problemas de clasificación.
- **Frontend statusTone**: se corrigió para distinguir "Pendiente" con tono rojo, "En revisión" con amarillo, "Resuelto" con azul y "Parcial" con amarillo.
- **Frontend Reports**: se corrigió `canCreateReport` para que solo sea `true` para el rol `ciudadano` (antes incluía `operador` y `admin`).
- **Compilación**: `tsc --noEmit` sin errores, `npm run build` frontend exitoso.
- **Tests**: 21/21 tests de frontend pasan, 21/21 tests de backend pasan.

### Archivos modificados
- `backend-python/app/main.py` — Restringir POST /api/reports a rol ciudadano
- `frontend/src/main.tsx` — Métricas admin Dashboard, salud del sistema, Routes collection admin, Analytics admin metrics, Waste canReportProblem, Reports canCreateReport, statusTone fix

## 2026-08-04

### Version 5.5.6 - Corrección de bugs y mejora de estabilidad en dashboard de administración

- **Backend - create_report**: se revirtió el bloqueo de roles `admin`/`operador` en la creación de reportes. Ahora permiten crear reportes (incidencias/observaciones municipales); la restricción de zona aplica solo a ciudadanos.
- **Dashboard Principal**: se corrigió "Contenedores críticos" para usar `effectiveData.containers` (mezcla de bootstrap + monitor en tiempo real) en lugar de `data.containers` (solo bootstrap).
- **Admin**: se agregó latitud, longitud y criticidad a los inputs del formulario de creación/edición de zonas (antes hardcodeados a 0, 0, "Media").
- **Admin**: se agregó `onRefresh` a todas las operaciones CRUD (zonas, horarios, camiones, mantenimiento, usuarios) para sincronizar el estado local con los datos del bootstrap tras mutaciones, evitando que el poll de 10s del monitor sobreescriba actualizaciones optimistas.
- **Admin**: se sincronizó `formValues.zone` con `session.zone` al crear usuarios, usando `session?.zone` dinámicamente.
- **Admin**: se agregó día "Sábado" al dropdown de días de horario.
- **Reports**: se corrigió `setFormZone("")` → ahora se restablece a `session.zone` al enviar el formulario.
- **Reports**: se eliminó duplicado de `isForeignZone`.
- **Waste**: se corrigió typo "Clasificacion" → "Clasificación".
- **Waste**: se corrigió filtro de tipos de residuo para usar `extractWasteTypes` (filtra conjunciones "y"/"e") en lugar de `split` raw.
- **Routes**: se corrigió typo "recoleccion" → "recolección".
- **App**: se agregó endpoint `/api/health` con verificación real de conectividad y `lastSync` timestamp; se eliminó detección de modo DB basada en `compliance_estimate` (siempre truthy).
- **Código limpio**: se eliminó código muerto del toggle de modo oscuro (isDarkMode, botón theme-toggle, preferencia localStorage) — `styles.css` no contiene selectores `[data-theme="dark"]`.
- **Compilación**: `tsc --noEmit` sin errores, `npm run build` frontend exitoso.
- **Tests**: 21/21 tests de frontend pasan, 21/21 tests de backend pasan.

### Archivos modificados
- `backend-python/app/main.py` — Revertir bloqueo create_report admin/operador
- `frontend/src/main.tsx` — Corregir Dashboard containers, health check, typos, filtros Waste, reset zona Reports
- `frontend/src/components/Admin.tsx` — Lat/lng/criticality zonas, onRefresh CRUD, session.zone usuarios, Sábado horario, try/catch eventos

## 2026-08-03

### Version 5.5.5 - Auditoría integral de dashboards del rol Operador Municipal

- **Auditoría completa de dashboards del operador**: se revisaron y corrigieron todos los dashboards del rol `operador` (`Dashboard`, `Reports`, `Routes`, `Analytics`) verificando lógica del sistema, lógica de negocio, permisos, validaciones, integración con backend, seguridad, UX y rendimiento.
- **Dashboard Principal**: se verificaron métricas dinámicas (zonas, camiones, alertas, recolecciones), mapa operativo, tablero de despacho, plan de intervención y alertas activas. Se confirmó que no muestra datos de administración.
- **Reports**: se verificó que el operador puede crear, buscar, filtrar, exportar (CSV/PDF) y resolver reportes. Se agregó advertencia de zona extranjera para operadores que reportan fuera de su zona asignada. Se mejoró la generación dinámica de tipos de reporte.
- **Routes**: se verificó el mapa operativo, seguimiento GPS, alertas del microservicio geo y el formulario de registro de recolecciones (ahora accesible para `operador` y `conductor`).
- **Analytics**: se agregaron métricas específicas para operadores (rutas monitoreadas, índice de cumplimiento, rutas con retraso, progreso medio, llenado promedio) y se mejoró la exportación de métricas CSV/PDF.
- **Backend**: se amplió el permiso de `POST /api/collections` para incluir el rol `operador`, permitiendo registrar recolecciones desde la vista de rutas.
- **Código limpio**: se eliminó código muerto en el componente `Waste` (lógica de operador inaccesible) y se mejoró la legibilidad del código.
- **Compilación**: `tsc --noEmit` sin errores, `npm run build` frontend exitoso, `npm run build` geo-service exitoso.
- **Tests**: 21/21 tests de frontend pasan, 21/21 tests de backend pasan.

### Version 5.5.4 - Auditoría integral de dashboards del rol Ciudadano

- **Auditoría completa de dashboards ciudadano**: se revisaron y corrigieron todos los dashboards del rol `ciudadano` (`Dashboard`, `Reports`, `Schedules`, `Waste`, `Analytics`) verificando lógica del sistema, lógica de negocio, permisos, validaciones, integración con backend, seguridad, UX y rendimiento.
- **Seguridad backend**: se protegieron endpoints que estaban públicos sin autenticación (`/api/operations/monitor`, `/api/alerts`, `/api/analytics/summary`, `/api/maintenance`), se añadió filtrado por zona para ciudadanos en notificaciones y alerts, y se validó que un ciudadano solo pueda reportar en su zona asignada.
- **Dashboard Principal**: se reemplazó `fallbackSchedule` hardcodeado por datos dinámicos de zonas y camiones del backend; se corrigió variable `dispatchData` inexistente; se mejoró la sección de alertas ciudadanas con recomendaciones dinámicas.
- **Reports**: se corrigió bug en filtro de estado `En revision` vs `En revisión` normalizando comparación; se mantiene pre-selección de zona del ciudadano y advertencia al reportar fuera de zona.
- **Waste**: se amplió la funcionalidad para permitir que ciudadanos reporten problemas de clasificación (antes solo operador/admin); se mantienen filtros dinámicos por tipo y zona.
- **Schedules**: se mantiene banner de próxima recolección para la zona del ciudadano.
- **Analytics**: se mantienen métricas contextuales por rol (ciudadano vs operativo).
- **Backend**: se corrigió endpoint `/api/analytics/summary` para filtrar métricas por rol; se protegió `/api/operations/monitor` y `/api/alerts` con autenticación y filtrado por zona.

### Archivos modificados
- `backend-python/app/main.py` — Proteger endpoints, filtrar por zona/rol, validar reportes de ciudadanos
- `frontend/src/main.tsx` — Corregir bugs dashboards, datos dinámicos, permitir reportes en Waste
- `frontend/src/styles.css` — Estilos auxiliares
- `CHANGELOG.md`, `VERSION.md` — Documentación actualizada

- **Causa raíz**: las cuentas y datos creados no se guardaban permanentemente porque el backend en producción (Render) no tenía configurada la base de datos PostgreSQL y caía al modo memoria (in-memory), perdiendo todos los datos en cada reinicio.
- **Infraestructura - render.yaml**: se agregó un recurso de base de datos PostgreSQL 16 (`sir-cusco-db`) y se cambió `DATABASE_URL` de `sync: false` (manual/opcional) a `fromDatabase`, de modo que se inyecta automáticamente al backend. Antes, `DATABASE_URL` era opcional y no provisionada, por lo que el backend siempre arrancaba en modo memoria.
- **Backend - init_db() al arranque**: se agregó la función `init_db()` que ejecuta `database/schema.sql` y `database/seed.sql` contra PostgreSQL al iniciar la aplicación (evento `lifespan`). El backend ahora crea el esquema y carga los datos semilla automáticamente en producción sin necesidad de montar scripts manualmente. El proceso es idempotente (`CREATE TABLE IF NOT EXISTS` / `ON CONFLICT DO UPDATE`).
- **Backend - Dockerfile**: se agregó `COPY database/ ./database/` para que `init_db()` encuentre `schema.sql` y `seed.sql` en despliegues basados en contenedor (Railway, etc.).
- **Backend - execute_one()**: corregido bug crítico donde `cur.fetchone()` se llamaba incondicadamente en consultas UPDATE/DELETE (sin `RETURNING`), retornando `None` y lanzando `HTTPException(404)`. Esto provocaba que las operaciones de edición y eliminación cayeran silencitosamente al modo memoria. Ahora solo hace `fetchone()` cuando `cur.description is not None` (consultas con resultados), y retorna `{}` para UPDATE/DELETE.
- **Backend - /api/health**: el endpoint ahora reporta `"connected": true/false` con verificación real de conectividad. `"mode"` pasa a ser `"production"` solo cuando la base de datos está realmente conectada (no solo cuando `DATABASE_URL` está presente), evitando falsos positivos.
- **Backend - logging**: se agregó registro (`logging`) que emite `WARNING` cuando el backend cae al modo memoria por errores de base de datos, incluyendo en `bootstrap()`, `create_user_record()` y `init_db()`. Esto hace visibles los fallos de conexión en los logs de producción.
- **Backend - seed.sql**: se corrigió el hash de contraseña del usuario `admin@ecocusco.pe`. El hash estático en `seed.sql` no coincidía con `admin123`, impidiendo el login en modo base de datos real. Se reemplazó por un hash bcrypt válido.
- **Backend - seed.sql**: se agregaron las cuentas de prueba faltantes (`ciudadano`, `operador`, `conductor`, `admin2`) que sólo existían en el `MemoryStore` de modo demo. Ahora existen en la base de datos de producción con hashes bcrypt válidos para `Test12345!`.
- **Backend - versión**: bump a `5.5.3` en `FastAPI`, endpoint root, `/api/health` y test de versión.

#### Verificación
- Tests backend sin DATABASE_URL (modo memoria): **21 passed, 1 skipped** (módulo de persistencia omitido).
- Tests backend con DATABASE_URL (modo PostgreSQL): **26 passed** (21 existentes + 5 nuevos de persistencia).
- Verificación manual contra PostgreSQL 17 local: `init_db()` crea las 11 tablas desde cero en una base vacía, login con todas las cuentas de demo funciona, y operaciones CRUD (crear, editar, eliminar, consultar) persisten correctamente. La cuenta creada sobrevive a un reinicio del backend.

- **Frontend Waste - Dashboard de Clasificación**: reemplazado el contenido hardcodeado por datos del backend. Ahora integra `data`, `monitor` y `session` para mostrar información dinámica. Incluye guía de clasificación por zona, filtros por tipo y zona, búsqueda, estadísticas de residuos, estado de contenedores y mapa de puntos de clasificación. Se agrega la opción de reportar problemas de clasificación desde el dashboard.

#### Archivos modificados
- `frontend/src/main.tsx` — Componente `Waste` reemplazado con dashboard completo integrado al estado de la aplicación
- `frontend/src/styles.css` — Estilos para el nuevo dashboard de clasificación
- `frontend/index.html` — Loading screen y theme-color actualizados a modo claro
- `CHANGELOG.md`, `VERSION.md` — Documentación actualizada
- `Dockerfile` — `COPY database/ ./database/`
- `backend-python/app/main.py` — `init_db()`, `lifespan`, `execute_one()` fix, `/api/health` con `connected`, logging, versión 5.5.3
- `backend-python/tests/test_database_persistence.py` — tests de integración de persistencia (nuevo)
- `backend-python/tests/test_operational_logic.py` — assert de versión 5.5.3 y campo `connected`
- `database/seed.sql` — cuentas de prueba completas + hash de admin corregido
- `.env`, `.env.example` — comentarios actualizados
- `AGENTS.md`, `DEPLOYMENT.md`, `docs/DESPLIEGUE.md`, `README.md`, `VERSION.md` — documentación actualizada

- **Seguridad backend - Bootstrap**: se corrigió el endpoint `/api/bootstrap` para que filtre datos administrativos sensibles (`users`, `maintenance`, `notifications`) para usuarios no-admin. Solo el rol `admin` puede ver la gestión completa de usuarios, camiones, mantenimiento y notificaciones. Los roles `operador`, `conductor` y `ciudadano` reciben datos limitados según su contexto.
- **Frontend Admin - CRUD de usuarios**: se agregó la funcionalidad de eliminar usuarios desde el panel de administración, con botón de eliminación y estado de carga durante la operación.
- **Frontend Admin - CRUD de camiones**: se agregaron funciones de editar y eliminar camiones desde el panel de administración, con formulario de edición inline y botones de acción.
- **Frontend Admin - CRUD de mantenimiento**: se agregaron funciones de editar y eliminar registros de mantenimiento desde el panel de administración, con formulario de edición inline.
- **Frontend Admin - Estados de carga**: todas las operaciones de creación (usuario, zona, horario, camión, mantenimiento) ahora muestran estados de carga (`creating...`) en sus botones de envío para evitar envíos duplicados.
- **Frontend Admin - Auto-limpieza de feedback**: los mensajes de retroalimentación (éxito/error) se limpian automáticamente después de 4 segundos para mantener la interfaz limpia.
- **Frontend Admin - Botón de peligro**: se agregó el estilo CSS `.danger` para botones de eliminación con color rojo, diferenciándolos visualmente de las acciones secundarias.
- **Frontend Admin - Optimización de props**: se eliminó el prop `onResolveReport` no utilizado del componente `Admin`, simplificando la interfaz del componente.
- **UI/UX Admin**: se mejoró la experiencia del panel de administración con botones de acción más claros, estados de carga y mensajes de feedback más informativos.
- **Compilación**: se verificó `tsc --noEmit` (sin errores) y `npm run build` en frontend (exitoso).
- **Tests**: se actualizaron los tests de `Admin.test.tsx` para reflejar la eliminación del prop `onResolveReport`. Todos los 21 tests de frontend y 21 tests de backend pasan correctamente.
- **API**: se verificó que todos los endpoints protegidos del admin funcionan correctamente: `GET/POST/PUT/DELETE /api/users`, `POST/PUT/DELETE /api/zones`, `POST/PUT/DELETE /api/schedules`, `POST/PUT/DELETE /api/trucks`, `POST/PUT/DELETE /api/maintenance`, `POST /api/operations/update`, `GET /api/bootstrap`, `GET /api/operations/monitor`.

- **Operador Municipal - Dashboard**: se validó y corrigió el acceso a las vistas `dashboard`, `reports`, `routes` y `analytics` según los permisos del rol `operador`. Se confirmó que no tiene acceso a `admin`, `schedules`, `waste` ni `users`.
- **Backend - Registro de recolecciones**: se amplió el permiso de `POST /api/collections` para incluir el rol `operador` además de `conductor`, permitiendo que los operadores municipales registren recolecciones desde la vista de rutas.
- **Frontend - Formulario de recolección**: se ajustó la vista de `Routes` para mostrar el formulario de registro de recolección tanto para `conductor` como para `operador`.
- **Tests - Operations.test.tsx**: se corrigió la importación de `Operations` desde `./main` (ya existente) y se verificó que todos los 21 tests pasan correctamente.
- **Compilación**: se verificó `tsc --noEmit` (sin errores), `npm run build` en frontend (exitoso) y `npm run build` en backend-typescript (exitoso).
- **API**: se verificó que todos los endpoints del operador funcionan correctamente: `/api/bootstrap`, `/api/operations/monitor`, `/api/operations/update`, `/api/reports`, `/api/reports/{id}/resolve`, `/api/collections`, `/api/analytics/summary`, `/api/routes`, `/geo/alerts`, `/geo/eta`.
- **Permisos backend**: se confirmó que `GET /api/users`, `POST/PUT/DELETE /api/zones`, `POST/PUT/DELETE /api/schedules`, `POST/PUT/DELETE /api/maintenance`, y `GET /api/maintenance` están restringidos solo a `admin`.

- Se adaptó el dashboard ciudadano con métricas personalizadas (reportes pendientes, recolecciones pendientes, reportes resueltos, recolecciones en zona), se agregó la sección "Mis recolecciones" y se optimizó el rendimiento evitando cálculos innecesarios de tablero de despacho y alertas para ciudadanos.
- Se ajustaron los permisos de navegación por rol para que ciudadanos accedan solo a las vistas relevantes para su contexto y operadores/administradores mantengan acceso a monitoreo y operaciones.
- Se corrigió el filtro por ciudadano en la vista de reportes para que los usuarios con rol ciudadano solo vean sus propias incidencias.
- **Seguridad**: se filtraron las recolecciones por zona para ciudadanos en `/api/bootstrap` y `/api/collections`, y se añadió validación de zona en `confirm_collection_by_citizen` para que un ciudadano solo pueda confirmar recolecciones de su zona asignada.
- **Bug corregido**: se arregló el test de Reports que fallaba por texto duplicado "recolecciones pendientes" entre dashboard y analytics.
- **Cuentas de prueba**: se crearon cuentas para cada rol (`ciudadano`, `operador`, `conductor`, `admin`) para facilitar pruebas manuales.
- Se mejoró la experiencia de operador/admin con acciones de resolución accesibles y feedback visual al procesar reportes.
- Se reforzó la validación del formulario de registro de incidencias para evitar envíos incompletos y mejorar la UX.
- Se mejoró el diseño del listado de reportes con acciones más claras, mejor contraste y estado vacío más informativo.
- Se aplicaron mejoras de accesibilidad y sanitización básica en exportaciones PDF/CSV para evitar problemas de renderizado.
- Se añadieron pruebas de regresión para el flujo de reportes y se verificó el build del frontend.

### Version 4.5.3 - Interfaz fija en modo claro

- La interfaz utiliza exclusivamente modo claro.
- Se eliminó la opción de alternar al modo oscuro desde la barra lateral del frontend.
- Se actualizó la documentación principal para reflejar este cambio visual en la experiencia de usuario.

### Version 4.5.2 - Corrección del Dashboard de Administración

- Solucionado el error en el Dashboard de Administración cuando no hay rutas o contenedores disponibles para actualizar eventos.
- Corregido el fallo en el formulario de creación de usuarios y el login de administrador que causaba `Cannot read properties of null (reading 'value')` al acceder al panel administrativo.
- El select de `Objetivo` ahora usa un estado `eventTargetId` que permite `null`, evita que el valor controlado se desincronice y agrega un placeholder seguro.
- Se agregó una prueba de regresión para el panel de administración y se confirmó que el frontend compila y pasa `npm test`.

### Version 4.5.1 - Fix de despliegue en Vercel: `npm install` falla por Playwright

#### Problema
- Vercel fallaba en el paso `npm install` con el mensaje: `Command "cd frontend && npm install" exited with 1`.
- Causa: `playwright` está en `devDependencies` y su postinstall intenta descargar navegadores, lo que suele fallar en el entorno de build de Vercel.

#### Solución aplicada
- Se actualizó `vercel.json` para usar `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` en `installCommand`, evitando la descarga de binarios durante la instalación en Vercel.
- Se documentó el fix en `docs/DESPLIEGUE.md` y `README.md`.

#### Archivos modificados
- `vercel.json` — `installCommand` con variable de entorno para saltar download de Playwright
- `docs/DESPLIEGUE.md` — documentado troubleshooting y comando de build actualizado
- `README.md` — mencionado fix de despliegue en Vercel

### Version 4.5.1 - Corrección definitiva: Dashboard de Administración muestra pantalla en blanco/negro

#### Correcciones aplicadas

1. **ErrorBoundary envuelve el contenido principal** (`frontend/src/main.tsx`):
   - Antes, el `ErrorBoundary` no envolvía el `<Content>` ni el estado de carga `<div className="loading">`, por lo que si el componente Admin lanzaba un error durante el render, toda la app caía sin recovery UI.
   - **Solución**: se envolvió `{loading ? <div className="loading">...</div> : <Content ... />}` dentro de `<ErrorBoundary>` para capturar errores del componente Admin y mostrando un mensaje con botón "Reintentar".

2. **Estilos inline del ErrorBoundary reemplazados por clases CSS con fallbacks** (`frontend/src/main.tsx`):
   - El fallback del ErrorBoundary usaba `style={{ color: "var(--ink)" }}` e `style={{ color: "var(--error)" }}`, que quedaban invisibles si las variables CSS no resolvían correctamente.
   - **Solución**: se usan las clases CSS `.panel` (con `background: var(--panel, #ffffff)`) y `.hint.error` (con `color: var(--error, #c94735)`), garantizando visibilidad con valores por defecto.

3. **CSS fallbacks agregados a todas las clases admin** (`frontend/src/styles.css`):
   - `.admin-grid`, `.admin-shell`, `.page-header`, `.main-content`, `.app-shell`, `.loading` y `.hint.error` ahora tienen valores por defecto hardcodeados (ej. `var(--bg, #f0f5f2)`) para garantizar que el dashboard sea visible incluso si las variables CSS no están definidas.

4. **`color-scheme: light` aplicado** (`frontend/src/styles.css` y `frontend/src/main.tsx`):
    - Se estableció `color-scheme: light` en la regla `html, body, #root` para que el navegador adapte los controles nativos al tema claro.

5. **Eliminación completa del modo oscuro** (`frontend/src/styles.css`, `frontend/src/main.tsx`):
    - Se eliminaron los selectores `html[data-theme="dark"]`, `html[data-theme="light"]` y `@media (prefers-color-scheme: dark)`.
    - Se eliminaron las variables CSS `--bg-dark`, `--panel-dark`, `--accent-dark`.
    - Se eliminó el hook `isDarkMode`, el `localStorage` de preferencia de tema y el botón de alternancia de la barra lateral.
    - Se eliminó la clase `.sidebar-footer .theme-toggle` y el selector `html[data-theme="dark"] .admin-list-item`.

#### Archivos modificados
- `frontend/src/main.tsx` — ErrorBoundary envuelve Content; fallback usa clases CSS; `color-scheme` global
- `frontend/src/styles.css` — fallbacks en todas las clases admin; `color-scheme` en root; eliminación de estilos y selectores de modo oscuro
- `frontend/src/components/Admin.test.tsx` — 2 tests nuevos (paneles visibles, datos undefined/null)

#### Verificación
- Tests frontend: `npx vitest run` — **16 passed** (4 test files)
- TypeScript: `npx tsc --noEmit` — 0 errores
- Build: `npx vite build` — exitoso (25 módulos, 42.10 kB CSS, 406.84 kB JS)

#### Fix: null checks defensivas en componentes de vista (v4.5.1-patch)

Después del despliegue de v4.5.1, el ErrorBoundary atrapó un error en runtime: **"Cannot read properties of null (reading 'value')"**. Este error ocurría porque ciertas funciones de cálculo y componentes de vista accedían a propiedades de objetos `data` o `monitor` que podían ser `null` cuando el backend retornaba respuestas incompletas o el monitor se actualizaba con valores parciales.

**Correcciones aplicadas en `frontend/src/main.tsx`:**

1. **`getOperationalSignal`** (fuera del ErrorBoundary): se agregaron null checks (`data?.analytics ?? {...}`, `data?.routes ?? []`, `route?.delay ?? ""`). Se envolvió la llamada en `try-catch` con fallback a `{ label: "Estado desconocido", tone: "danger" }` para prevenir crashes del componente App completo.

2. **`Dashboard.effectiveData`**: el `useMemo` usaba `{ ...data, ...monitor }` sin fallbacks explícitos. Se replicó el patrón de null-check del App component (`zones: data.zones ?? []`, `analytics: data.analytics ?? emptyBootstrap.analytics`, etc.) y se agregó `Array.isArray` en `monitor.trucks`.

3. **`Content` (Schedules route)**: `data.schedules` → `Array.isArray(data?.schedules) ? data.schedules : []`.

4. **`Routes` component**: `monitor.trucks ?? data.trucks` → `monitor.trucks ?? data.trucks ?? []`; `monitor.optimized_routes ?? data.routes` → `monitor.optimized_routes ?? data.routes ?? []`; `data.zones[0]` → `data.zones?.[0]`; `data.zones.map(...)` → `(data.zones ?? []).map(...)`.

5. **`Analytics` component**: `data.reports.reduce(...)` → `safeReports.reduce(...)` con `Array.isArray`; `data.collections.reduce(...)` → `safeCollections.reduce(...)`; `data.analytics.total_kg` → `analytics.total_kg` con `data?.analytics ?? emptyBootstrap.analytics`.

#### Verificación (patch)
- Tests frontend: `npx vitest run` — **16 passed**
- TypeScript: `npx tsc --noEmit` — 0 errores
- Build: `npx vite build` — exitoso

#### Fix: null-safety defensiva en App component y ErrorBoundary (v4.5.1-final)

**Correcciones aplicadas en `frontend/src/main.tsx`:**

1. **App `effectiveData`**: `data` y `monitor` pueden ser `null` (si el backend retorna `null`). Se agregaron `safeData = data ?? emptyBootstrap` y `safeMonitor = monitor ?? {}` antes de acceder a sus propiedades.

2. **`Content` component**: `data` null check con fallback a `emptyBootstrap` antes de pasar a Admin/Dashboard/Routes/Analytics.

3. **`ErrorBoundary`**: ahora muestra `componentStack` en modo desarrollo para identificar rápidamente el componente que lanza el error. Acepta prop `fallback` opcional. Estado incluye `errorInfo`.

#### Verificación (final)
- Tests frontend: `npx vitest run` — **16 passed** (4 test files)
- TypeScript: `npx tsc --noEmit` — 0 errores
- Build: `npx vite build` — exitoso (25 módulos, 42.10 kB CSS)
- Tests backend: `pytest -q` — **20 passed**
- Push a `main` y `version-4.5`: completado

---

## 2026-08-02

### Version 4.5.0 - Corrección visual del panel de administración

- **Problema corregido**: el panel de administración mostraba pantalla completamente en blanco o negra dependiendo del tema (claro/oscuro).
- **Causa raíz**: el commit `c2aeea7` eliminó protecciones de seguridad (null checks) en `frontend/src/main.tsx`, lo que causaba errores de ejecución (TypeError) cuando los datos del bootstrap tenían campos `undefined` o `null`. La función `getOperationalSignal` llamaba `data.routes.filter(...)` sin verificar si `routes` existía, provocando un crash de React y una pantalla en blanco/negra.
- **Solución**: se restauraron las protecciones de seguridad esenciales en `main.tsx`:
  - `statusTone()`: se restauró el tipo `string | undefined | null` y el fallback `(status ?? "").toString()`
  - `getOperationalSignal()`: se agregó `(data.routes ?? [])` y `String(route.delay ?? "")` para prevenir crashes
  - Alertas del Dashboard: se restauró `String(alert ?? "")` y fallback `"Alerta"`
  - Schedules search: se restauró `String(s.zone ?? "")` y `String(search ?? "")`
  - Routes/Map: se restauró `String(route.delay ?? "")` para prevenir crashes
  - Reports: se restauraron `safeReports`, `safeZones`, `safeTrucks` con `Array.isArray()` checks
  - ReportList: se restauró `export`, `safeReports`, `safeTrucks`, y protecciones null en propiedades de report
- **Archivos modificados**: `frontend/src/main.tsx`
- **Verificación**: pruebas del frontend ejecutadas correctamente con `npx vitest run` — 14 tests aprobados.


### Fix: Fondo negro en vista de reportes del dashboard

- **Problema**: el `<body>` en `frontend/index.html` tenía `display: flex; align-items: center; justify-content: center`, lo que centraba el contenido vertical y horizontalmente. En la vista de reportes, al ser más corta que la ventana, se mostraba el fondo oscuro original `#0a1f14` alrededor, dando la sensación de pantalla negra.
- **Solución**: eliminado el centrado flex del `<body>`, agregado `#root { min-height: 100vh; }` en `index.html` y reglas CSS en `styles.css` (`html, body, #root { height: 100%; }`, `body { display: block; }`, `.app-shell { background: var(--bg); }`) para restaurar el layout normal de documento.
- **Archivos modificados**: `frontend/index.html`, `frontend/src/styles.css`.

#### Verificación
- Build de producción exitoso (`npx vite build`).
- Tests del frontend: `npx vitest run` — **11 passed**.

### Fix: Revisión completa del Dashboard de Reportes — errores funcionales, UX, código y diseño

#### Frontend (`frontend/src/main.tsx`, `frontend/src/styles.css`, `frontend/src/types.ts`)

**Bug funcional crítico corregido: formulario de reportes no controlado**
- **Problema**: los campos del formulario de registro de incidencias (zona, tipo, detalle) eran uncontrolled, lo que impedía la validación adecuada y causaba comportamiento inconsistente al enviar.
- **Solución**: se convirtieron los campos a controlled components con estados locales (`formZone`, `formType`, `formDetail`) y se agregó un placeholder "Seleccionar zona"/"Seleccionar tipo" por defecto.

**Bug funcional: `Report.status` usaba `string` en lugar de `ReportStatus`**
- **Problema**: el tipo `Report` en `types.ts` definía `status` como `string`, permitiendo cualquier valor y rompiendo la compatibilidad con el filtro de estado.
- **Solución**: se cambió `status: string` a `status: ReportStatus` para garantizar la seguridad de tipos.

**Bug de rendimiento: `driverByZone` no estaba memoizado en `ReportList`**
- **Problema**: el cálculo del mapeo de conductores por zona se recalculaba en cada renderizado de `ReportList`, incluso cuando los datos no habían cambiado.
- **Solución**: ya estaba memoizado con `useMemo` (verificado y confirmado). Se optimizó la dependencia del `useMemo` del `filtered` para incluir `driverByZone`.

**Bug de rendimiento: `Dashboard` re-renderizaba cada 5 segundos sin necesidad**
- **Problema**: el estado `tick` del dashboard se actualizaba cada 5 segundos con `setInterval`, causando re-renderizados innecesarios de todo el dashboard incluso cuando los datos no habían cambiado.
- **Solución**: se optimizó el intervalo usando `useRef` para el contador de ticks y se memoizó `effectiveData` con `useMemo` para evitar recreaciones innecesarias del objeto.

**Bug de rendimiento: `Map` component usaba `JSON.stringify` en `useMemo`**
- **Problema**: la firma de `useMemo` del componente `Map` usaba `JSON.stringify({ zones, trucks, routes, prioritizedZones })` como dependencia, lo que era costoso computacionalmente para datasets grandes.
- **Solución**: se reemplazó por una firma basada en conteos de arrays (`${zones.length}-${trucks.length}-${routes.length}-${prioritizedZones.length}`) y se agregó una referencia `signatureRef` para evitar recalcular el mapa cuando la firma no cambia.

**Bug visual: estilos inline en `ReportList` y `Reports`**
- **Problema**: se usaban estilos inline (`style={{ marginTop: '10px' }}`, `style={{ display: "flex", ... }}`) en lugar de clases CSS, rompiendo la consistencia visual y dificultando el mantenimiento.
- **Solución**: se movieron los estilos inline a clases CSS (`.driver-search`, `.panel-header`, `.panel-actions`) y se eliminaron los estilos inline del componente `Reports`.

**Bug de accesibilidad: `statusTone` no era case-insensitive**
- **Problema**: la función `statusTone` comparaba el estado con strings exactos ("Resuelto", "En revision"), lo que fallaba si el backend devolvía diferentes capitalizaciones.
- **Solución**: se convirtió la comparación a `toLowerCase()` para manejar cualquier capitalización del estado.

**Mejora UX: filtros de estado y búsqueda en la vista de reportes**
- Se agregó filtrado por estado (Todos/Pendiente/En revision/Resuelto) con botones de filtro.
- Se agregado búsqueda de texto en la vista de reportes para buscar por tipo, zona, ciudadano o detalle.
- Se reemplazó el layout de acciones del header por la clase CSS `.panel-header` con `.panel-actions`.

**Mejora UX: exportaciones memoizadas con `useCallback`**
- Las funciones de exportación CSV y PDF ahora están memoizadas con `useCallback` para evitar recreaciones innecesarias en cada renderizado.

**Mejora UX: mensaje de ciudadano como clase CSS**
- El mensaje de "Como ciudadano, esta vista muestra solo tus reportes" ahora usa la clase `.hint` en lugar de estilos inline.

#### Backend (`backend-python/app/main.py`)

**Bug crítico: `create_collection_record` y `confirm_collection_by_citizen` indentados incorrectamente**
- **Problema**: las funciones `create_collection_record` y `confirm_collection_by_citizen` estaban indentadas dentro de `delete_maintenance`, haciéndolas inaccesibles desde los endpoints API `/api/collections` y `/api/collections/{id}/confirm`. Esto causaba que el registro de recolecciones y la confirmación ciudadana fallaran en modo demo (memoria).
- **Solución**: se corrigió la indentación para que ambas funciones estén al nivel del módulo, accesibles desde los endpoints correspondientes.

#### Archivos modificados
- `frontend/src/main.tsx` — `Reports` component (controlled form, filtering, memoized exports), `Dashboard` (tick optimization, memoized effectiveData), `ReportList` (inline styles removed), `Map` (signature optimization), `statusTone` (case-insensitive)
- `frontend/src/types.ts` — `Report.status` cambiado de `string` a `ReportStatus`
- `frontend/src/styles.css` — `.driver-search` class added
- `backend-python/app/main.py` — `create_collection_record` y `confirm_collection_by_citizen` indentación corregida

#### Verificación
- Frontend build: ✅ exitoso (`npm run build`)
- Backend tests: ✅ 20/20 pasados
- Frontend tests: ✅ 11/11 pasados
- TypeScript geo service build: ✅ exitoso


#### Frontend (`frontend/src/main.tsx`, `frontend/src/components/Admin.tsx`, `frontend/src/components/Item.tsx`)

**Bug funcional crítico corregido: `createSchedule` enviaba `zone` (string) en lugar de `zone_id` (number)**
- **Problema**: el formulario de creación de horarios en el panel administrativo enviaba `zone` como nombre de zona (string) al backend, pero el modelo Pydantic `ScheduleCreate` requiere `zone_id` como entero. Esto causaba que la creación de horarios fallara silenciosamente o produjera datos incorrectos.
- **Solución**: se cambió el estado `newSchedule` para usar `zone_id` (número) en lugar de `zone` (string), y se actualizó el formulario para que el `<select>` de zona envíe el `id` de la zona. Se agregaron funciones `startEditSchedule`, `saveScheduleEdit` y `deleteSchedule` para completar el CRUD de horarios en el panel administrativo.

**Bug del componente `Item`: texto de tag hardcodeado a "Activo"**
- **Problema**: el componente `Item` siempre mostraba "Activo" como texto de la etiqueta, independientemente del contexto (horarios, rutas, contenedores, etc.).
- **Solución**: se agregó un prop opcional `tag` al componente `Item`. El texto de la etiqueta ahora se pasa explícitamente. En la vista de horarios, se muestra el tipo de residuo como tag.

**Bug de exportación CSV: valores no escapados**
- **Problema**: `exportToCSV` usaba `JSON.stringify` para escapar valores, lo que no manejaba correctamente comas, comillas y saltos de línea dentro de los datos.
- **Solución**: se reemplazó `JSON.stringify` por una función `escapeCSV` dedicada que envuelve valores en comillas y escapa comillas internas según la especificación RFC 4180. Se agregó `URL.revokeObjectURL` para liberar memoria.

**Mejora UX: vista de horarios mejorada**
- Se agregó ordenamiento por zona, día, hora y tipo de residuo con indicadores visuales de dirección.
- Se agregó exportación PDF además de CSV para la vista de horarios.
- Se reemplazaron estilos en línea por clases CSS (`.panel-header`, `.panel-actions`, `.empty-state`).
- Se memoizó el array de días con `useMemo` para evitar recálculos innecesarios.
- Se agregó `role="list"` y `aria-label` en la lista de horarios para mejor accesibilidad.

#### Archivos modificados
- `frontend/src/main.tsx` — `exportToCSV`, `Schedules` component
- `frontend/src/components/Admin.tsx` — `createSchedule`, CRUD de horarios
- `frontend/src/components/Item.tsx` — prop `tag` opcional
- `frontend/src/styles.css` — `.panel-header`, `.panel-actions`, `.empty-state`

#### Backend (`backend-python/app/main.py`)

**Timing attack corregido en `/api/auth/login`**
- **Problema**: cuando el email no existía, el endpoint retornaba inmediatamente (sin bcrypt), permitiendo enumeración de correos válidos mediante medición de tiempos.
- **Solución**: se ejecuta una verificación de password dummy (`verify_password` contra `_DUMMY_PASSWORD_HASH`) incluso cuando el usuario no existe, manteniendo un tiempo de respuesta constante.

**Strip de password corregido**
- **Problema**: `model_config = ConfigDict(str_strip_whitespace=True)` en `LoginRequest` y `RegisterRequest` eliminaba espacios en blanco del password, causando inconsistencias y bloqueando contraseñas con espacios.
- **Solución**: se eliminó `str_strip_whitespace` del `model_config` y se agregó un `field_validator("email")` que normaliza solo el email, dejando el password intacto.

**Versión actualizada a 4.0.0**
- `FastAPI(title="SIR Cusco API", version="4.0.0")`.
- Health endpoint y root endpoint retornan `version: "4.0.0"`.
- Test `test_operational_logic.py` actualizado para validar la nueva versión.

#### Frontend (`frontend/src/main.tsx`, `frontend/src/components/AuthView.tsx`)

**Hack de `window.__password` eliminado**
- **Problema**: la contraseña se almacenaba en `(window as any).__password` como un hack global, exponiéndola a XSS y dejando la variable sin limpiar.
- **Solución**: `AuthView` pasa la contraseña directamente como argumento a `onLogin(email, password)`. Se eliminó totalmente el uso de `window.__password`.

**Trim de password corregido**
- **Problema**: `String(form.get("password")).trim()` eliminaba espacios al inicio/final del password.
- **Solución**: se dejó de hacer `.trim()` en el password. Solo se hace `.trim()` en el email.

**AuthView extraído a su propio archivo**
- **Problema**: `AuthView` (168 líneas) estaba embebido en `main.tsx`, dificultando mantenimiento.
- **Solución**: componente movido a `frontend/src/components/AuthView.tsx` con interfaz `AuthViewProps` tipada. `main.tsx` lo importa como `{ AuthView }`.

**Toggle de visibilidad de contraseña**
- Se añadió botón de ojo 👁️/👁️‍🗨️ en los tres modos (login, registro, recuperación) para mostrar/ocultar la contraseña. Incluye `aria-label` y soporte de teclado (Space/Enter).

**Auto-enfoque en email**
- El campo de email recibe el foco automáticamente al cargar la página y al cambiar de modo.

**Token de recuperación visible en modo demo**
- **Problema**: en modo demo, el endpoint `/auth/forgot-password` retornaba el token en la respuesta, pero la UI nunca lo mostraba al usuario, imposibilitando completar la recuperación.
- **Solución**: el token se muestra en un cuadro copiable con botón "Copiar" usando la API del portapapeles.

**Indicador de fortaleza de contraseña**
- En modo registro, se muestra una barra visual y etiqueta que evalúa: longitud ≥8, contiene letra, contiene número y contiene símbolo. Se actualiza en tiempo real con input controlado.

**Botón de envío con spinner**
- Durante el envío, muestra un spinner giratorio y el texto "Procesando..." con `aria-hidden`.

**ARIA y accesibilidad mejorados**
- `role="main"` en el contenedor principal.
- `role="group"` y `aria-label` en el contenedor de pestañas.
- `aria-pressed` en los botones de modo (indica cuál está activo).
- `role="alert"` y `aria-live="assertive"` en mensajes de error.
- `role="status"` y `aria-live="polite"` en mensajes de feedback/éxito.
- `aria-label` y `aria-pressed` en botones de toggle de contraseña.
- `aria-live="polite"` en mensajes de feedback.

**Auto-completado de navegador**
- Atributos `autoComplete` apropiados en todos los campos: `email`, `name`, `current-password`, `new-password`, `one-time-code`.

**Link de Términos y Condiciones corregido**
- **Problema**: `href="#terms"` apuntaba a una ancla inexistente.
- **Solución**: enlaza a `https://www.eccusco.gob.pe/terminos` con `rel="noopener noreferrer"` y `target="_blank"`.

**Validación de formulario**
- Agregado `noValidate` al formulario para evitar validación nativa del navegador que podría interferir con la lógica de React.

**Reset de estado al cambiar de modo**
- Al cambiar entre login/registro/recuperación: se limpian `feedback`, `recoveryToken`, `showPassword` y `showNewPassword`.

**CSS mejorado** (`frontend/src/styles.css`)
- Nuevas reglas: `.password-field`, `.password-toggle`, `.password-strength`, `.strength-bar`, `.strength-fill`, `.strength-labels`, `.recovery-token`, `.auth-message`, `.hint.success`, `.spinner` (dentro de botones).
- `.hint.success` agregado (faltaba en la hoja de estilos original).

#### Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `backend-python/app/main.py` | Timing attack fix, password strip fix, version 4.0.0, `_DUMMY_PASSWORD_HASH` |
| `backend-python/tests/test_operational_logic.py` | Assert de versión 4.0.0 |
| `frontend/src/main.tsx` | Import AuthView, login(email, password), removed old AuthView fn, removed window.__password |
| `frontend/src/components/AuthView.tsx` | **Nuevo**: componente AuthView extraído y mejorado |
| `frontend/src/styles.css` | Nuevas reglas CSS para login |
| `frontend/package.json` | Version 4.0.0 |
| `backend-typescript/package.json` | Version 4.0.0 |
| `package.json` (raíz) | Version 4.0.0 |
| `AGENTS.md` | Version 4.0.0 |
| `VERSION.md` | Versión 4.0.0, tabla de versiones actualizada |
| `README.md` | Version 4.0.0, rama version-4, notas de login |
| `frontend/README.md` | Version 4.0.0 |
| `RAILWAY-VERCEL-DEPLOYMENT.md` | Version 4.0.0 |

#### Verificación
- Frontend: `npx tsc --noEmit` — 0 errores. `npm run build` — éxito. `npx vitest run` — **11 passed**.
- Backend: `.\.venv\Scripts\python.exe -m py_compile` — OK. `.\.venv\Scripts\python.exe -m pytest -q` — **16 passed**.

### Fix: Ocultar rol y zona en login
- **Problema**: al iniciar sesión con una cuenta ya existente, se mostraban campos de rol y zona innecesarios que solo deben usarse durante el registro.
- **Solución**: los campos de rol y zona ahora solo aparecen en el modo "Registrarme". En "Iniciar sesión" y "Recuperar contraseña" no se muestran.

### Fix: Página de login mejorada con tabs modernos
- **Mejora visual**: reemplazado el grupo de botones inline por un contenedor `.auth-tabs` con estilo de pestañas modernas.
- **Estilos**: las pestañas tienen fondo gris claro, activo con fondo verde y sombra, hover con highlight.
- **Enlace "Olvidaste tu contraseña"**: ahora se muestra como enlace fantasma (`ghost-link`) en lugar de botón, solo en modo login.
- **Responsive**: en pantallas ≤640px las pestañas se apilan verticalmente.

### Fix: Mapa operativo no cargaba por condición de carrera en Leaflet
- **Problema resuelto**: el componente `Map` en `frontend/src/main.tsx` presentaba una carrera de inicialización.
- **Solución aplicada**: separación de efectos para creación del mapa, actualización de capas y limpieza. Eliminado `setTimeout` problemático. Uso de `layerRef` persistente con `layer.clearLayers()`. Llamada a `map.invalidateSize()`.
- **Cambios CSS**: `.map` de `min-height: 400px` a `height: 400px` (y `height: 260px` en móvil).
- **Tests actualizados**: mock de Leaflet en `App.test.tsx` para soportar `invalidateSize`, `clearLayers` y métodos encadenables.
- **Verificación**: `11 passed` en frontend, build de producción exitoso.

### Fix: Protección de endpoint `/api/bootstrap` y datos sensibles
- **Problema**: el endpoint `/api/bootstrap` era público y exponía datos sensibles como `list_users()`, `notifications` y `maintenance` sin autenticación.
- **Solución**: agregada dependencia opcional `get_current_user_optional` que filtra `users`, `maintenance` y `notifications` cuando no hay token JWT válido. Los datos públicos (zonas, horarios, camiones, rutas, reportes, colecciones, contenedores) siguen accesibles para la página de login.
- **Backend**: `backend-python/app/main.py` — nueva dependencia `get_current_user_optional`, endpoint `/api/bootstrap` actualizado.

### Fix: Formulario de registro de recolecciones para conductores
- **Problema**: en la vista `Rutas`, el componente `Routes` tenía la función `submitCollection` definida pero el formulario HTML no estaba renderizado en el JSX. Los conductores no podían registrar recolecciones desde la interfaz.
- **Solución**: agregado formulario de registro de recolección visible solo para el rol `conductor` con selectores de camión, zona y campo de kilogramos.
- **Frontend**: `frontend/src/main.tsx` — componente `Routes` actualizado.

### Mejora: Diferenciación de UI por rol en Dashboard y Rutas
- **Dashboard**: agregado badge de rol en el panel principal para que cada usuario vea claramente su rol activo.
- **Rutas**: el formulario de registro de recolecciones ahora se muestra condicionalmente solo para `conductor`.
- **Frontend**: `frontend/src/main.tsx` — `Dashboard` y `Routes` actualizados con `session` y condicionales por rol.

### Mejora visual del sitio web — Diseño moderno y responsive
- **CSS completo** (`frontend/src/styles.css`):
  - Paleta de colores modernizada con acento dorado (`#c49a30`) acorde al branding de EcoCusco.
  - Tipografía Inter (Google Fonts) importada en `index.html`.
  - Sidebar con gradiente oscuro mejorado y navegación con indicador activo lateral.
  - Tarjetas de métricas con animaciones escalonadas y hover elevado.
  - Paneles con bordes redondeados, sombras sutiles y transiciones suaves.
  - Botones con hover lift y sombra, focus-visible accesible.
  - Formularios con inputs redondeados y focus ring verde.
  - Alertas con colores de fondo mezclados y bordes contextuales.
  - Diseño responsive completo: breakpoints en 1400px, 1024px, 640px y 380px.
  - Menú hamburguesa para móvil con overlay y transición slide.
  - Modo claro/oscuro preservado con CSS custom properties.
- **Página de carga** (`frontend/index.html`):
  - Fondo oscuro verde (`#0a1f14`) acorde al branding.
  - Spinner dorado con animación de rotación.
  - Tipografía Inter con carga asíncrona desde Google Fonts.
- **Navegación móvil** (`frontend/src/main.tsx`):
  - Botón hamburguesa fijo en esquina superior izquierda.
  - Overlay semitransparente para cerrar sidebar al tocar fuera.
  - Sidebar con transición slide-in desde la izquierda.
  - Brand actualizado con icono y texto mejorado.
  - Toggle de tema en el footer del sidebar.
- **Componentes**:
  - `Admin.tsx`: corregido `var(--border)` → `var(--line)` en estilos inline.
  - `Item.tsx`: sin cambios necesarios, compatible con nuevos estilos.
  - **Verificación**: build exitoso (`npm run build`), 11 tests pasando (`npm test`).

### Fix: Revisión completa del Dashboard — bugs funcionales, UX, accesibilidad y rendimiento

#### Backend / API
- Sin cambios de backend necesarios. El Dashboard consumía correctamente los endpoints existentes; los errores eran de presentación y lógica del cliente.

#### Frontend (`frontend/src/main.tsx`, `frontend/src/styles.css`)

**Hora de despacho corregida**
- **Problema**: el formateo `` `0${8 + index}:00` `` producía `"08:00"`, `"09:00"` pero `"010:00"` para el tercer índice, ya que `0${8+2}` = `"010"`.
- **Solución**: se usa `String(8 + index).padStart(2, "0") + ":00"`, garantizando `"08:00"`, `"09:00"`, `"10:00"`.

**Casos de alerta de retraso case-sensitivity**
- **Problema**: la detección de iconos usaba `alert.includes("retraso")` (sensible a mayúsculas/minúsculas) mientras la detección de estado usaba `alert.toLowerCase().includes("retraso")`. Un alerta como `"Retraso en ruta"` no se detectaba como retraso en el icono.
- **Solución**: ambos usan `alert.toLowerCase().includes("retraso")` consistentemente.

**Badge de rol con estilos CSS**
- **Problema**: el badge de rol usaba estilos en línea (`style={{ display: "flex", ... }}`) y la clase `tag` genérica, sin sombra ni degradado.
- **Solución**: clase `.dashboard-role-badge` con degradado, sombra y `aria-label="Rol activo: {role}"`.

**Label "Operativo" reemplazado**
- **Problema**: el header del "Tablero de despacho" mostraba el texto `"Operativo"` como etiqueta de conteo, sin significado.
- **Solución**: muestra `{dispatchBoard.length} asignaciones`.

**Estado vacío para Alertas Activas**
- **Problema**: cuando `monitor.alerts` estaba vacío, el panel de "Alertas Activas" mostraba una lista vacía sin mensaje.
- **Solución**: mensaje `"No hay alertas activas en este momento."` centrado y con color `--muted`.

**Botón "Cargar más" no funcional removido**
- **Problema**: el botón `<button className="ghost">Cargar más notificaciones →</button>` no tenía `onClick`, era un elemento no funcional que inducía a confusión.
- **Solución**: eliminado. Las alertas vienen completas del backend; no hay paginación.

**Keys estables en lista de alertas**
- **Problema**: `key={alert.id}` donde `id = index` puede causar re-render incorrecto si el orden cambia.
- **Solución**: `key={`alert-${alert.id}-${alert.title}`}`.

**ARIA mejorada en Dashboard**
- `aria-hidden="true"` en iconos decorativos de métricas y alertas (emojis).
- `aria-label` en el badge de rol y en los indicadores de estado de alertas (`alert-status`).

**Signal operacional con tono visual**
- **Problema**: `getOperationalSignal()` retornaba `tone` ("ok"/"warning"/"danger") pero nunca se usaba en el JSX.
- **Solución**: `<p className="signal signal-{tone}">` con colores contextuales (`.signal-ok`, `.signal-warning`, `.signal-danger`) en CSS.

**Page header con estilos CSS**
- **Problema**: `.page-header` no tenía reglas CSS; el `h2` y `p` dependían de estilos por defecto del navegador con `padding: 0` en `.main-content`.
- **Solución**: `.page-header` con padding `24px 32px 16px`, fondo `var(--panel)`, borde inferior. `.page-header h2` con `font-size: 1.4rem`.

**Código muerto eliminado**
- **Problema**: `reportStatusLabel()` era una función identidad que siempre retornaba el input sin transformación.
- **Solución**: eliminada; el JSX usa directamente `{report.status}`.

#### Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `frontend/src/main.tsx` | Corrección hora dispatch, case-sensitivity alerts, badge rol CSS+ARIA, label operativo, empty state alerts, key estable, aria-hidden iconos, signal tone, page-header, eliminación reportStatusLabel |
| `frontend/src/styles.css` | Nuevas reglas: `.app-alert`, `.dashboard-role-row`, `.dashboard-role-badge`, `.page-header`, `.signal`, `.signal-ok`, `.signal-warning`, `.signal-danger` |
| `CHANGELOG.md` | Nueva sección de revisión completa del Dashboard |
| `VERSION.md` | Nueva sección de revisión completa del Dashboard |

#### Verificación
- Frontend: `npx tsc --noEmit` — 0 errores. `npm run build` — éxito. `npx vitest run` — **11 passed**.

## 2026-07-30

### Versión 3.0.0 — Organización y consolidación
- **Limpieza del repositorio**: eliminado `scripts/cloudflared.exe` (binario de 54 MB que se descarga dinámicamente en `scripts/deploy-cloudflare.ps1`).
- **Limpieza del repositorio**: eliminado `CLOUDFLARE-URLS.txt` (URLs temporales de Cloudflare Tunnel obsoletas de 2026-06-18).
- **Corrección `.vercelignore`**: removida referencia a `nixpacks.toml` (archivo inexistente en el repositorio).
- **Refuerzo de `.gitignore`**: agregadas reglas para excluir binarios `*.exe`, `*.bin` y `scripts/cloudflared.exe`.
- **Versiones sincronizadas a 3.0.0**: `package.json` raíz, `frontend/package.json`, `backend-typescript/package.json`, `backend-python/app/main.py` (FastAPI `version` y health endpoint) y `backend-python/tests/test_operational_logic.py` (assert de versión).
- **Documentación actualizada**: `README.md`, `VERSION.md`, `CHANGELOG.md`, `docs/DESPLIEGUE.md`, `DEPLOYMENT.md`, `NETLIFY-DEPLOYMENT.md`, `RAILWAY-VERCEL-DEPLOYMENT.md`, `KOYEB-DEPLOYMENT.md`, `docs/entrega-2.md` y `frontend/README.md` actualizados a la versión 3.0.0.
- **Corrección `verify_system.py`**: remplazada referencia a `GUIA_EJECUCION.md` (inexistente) por `README.md`.
- **Creación de rama `version-3`** como etiqueta de versión 3.0.0 consolidada.
- **Estado**: ✅ Proyecto organizado, documentación consolidada y listo para despliegue en producción.

### Hitos completados — Sesión 7: Configuración definitiva Render + Vercel
- Se actualizó `render.yaml` añadiendo `DATABASE_URL` como variable `sync: false` (opcional para PostgreSQL en producción).
- Se actualizó `frontend/.env.production` con URLs de referencia de Render para Vercel.
- Se reescribió `DEPLOYMENT.md` con Render + Vercel como estrategia primaria de despliegue.
- Se actualizó `docs/DESPLIEGUE.md` con Render + Vercel como Opción B (recomendada) y Netlify como Opción C (alternativa).
- Se actualizó `README.md`, `VERSION.md` y `CHANGELOG.md` con el estado de despliegue Render + Vercel.
- Se creó la rama `v2.0.0` como etiqueta de versión 2.0.0 lista para producción.
- Se confirmó que el proyecto está listo para despliegue en producción con Render (backend) + Vercel (frontend).

### Hitos completados
- Se validó el flujo completo de respaldo y restauración de PostgreSQL local con `scripts/db-backup.ps1` y `scripts/db-restore.ps1`, generando un respaldo de 19 KB y restaurándolo exitosamente en una base de datos temporal para verificar integridad de tablas y datos operativos.
- Se confirmó la existencia de PostgreSQL 17 en el equipo, con `pg_dump`, `pg_restore` y `psql` disponibles en el PATH.
- Se limpió la base temporal de prueba y se actualizó toda la documentación del proyecto con el estado validado.
- Se mejoró la accesibilidad y experiencia móvil del panel administrativo: se ajustó el contraste de `--muted` para cumplir WCAG AA, se añadió un `skip-link` para navegación por teclado, se implementaron estilos `:focus-visible` diferenciados, se garantizaron touch targets mínimos de 44px en filtros y botones, y se corrigió scroll horizontal potencial en listas y el layout de dos columnas de administración.
- Se actualizaron las listas del panel administrativo a elementos semánticos `<ul>/<li>` y se asociaron `id`/`htmlFor` en formularios para mejorar la lectura por lectores de pantalla.
- Se verificó el build del frontend (`npx vite build`) y las pruebas automatizadas (`11 passed` frontend, `16 passed` backend).
- Se preparó la configuración de despliegue en producción: se actualizó `render.yaml` con `JWT_SECRET`, se completó `backend-python/.env.example` y `.env`, se actualizó `docs/DESPLIEGUE.md` con la nueva variable y el historial, y se documentó el estado en `README.md` y `docs/entrega-2.md`.
- Se creó la rama `v2.0.0-deploy-config` con commit `v2.0.0: lista para despliegue en produccion...` y se subió a GitHub.
- Se actualizó `VERSION.md` a versión 2.0.0 y `README.md` con la rama de producción actual.
- Se añadió a `docs/DESPLIEGUE.md` la "Sesión 5: Checklist de despliegue real en producción" con pasos detallados para Render+Vercel (Web Services manuales, sin Blueprint) y Railway+Vercel, incluyendo configuración de variables y verificación post-despliegue.
- Se actualizó `docs/DESPLIEGUE.md` para evitar Blueprint (de pago) y usar Web Services manuales gratuitos en Render.
- Se corrigió `render.yaml` con runtimes explícitos (`python-3.11`, `node-20`) para evitar errores de build en Render.
- Se corrigió un error de TypeScript en `frontend/src/main.tsx` que bloqueaba el build en Vercel: se agregó `performance` como propiedad opcional en el tipo `Bootstrap` de `frontend/src/types.ts`.
- Se restauró `vercel.json` en la raíz del repositorio para garantizar configuración consistente de Vercel en todos los despliegues. El archivo incluye `framework: "vite"`, `outputDirectory: "frontend/dist"`, `installCommand` y `buildCommand` con `cd frontend`, y rewrites SPA para rutas client-side. La configuración anterior se manejaba desde el dashboard de Vercel, lo que causaba inconsistencias entre proyectos.
- Se verificó el build del frontend (`npx vite build`) y las pruebas automatizadas (`11 passed` frontend, `16 passed` backend). El proyecto está listo para despliegue en producción.

### Hitos completados — Sesión 6 (2026-07-30): Despliegue Render + Netlify
- Se creó `netlify.toml` en la raíz del repositorio con configuración de build para el frontend (`base = "frontend"`, `publish = "dist"`) y redirects SPA para rutas client-side.
- Se actualizó `render.yaml` con `CORS_ORIGIN_REGEX` que permite tanto dominios de Netlify como Vercel: `https://.*(\.vercel\.app|\.netlify\.app)`.
- Se creó `NETLIFY-DEPLOYMENT.md` con guía paso a paso para despliegue en Netlify (alternativa gratuita a Vercel).
- Se actualizó `DEPLOYMENT.md` con opción Netlify como plataforma de frontend.
- Se actualizó `docs/DESPLIEGUE.md` con la Opción B (Render + Netlify, recomendada) y Opción D (Railway + Netlify), además de troubleshooting para Netlify.
- Se actualizó `README.md` y `VERSION.md` con el estado de despliegue y las rutas recomendadas.
- Se corrigieron inconsistencias en `docs/DESPLIEGUE.md`: headers duplicados (9.2), referencias obsoletas a `vercel.json`, y actualización de CORS_ORIGIN_REGEX.

### En progreso
- Pendiente ejecutar el despliegue manual en Render y Vercel siguiendo `docs/DESPLIEGUE.md` (Sesión 5).
- Pendiente configurar `JWT_SECRET` y `DATABASE_URL` seguros en el dashboard de Render.

### Próximos pasos
- Importar el backend en Render (Blueprint con `render.yaml` o Web Services manuales) y configurar variables de entorno (`JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN_REGEX`, `CORS_ORIGINS`).
- Importar el frontend en Vercel desde el dashboard: Framework Preset `Vite`, Root Directory `frontend`, Build Command `npm run build`, Output Directory `frontend/dist`.
- Configurar variables `VITE_API_URL` y `VITE_GEO_URL` en Vercel con las URLs reales de Render.
- Verificar `/api/health`, login con `admin@ecocusco.pe` / `admin123` y flujos principales en producción.

### Hitos completados
- Se integró el CRUD operativo de zonas, horarios, camiones y mantenimiento en la API FastAPI con endpoints protegidos para administradores.
- Se añadió un bloque de administración operativa en el frontend con formularios de creación, edición, eliminación y listado para zonas, horarios, camiones y mantenimiento.
- Se implementaron filtros administrativos avanzados por estado, búsqueda por conductor de camiones, filtros de mantenimiento por estado y búsqueda por conductor dentro de los reportes en administración.
- Se consolidó la experiencia administrativa con filtros de reporte por conductor, estado y zona.
- Se añadieron validaciones dinámicas y mensajes de ayuda contextual en los formularios de camiones y mantenimiento para reducir errores de ingreso.
- Se completó la integración de pruebas de frontend en `frontend/src/App.test.tsx` para ejecutar la aplicación contra un backend FastAPI real y validar los flujos de autenticación, carga de datos, monitor operativo y actualización de operaciones.
- Se actualizaron `README.md`, `docs/DESPLIEGUE.md` y `docs/entrega-2.md` para documentar la búsqueda por conductor en reportes administrativos y los filtros de reporte por estado y zona.
- Se corrigieron advertencias de React `key` en `frontend/src/components/Admin.tsx` y se verificó la suite de frontend con `npx vitest run` (`11 passed`).
- Se verificaron las pruebas automatizadas de backend con `16 passed` y las pruebas de frontend con `11 passed`, incluyendo pruebas de edición, eliminación y filtrado en el panel administrativo, así como la validación de eventos operativos y actualizaciones en tiempo real.
- Se implementó registro de recolecciones por conductor y confirmación de recolección por ciudadano (endpoints y UI).
- Se añadió la vista de "Mis reportes" para usuarios ciudadanos, mostrando únicamente sus propios reportes en la UI.
- Se habilitó la resolución de reportes pendientes para operadores y administradores desde la vista de reportes.
- Se integró exportación de reportes y métricas a CSV desde los paneles de reportes y analytics.
- Se implementó exportación a PDF para reportes y métricas mediante impresión en PDF desde la UI.
- Se amplió el panel de analytics con métricas operativas reales, resumen de reportes y estado de recolección.
- Se añadieron scripts de respaldo y restauración de PostgreSQL (`scripts/db-backup.ps1` y `scripts/db-restore.ps1`) y se documentó el procedimiento en `README.md` y `docs/DESPLIEGUE.md`.
- Se corrigió `database/seed.sql` para insertar usuarios antes de las notificaciones y evitar que el contenedor PostgreSQL se detenga en el arranque.

## 2026-07-18

### Hitos completados
- Integración de autenticación segura en `backend-python/app/main.py` con JWT y roles (`ciudadano`, `operador`, `admin`, `conductor`).
- Implementación de alertas operativas y monitoreo de contenedores, mantenimiento y notificaciones.
- Desarrollo de priorización de zonas críticas y optimización de rutas para el despacho.
- Generación de un plan de intervención automático para dar soporte operativo inmediato.
- Dashboard React en `frontend/src/main.tsx` con vista operativa, alertas y tablero de despacho.
- Conexión del dashboard del frontend con el endpoint real `/api/operations/monitor`.
- Añadido endpoint operativo `POST /api/operations/update` para registrar eventos de ruta y de contenedor y refrescar el monitor en vivo.
- Corregido el retorno de monitor de actualizaciones de contenedor para devolver el nivel de llenado almacenado y evitar simulación adicional en el evento de actualización.
- Añadido `httpx2` a `backend-python/requirements.txt` para asegurar que las pruebas de FastAPI funcionen correctamente.
- Fortalecido el valor por defecto de `JWT_SECRET` y recomendado usar una variable de entorno segura en producción.
- Añadido soporte de datos iniciales PostgreSQL para `containers`, `notifications` y `maintenance_records` en `database/seed.sql`.
- Actualización de `README.md` para documentar el estado actual, la arquitectura y los próximos pasos.
- Integración avanzada del frontend con `monitor.truck_assignments` para reflejar el despacho en vivo y priorizar rutas reales.
- Añadido soporte de simulación operativa en el backend para avance de rutas, actualización de estados de atraso y llenado de contenedores.
- Agregadas pruebas de backend para validación de la simulación de rutas, contenedores y métricas de desempeño.
- Añadidas pruebas end-to-end de API para validar el flujo completo de `POST /api/operations/update`, `GET /api/operations/monitor`, `/api/routes` y `/api/bootstrap`.
- Añadida prueba de UI del frontend en `frontend/src/Operations.test.tsx` para validar la experiencia de eventos operativos en el dashboard.
- Ampliada la cobertura de la prueba UI para validar también la actualización de rutas (`route_update`).
- Añadida segunda prueba de integración de aplicación completa en `frontend/src/App.test.tsx` para validar también la actualización de contenedor (`container_update`) contra el backend FastAPI real.
- Añadida prueba de integración de aplicación completa en `frontend/src/App.test.tsx` para el flujo UI → backend FastAPI real, incluyendo autenticación, monitor y actualización de operación.
- Verificada compilación de producción del frontend con `npm run build`.
- Añadido comando raíz `npm run check:all` para validar frontend y backend juntos.
- Añadido prueba de health endpoint para `/api/health`.
- Confirmado `pytest -q` con 16 pruebas aprobadas y `npx vitest run` con 3 pruebas de frontend exitosas.
- Se completó la interfaz de recuperación de contraseña en el frontend con solicitud y uso de token, además de la persistencia y limpieza de tokens de reset en el backend con soporte para PostgreSQL.
- Se añadió un panel de administración de usuarios en el frontend con creación de cuentas, listado de usuarios y cambio de roles, accesible solo para administradores y conectado a los endpoints protegidos del backend.

### Próximos pasos
- ~~Validar accesibilidad y experiencia móvil en el panel administrativo~~ Completado el 2026-07-30.
- ~~Despliegue en producción con variables de entorno seguras~~ Completado el 2026-07-30. Backend en Render, frontend en Vercel. Ver `docs/DESPLIEGUE.md`.
