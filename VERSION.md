# Sistema de Recolección de Residuos Sólidos - Versión 5.5.8

## Versión 5.5.4 - Correcciones críticas y mejoras en dashboards

### Cambios destacados

- **Frontend - Dashboard**: métricas ahora son clicables y navegan a la vista correspondiente (reports, routes, analytics, admin). Se agregó cursor pointer para indicar interactividad.
- **Frontend - Schedules**: el banner de horarios del ciudadano ahora muestra TODAS las recolecciones programadas para su zona (no solo la primera). Se corrigió el filtro de día para cadenas compuestas.
- **Frontend - Waste**: se agregó la sección "Guía de disposición" con instrucciones por tipo de residuo (orgánicos, reciclables, no reciclables) y el contenedor asignado.
- **Frontend - Routes**: las alertas geo ahora se refrescan automáticamente cada 30 segundos. Se mejoró el manejo de errores del microservicio geo.
- **Frontend - Admin**: se agregaron diálogos de confirmación para todas las acciones destructivas (eliminar usuario, zona, horario, camión, mantenimiento). Se corrigió el display de truck_id en mantenimiento para mostrar el código del camión.
- **Frontend - Analytics**: se agregó desglose por tipo de residuo y filtro de rango de fecha (7/30/90 días/todo el año) para el historial de recolecciones.

## Versión 5.5.8 - Auditoría integral de dashboards del rol Conductor

### Cambios destacados

- **Backend - POST /api/collections**: se agregó validación de propiedad de camión para el rol `conductor`. Un conductor solo puede registrar recolecciones para el camión cuyo campo `driver` coincide con su nombre de usuario. Registra `403 Forbidden` al intentar usar un camión ajeno. El rol `operador` mantiene acceso sin restricción.
- **Backend - MemoryStore**: se completó la cobertura de datos en memoria para que coincida con `seed.sql` — se agregó el camión C-04 (Elena Condori, Santiago), la tercera incidencia de reporte, el segundo registro de mantenimiento y la segunda notificación. Se agregaron los usuarios demo (ciudadano, operador, conductor, admin2) con hashes de contraseña correctos, incluyendo al conductor como "Elena Condori" vinculado al camión C-04.
- **Backend - seed.sql**: se actualizó el nombre del usuario conductor de "Conductor Ruta 5" a "Elena Condori" para que coincida con el conductor del camión C-04 en la zona Santiago, permitiendo la vinculación conductor‑camión en la interfaz.
- **Frontend - Dashboard**: se agregó `isConductor` flag y métricas específicas (kg recolectados en zona, incidencias en zona, estado del camión). Se filtró el **tablero de despacho**, las **alertas activas** y el **plan de intervención** para mostrar solo información relevante a la zona y el camión del conductor.
- **Frontend - Dashboard**: se agregó la sección **"Mi camión"** con estado del camión, zona asignada, ruta asignada, progreso y la última recolección registrada en la zona del conductor.
- **Frontend - Routes**: el dropdown de camiones ahora muestra **solo el camión asignado** al conductor (filtrado por nombre). La zona se **defaultea** a la zona del conductor. Se agregó validación de formulario: kg no puede ser 0, NaN, ni negativo; los IDs de camión y zona deben ser válidos. Se corrigió el typo "Camion" → "Camión" y "recoleccion" → "recolección". Se muestra un mensaje de confirmación/error con feedback visual.
- **Frontend - Routes**: el seguimiento GPS muestra un banner indicando que se visualizan las rutas del camión del conductor, y filtra las rutas mostradas a las del camión asignado.
- **Frontend - Analytics**: se filtraron las **colecciones** y **reportes** por la zona del conductor. Se agregaron métricas específicas (kg en zona, recolecciones, incidencias, cumplimiento). Se corrigió el typo "Historial de recoleccion" → "Historial de recolecciones".
- **Tests**: se agregaron 5 tests de backend para validación de permisos de conductor en `/api/collections` y filtrado de analíticas.
- **Compilación**: `tsc --noEmit` sin errores, `npm run build` exitoso.
- **Tests**: 26/26 backend (21 originales + 5 nuevos), 21/21 frontend.
- **Frontend - CSS**: se corrigió error de sintaxis en `frontend/src/styles.css:1034` que causaba fallo de build en Vercel con `lightningcss minify: Unexpected end of input`. El selector atributo `[style*=" grid-template-columns\]` estaba mal formado (faltaba `]` de cierre). Build verificado exitosamente.

### Archivos modificados
- `backend-python/app/main.py` — Validación de camión en POST /api/collections, MemoryStore completado con C-04 y usuarios demo, nombre del conductor corregido
- `database/seed.sql` — Nombre del conductor actualizado a "Elena Condori"
- `frontend/src/main.tsx` — Dashboard isConductor + métricas + filtros + "Mi camión", Routes filtro de camión/zona + validación, Analytics filtrado por zona + métricas conductor + typo corregido

### Cambios destacados
- **Seguridad backend - POST /api/reports**: se restringió la creación de reportes al rol `ciudadano` exclusivamente. Los roles `operador` y `admin` ahora reciben `403 Forbidden` al intentar registrar incidencias.
- **Frontend Reports**: se ocultó el formulario de creación de reportes para `operador` y `admin`. Ahora muestran un mensaje informativo.
- **Frontend Dashboard**: se agregaron métricas específicas para admin y una sección "Estado del sistema" con información de salud del sistema.
- **Frontend Routes**: se amplió el formulario de registro de recolecciones para incluir el rol `admin`.
- **Frontend Analytics**: se agregaron métricas adicionales para admin (total de usuarios, zonas activas, camiones en mantenimiento).
- **Frontend Waste**: se amplió `canReportProblem` para incluir `operador` y `admin`.
- **Frontend statusTone**: se corrigió para distinguir "Pendiente" con tono rojo.
- **Compilación**: `tsc --noEmit` sin errores, `npm run build` exitoso.
- **Tests**: 21/21 frontend, 21/21 backend.

### Archivos modificados
- `backend-python/app/main.py` — Restringir POST /api/reports a rol ciudadano
- `frontend/src/main.tsx` — Métricas admin Dashboard, salud del sistema, Routes collection admin, Analytics admin metrics, Waste canReportProblem, Reports canCreateReport, statusTone fix

## Versión 5.5.6 - Corrección de bugs y mejora de estabilidad en dashboard de administración

### Cambios destacados
- **Backend - create_report**: se revirtió el bloqueo de roles `admin`/`operador` en la creación de reportes. Ahora permiten crear reportes; la restricción de zona aplica solo a ciudadanos.
- **Dashboard Principal**: se corrigió "Contenedores críticos" para usar `effectiveData.containers` en lugar de `data.containers`.
- **Admin**: se agregó latitud, longitud y criticidad a los inputs del formulario de creación/edición de zonas.
- **Admin**: se agregó `onRefresh` a todas las operaciones CRUD para sincronizar estado local tras mutaciones.
- **Admin**: se sincronizó `formValues.zone` con `session.zone`.
- **Admin**: se agregó día "Sábado" al dropdown de horarios.
- **Reports**: se corrigió `setFormZone("")` → ahora restablece a `session.zone`.
- **Waste**: se corrigió typo "Clasificacion" → "Clasificación" y filtro de tipos con `extractWasteTypes`.
- **Routes**: se corrigió typo "recoleccion" → "recolección".
- **App**: se agregó endpoint `/api/health` con verificación real de conectividad y `lastSync`.
- **Código limpio**: se eliminó código muerto del toggle de modo oscuro.
- **Compilación**: `tsc --noEmit` sin errores, `npm run build` exitoso.
- **Tests**: 21/21 frontend, 21/21 backend.

### Archivos modificados
- `backend-python/app/main.py` — Revertir bloqueo create_report admin/operador
- `frontend/src/main.tsx` — Dashboard containers, health check, typos, filtros Waste, reset zona Reports
- `frontend/src/components/Admin.tsx` — Lat/lng/criticality zonas, onRefresh CRUD, session.zone usuarios, Sábado horario, try/catch eventos

## Versión 5.5.5 - Auditoría integral de dashboards del rol Operador Municipal

### Cambios destacados
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

### Cambios destacados
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

### Solución aplicada

1. **`render.yaml`**: se agregó un recurso de base de datos PostgreSQL 16 (`sir-cusco-db`) y `DATABASE_URL` se conecta automáticamente desde ella vía `fromDatabase`, eliminando la dependencia manual.
2. **`backend-python/app/main.py`**: se agregó `init_db()` que ejecuta `schema.sql` + `seed.sql` al arranque (`lifespan`), creando el esquema y cargando datos semilla de forma idempotente. Se corrigió `execute_one()` que lanzaba `HTTPException(404)` en consultas UPDATE/DELETE (sin `RETURNING`), lo que hacía caer silenciosamente las operaciones de edición y borrado al modo memoria. El endpoint `/api/health` ahora reporta `"connected": true/false` con verificación real de conectividad.
3. **`Dockerfile`**: se agregó `COPY database/ ./database/` para contenedores.
4. **`database/seed.sql`**: se corrigió el hash de `admin@ecocusco.pe` (no coincidía con `admin123`) y se agregaron las cuentas `ciudadano`, `operador`, `conductor` y `admin2`.

### Verificación
- Tests backend sin `DATABASE_URL` (modo memoria): **21 passed, 1 skipped**.
- Tests backend con `DATABASE_URL` (modo PostgreSQL): **26 passed** (21 existentes + 5 nuevos de persistencia).
- Verificación manual contra PostgreSQL 17: `init_db()` crea las 11 tablas desde cero; CRUD completo (crear/editar/eliminar/consultar) persiste; la cuenta creada sobrevive a un reinicio del backend.

### Versión 5.5.2 - Revisión y mejoras del Dashboard de Administrador

### Cambios destacados
- Se corrigió el endpoint `/api/bootstrap` para filtrar datos administrativos sensibles (`users`, `maintenance`, `notifications`) para usuarios no-admin. Solo el rol `admin` puede ver la gestión completa de usuarios, camiones, mantenimiento y notificaciones.
- Se agregó la funcionalidad de eliminar usuarios desde el panel de administración.
- Se agregaron funciones de editar y eliminar camiones desde el panel de administración.
- Se agregaron funciones de editar y eliminar registros de mantenimiento desde el panel de administración.
- Se agregaron estados de carga para todas las operaciones de creación en el panel de administración.
- Se implementó auto-limpieza de mensajes de feedback después de 4 segundos.
- Se agregó el estilo CSS `.danger` para botones de eliminación.
- Se eliminó el prop `onResolveReport` no utilizado del componente `Admin`.
- Se actualizaron los tests de `Admin.test.tsx` para reflejar los cambios.
- Se verificó la compilación (`tsc --noEmit`), el build del frontend (`npm run build`) y todos los tests pasan (21 frontend + 21 backend).
- Se verificaron todos los endpoints protegidos del admin y sus permisos.

## Versión 5.5.1 - Auditoría del dashboard Operador Municipal

### Cambios destacados
- Se validó y corrigió el acceso del rol **Operador Municipal** a las vistas `dashboard`, `reports`, `routes` y `analytics`.
- Se confirmó que el operador NO tiene acceso a Administración, usuarios, zonas, configuración, waste ni schedules.
- Se amplió el permiso de `POST /api/collections` para incluir el rol `operador`, permitiendo registrar recolecciones desde la vista de rutas.
- Se ajustó la vista de `Routes` para mostrar el formulario de registro de recolección tanto para `conductor` como para `operador`.
- Se verificó la compilación (`tsc --noEmit`), el build del frontend (`npm run build`) y el build del servicio geo (`npm run build` en backend-typescript).
- Se verificaron 21 tests de frontend (todos pasan) y 21 tests de backend (todos pasan).
- Se documentaron los endpoints del operador y sus permisos en el CHANGELOG.

## Versión 5.5.0 - Revisión y auditoría completa de dashboards por rol

### Cambios destacados
- Se adaptó el dashboard principal al rol ciudadano, mostrando métricas personalizadas (reportes pendientes, recolecciones pendientes, reportes resueltos, recolecciones en zona), seguimiento de reportes propios, recolecciones pendientes por confirmar, historial de recolecciones en zona y recomendaciones del sistema.
- Se ajustaron los permisos de navegación por rol para que ciudadanos vean solo las vistas relevantes para su experiencia y operadores/administradores mantengan acceso a operaciones y monitoreo.
- Se corrigió el filtrado de reportes por rol para ciudadanos, operadores y administradores.
- Se corrigió fuga de datos: el backend ahora filtra las recolecciones por zona para ciudadanos en `/api/bootstrap` y `/api/collections`, y valida que un ciudadano solo pueda confirmar recolecciones de su zona asignada.
- Se mejoró la experiencia de envío y resolución de incidencias con validaciones y acciones más claras.
- Se incorporaron pruebas de regresión y se verificó el build del frontend sin errores.

## Versión 4.5.3 - Interfaz fija en modo claro

### Cambios destacados
- La interfaz del frontend queda fija en modo claro por defecto.
- Se eliminó el selector de tema oscuro desde la barra lateral.
- La documentación principal fue actualizada para reflejar este comportamiento.

## Versión 4.5.2 - Fix de despliegue en Vercel

### Problema resuelto: `npm install` falla en Vercel con Playwright

- **Problema**: Vercel fallaba en el paso `npm install` con `Command "cd frontend && npm install" exited with 1`.
- **Causa**: `playwright` en `devDependencies` intenta descargar navegadores durante postinstall, lo que falla en el entorno de build de Vercel.
- **Solución**: `vercel.json` usa `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` en `installCommand` para saltar esa descarga.

#### Archivos modificados
- `vercel.json` — `installCommand` con variable de entorno
- `docs/DESPLIEGUE.md` — troubleshooting actualizado
- `README.md` — fix documentado

---

## Versión 4.5.1 - Corrección definitiva del Dashboard de Administración

### Problema resuelto: pantalla en blanco/negro en la vista Admin

Esta versión corrige de forma definitiva la regresión por la cual el panel de Administración (`/admin`) mostraba una pantalla completamente en blanco (tema claro) o negra (tema oscuro) al acceder.

#### Correcciones aplicadas

| # | Componente | Problema | Solución |
|---|-----------|----------|----------|
| 1 | `styles.css` | `.search-box` sin `position: relative` → ícono absoluto se desborda | Se agrega `position: relative; display: flex; align-items: center` |
| 2 | `Admin.tsx` | Clase `two-col` (2 hijos esperados) con 6 paneles → layout colapsado | Nueva clase `.admin-grid` con `repeat(2, 1fr)` responsive |
| 3 | `Admin.tsx` | `style` inline con colores hardcodeados → texto invisible en ciertos contextos | Se elimina el `style` inline; colores vienen de variables CSS |
| 4 | `main.tsx` | Token JWT expirado no detectado → Admin con datos vacíos | `loadData()` detecta 401 y limpia la sesión automáticamente |
| 5 | `styles.css` | `.loading` sin estilos → spinner puede ser invisible | Se agrega clase `.loading` con flex y colores de tema |

#### Archivos modificados
- `frontend/src/styles.css`
- `frontend/src/components/Admin.tsx`
- `frontend/src/components/Admin.test.tsx`
- `frontend/src/main.tsx`

---

## Versión 4.5.0 - Corrección visual del panel de administración

### Corrección crítica: Dashboard de Administración en blanco/negro

- **Problema**: el Dashboard de Administración mostraba una pantalla completamente en blanco (tema claro) o negra (tema oscuro) al acceder.
- **Causa raíz**: el commit `c2aeea7` eliminó protecciones de seguridad (null checks) en `frontend/src/main.tsx`. La función `getOperationalSignal()` llamaba `data.routes.filter(...)` sin verificar si `routes` existía, lo que provocaba un `TypeError` y el crash de todo el componente `App`, resultando en pantalla en blanco/negra.
- **Solución**: se restauraron las protecciones de seguridad esenciales en `main.tsx`:
  - `statusTone()`: tipo `string | undefined | null` con fallback `(status ?? "").toString()`
  - `getOperationalSignal()`: `(data.routes ?? [])` y `String(route.delay ?? "")`
  - Alertas del Dashboard: `String(alert ?? "")` y fallback `"Alerta"`
  - Schedules search: `String(s.zone ?? "")` y `String(search ?? "")`
  - Routes/Map: `String(route.delay ?? "")`
  - Reports: `safeReports`, `safeZones`, `safeTrucks` con `Array.isArray()` checks
  - ReportList: `export` restaurado, `safeReports`, `safeTrucks`, y protecciones null en propiedades de report
- **Archivo modificado**: `frontend/src/main.tsx`

Esta es la **versión 4.5.1** del Sistema Inteligente de Recolección de Residuos Sólidos para la Gestión Ambiental Urbana en la ciudad del Cusco.

### Correcciones de login y seguridad
- **Timing attack corregido**: el endpoint `/api/auth/login` ahora ejecuta una verificación de password dummy (bcrypt) cuando el email no existe, manteniendo un tiempo de respuesta constante para prevenir enumeración de usuarios.
- **Strip de password corregido**: el backend ya no elimina espacios en blanco del password (antes `str_strip_whitespace=True` afectaba todos los campos incluido password). Ahora solo el email se normaliza con `field_validator`.
- **Hack de `window.__password` eliminado**: la contraseña ya no se almacena en el objeto global `window`. El login pasa la contraseña directamente como argumento al callback `onLogin`.
- **Trim de password corregido en frontend**: el formulario deja de hacer `.trim()` en el password, permitiendo contraseñas con espacios adicionales.
- **Token de recuperación visible en demo**: al solicitar recuperación de contraseña, el token generado se muestra en la UI para que el usuario pueda usarlo directamente en modo demo (sin necesidad de email real).
- **Variable shadowing corregida**: la función `login` en `main.tsx` dejó de sombrear la variable `session` con una constante local.

### Mejoras de UX y accesibilidad en el login
- **Toggle de visibilidad de contraseña**: botón de ojo para mostrar/ocultar contraseña en todas las modalidades (login, registro y recuperación).
- **Auto-enfoque en email**: el campo de email recibe el foco automáticamente al cargar la página y al cambiar de modo.
- **Indicador de fortaleza de contraseña**: en el modo de registro, se muestra una barra visual y etiqueta que evalúa la calidad de la contraseña en tiempo real (longitud, letras, números, símbolos).
- **Botón de envío con spinner**: durante el envío, el botón muestra un spinner y el texto "Procesando..." con accesibilidad (`aria-hidden`).
- **ARIA mejorado**: `role="alert"` y `aria-live` en mensajes de error y feedback, `aria-pressed` en las pestañas de modo, `aria-label` en botones de toggle, `role="main"` en el contenedor principal.
- **Auto-completado de navegador**: atributos `autoComplete` apropiados (`email`, `current-password`, `new-password`, `name`, `one-time-code`) en todos los campos.
- **Link de Términos y Condiciones corregido**: dejó de apuntar a `#terms` (ancla inexistente) y ahora enlaza a una URL válida con `rel="noopener noreferrer"`.
- **Validación `noValidate` en el formulario**: previene validación nativa del navegador que podría interferir con la lógica de React.
- **Reset de estado al cambiar de modo**: al cambiar entre login/registro/recuperación, se limpian los estados de visibilidad de contraseña, feedback y token de recuperación.

### Mejoras de código y arquitectura
- **AuthView extraído a su propio archivo**: el componente `AuthView` se movió de `frontend/src/main.tsx` (168 líneas) a `frontend/src/components/AuthView.tsx`, mejorando la organización y mantenibilidad del código.
- **Función `submit` simplificada**: la lógica de envío está mejor organizada y las variables locales no sombrean las del scope superior.
- **CSS mejorado**: nuevas reglas para `.password-field`, `.password-toggle`, `.password-strength`, `.recovery-token`, `.auth-message`, `.hint.success` y `.spinner` dentro de botones.
- **UI por roles**: badge de rol en dashboard y formulario de registro de recolecciones visible solo para conductores en la vista de rutas.

### Revisión completa del Dashboard de Horarios — correcciones y mejoras
- **Bug funcional crítico corregido**: `createSchedule` en el panel administrativo enviaba `zone` (string) en lugar de `zone_id` (number) al backend, lo que causaba que la creación de horarios fallara. Ahora se usa `zone_id` correctamente.
- **CRUD completo de horarios en el panel administrativo**: se agregaron funciones de editar y eliminar horarios (`startEditSchedule`, `saveScheduleEdit`, `deleteSchedule`) con formulario de edición integrado.
- **Bug del componente `Item`: el texto de la etiqueta ya no está hardcodeado a "Activo". Se agregó un prop opcional `tag` para mostrar contexto relevante (tipo de residuo en horarios).
- **Exportación CSV corregida**: valores con comas, comillas y saltos de línea ahora se escapan correctamente según RFC 4180. Se liberan objetos Blob con `URL.revokeObjectURL`.
- **Vista de horarios mejorada**: ordenamiento por zona/día/hora/tipo, exportación PDF además de CSV, estilos CSS en lugar de inline, `useMemo` para el array de días, etiquetas ARIA para accesibilidad.
- **CSS nuevo**: `.panel-header`, `.panel-actions`, `.empty-state` para consistencia visual.
- **Hora de despacho corregida**: `0${8 + index}:00` producía `"010:00"` para el tercer índice; ahora usa `padStart(2, "0")` → `"08:00"`, `"09:00"`, `"10:00"`.
- **Case-sensitivity en alertas de retraso**: el icono de alerta ahora usa `toLowerCase()` consistentemente con la detección de estado.
- **Badge de rol con estilos CSS**: badge de rol con degradado, sombra y `aria-label` en lugar de estilos en línea.
- **Label "Operativo" reemplazado**: muestra `{dispatchBoard.length} asignaciones` en lugar de texto genérico.
- **Estado vacío para Alertas Activas**: mensaje amigable cuando no hay alertas.
- **Botón "Cargar más" removido**: no tenía `onClick`; eliminado para evitar confusión.
- **Keys estables en lista de alertas**: `key={`alert-${alert.id}-${alert.title}`}` en lugar de usar índice directamente.
- **ARIA mejorado**: `aria-hidden="true"` en iconos decorativos, `aria-label` en indicadores de estado de alertas.
- **Signal operacional con tono visual**: `tone` ("ok"/"warning"/"danger") ahora se aplica como clase CSS con colores contextuales.
- **Page header con estilos CSS**: `.page-header` con padding, fondo y `h2` con tipografía; reglas `.signal`, `.signal-ok`, `.signal-warning`, `.signal-danger` agregadas.
- **Código muerto eliminado**: `reportStatusLabel()` era una función identidad; eliminada y reemplazada por `{report.status}` directamente.
 - **CSS nuevo**: `.app-alert`, `.dashboard-role-row`, `.dashboard-role-badge`, `.page-header`, `.signal{-ok|-warning|-danger}`.
 - **Fix: Fondo negro en vista de reportes**: corregido layout del `<body>` y estilos CSS en `frontend/index.html` y `frontend/src/styles.css` para evitar fondos oscuros alrededor del contenido en vistas cortas.

### Revisión completa del Dashboard de Reportes — correcciones y mejoras

#### Errores funcionales corregidos
- **Formulario de reportes no controlado**: los campos de zona, tipo y detalle eran uncontrolled, impidiendo validación adecuada. Ahora son controlled components con estados locales.
- **`Report.status` usaba `string` en lugar de `ReportStatus`**: se corrigió el tipo en `types.ts` para usar `ReportStatus` y garantizar seguridad de tipos.
- **`create_collection_record` y `confirm_collection_by_citizen` indentados incorrectamente**: estaban dentro de `delete_maintenance`, haciéndolos inaccesibles. Se corrigió la indentación al nivel del módulo.

#### Mejoras de diseño y funcionalidad
- **Filtros de estado en la vista de reportes**: botones de filtro para Todos/Pendiente/En revision/Resuelto.
- **Búsqueda de texto en reportes**: búsqueda por tipo, zona, ciudadano o detalle.
- **Exportaciones memoizadas**: funciones CSV y PDF ahora usan `useCallback` para evitar recreaciones innecesarias.
- **Estilos CSS consistentes**: se eliminaron estilos inline y se usaron clases CSS existentes (`.panel-header`, `.panel-actions`, `.hint`, `.driver-search`).

#### Optimizaciones de rendimiento
- **Dashboard tick optimization**: se usa `useRef` para el contador de ticks y `useMemo` para `effectiveData`, evitando re-renderizados innecesarios.
- **Map component signature optimization**: se reemplazó `JSON.stringify` por una firma basada en conteos de arrays con referencia `signatureRef`.
- **`driverByZone` memoizado**: ya estaba memoizado con `useMemo`; se optimizó la dependencia del `filtered` useMemo.

#### Mejoras de accesibilidad y código
- **`statusTone` case-insensitive**: la función ahora usa `toLowerCase()` para manejar cualquier capitalización del estado.
- **ARIA mejorado**: `aria-pressed` en botones de filtro de estado, `aria-label` en inputs de búsqueda.

#### Verificación
- Frontend build: ✅ exitoso (`npm run build`)
- Backend tests: ✅ 20/20 pasados
- Frontend tests: ✅ 11/11 pasados
- TypeScript geo service build: ✅ exitoso
- **Verificación**: `tsc --noEmit` 0 errores, `npm run build` exitoso, `vitest run` — 11 passed.

### Rutas de despliegue recomendadas

| Opción | Backend | Frontend | Plan gratuito |
|--------|---------|----------|---------------|
| **B (recomendada)** | Render | **Vercel** | Ambos permanentes |
| C | Render | Netlify | Ambos permanentes |
| D | Railway | Netlify | $5 crédito/mes (Railway) |

### Rama de producción
- Rama: `main` y `version-4.5`
- Repositorio: `Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos`

### Próximos pasos
- Ejecutar el despliegue en Render (Web Services manuales) y Vercel siguiendo `docs/DESPLIEGUE.md`.
- Configurar `JWT_SECRET` como variable de entorno segura en el dashboard de Render.
- Ajustar `CORS_ORIGINS` al dominio final del frontend si se usa dominio propio.

## Versión 3.0.0 - Proyecto organizado y documentación consolidada

### Características de esta versión
- Configuración de despliegue lista para producción: `render.yaml` para backend en Render, `.vercelignore` + dashboard para frontend en Vercel, `netlify.toml` + `railway.toml` + `Dockerfile` para alternativas.
- Variables de entorno documentadas y preparadas: `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`, `CORS_ORIGIN_REGEX`, `VITE_API_URL`, `VITE_GEO_URL`.
- CORS configurado para permitir tanto dominios de Vercel como Netlify: `https://.*(\.vercel\.app|\.netlify\.app)`.
- Accesibilidad mejorada en el panel administrativo: contraste WCAG AA, skip-link, focus-visible, touch targets de 44px y prevención de scroll horizontal.
- Exportación a PDF para reportes y métricas desde la interfaz.
- Validación completa de backup/restore de PostgreSQL local con scripts PowerShell.
- Build del frontend verificado y pruebas automatizadas (`11 passed` frontend, `16 passed` backend).

### Rutas de despliegue recomendadas

| Opción | Backend | Frontend | Plan gratuito |
|--------|---------|----------|---------------|
| **B (recomendada)** | Render | **Vercel** | Ambos permanentes |
| C | Render | Netlify | Ambos permanentes |
| D | Railway | Netlify | $5 crédito/mes (Railway) |

### Rama de producción
- Rama: `main` y `v2.0.0`
- Repositorio: `Alejandro225425/Sistema-de-Recoleccion-de-Residuos-Solidos`

### Próximos pasos
- Ejecutar el despliegue en Render (Blueprint o Web Services) y Vercel siguiendo `docs/DESPLIEGUE.md`.
- Configurar `JWT_SECRET` como variable de entorno segura en el dashboard de Render.
- Ajustar `CORS_ORIGINS` al dominio final del frontend si se usa dominio propio.

## Versión 1.0.0

### Características de esta versión
- Estructura base del proyecto
- Frontend con React/TypeScript y Vite
- Backend con Python/FastAPI
- Servicio auxiliar de geolocalización en TypeScript
- Documentación inicial

### Próximos pasos
- Implementar funcionalidades completas
- Integrar base de datos PostgreSQL
- Desplegar en producción

## Estado actual
- **Versión 4.5.1**: corrección definitiva del Dashboard de Administración. ErrorBoundary envuelve el contenido Admin, fallbacks CSS en todas las clases admin (`var(--bg, #f0f5f2)`), null checks defensivas en `getOperationalSignal`, `Dashboard.effectiveData`, `Routes`, `Schedules` y `Analytics` para prevenir errores de runtime como "Cannot read properties of null (reading 'value')". Tests frontend: 16 passed.
- Endpoint operativo `/api/health` validado y funcionando en modo memoria y con persistencia PostgreSQL cuando `DATABASE_URL` está configurada.
- Backend Python verificado con `20 passed` en la suite de pruebas.
- Frontend React validado con pruebas e2e reales contra FastAPI y microservicio TypeScript compilado con éxito.
- Configuración de despliegue preparada para Render + Vercel (recomendado) o Render + Netlify.

| Versión | Rama | Estado |
|---------|------|--------|
| **4.5.1** | `main`, `version-4.5` | ErrorBoundary, fallbacks CSS, null-safety defensiva |
| **4.5.0** | `main`, `version-4.5` | Corrección visual del panel de administración y mejoras de UX |
| **3.0.0** | `main`, `version-3` | Proyecto organizado y documentación consolidada |
| 2.0.0 | `main`, `v2.0.0` | Configuración de despliegue lista para producción |
| 1.0.0 | `version-1-proyecto` | Estructura base del proyecto |
