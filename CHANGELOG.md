# Changelog

## 2026-08-02

### Fix: Fondo negro en vista de reportes del dashboard

- **Problema**: el `<body>` en `frontend/index.html` tenía `display: flex; align-items: center; justify-content: center`, lo que centraba el contenido vertical y horizontalmente. En la vista de reportes, al ser más corta que la ventana, se mostraba el fondo oscuro original `#0a1f14` alrededor, dando la sensación de pantalla negra.
- **Actualización adicional (2026-08-02)**: corregido el fallo que dejaba vacías las vistas de reportes y administración cuando algunos campos llegaban vacíos o `undefined`; ahora la UI renderiza valores por defecto y evita la excepción `toLowerCase()`.
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
- Se eliminó `vercel.json` del repositorio para evitar conflictos con la configuración de Vercel. Ahora la configuración se maneja desde el dashboard de Vercel: Framework Preset `Vite`, Root Directory `frontend`, Build Command `npm run build`, Output Directory `frontend/dist`.
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
