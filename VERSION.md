# Sistema de Recolección de Residuos Sólidos - Versión 4.5.2

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
| 3 | `Admin.tsx` | `style` inline con fallbacks de tema claro → texto invisible en modo oscuro | Se elimina el `style` inline; colores vienen de variables CSS |
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
- **Versión 4.5.1**: corrección definitiva del Dashboard de Administración. ErrorBoundary envuelve el contenido Admin, fallbacks CSS en todas las clases admin (`var(--bg, #f0f5f2)`), `color-scheme: light dark`, mejor contraste en modo oscuro para `.admin-list-item`, y null checks defensivas en `getOperationalSignal`, `Dashboard.effectiveData`, `Routes`, `Schedules` y `Analytics` para prevenir errores de runtime como "Cannot read properties of null (reading 'value')". Tests frontend: 16 passed.
- Endpoint operativo `/api/health` validado y funcionando en modo memoria y con persistencia PostgreSQL cuando `DATABASE_URL` está configurada.
- Backend Python verificado con `20 passed` en la suite de pruebas.
- Frontend React validado con pruebas e2e reales contra FastAPI y microservicio TypeScript compilado con éxito.
- Configuración de despliegue preparada para Render + Vercel (recomendado) o Render + Netlify.

| Versión | Rama | Estado |
|---------|------|--------|
| **4.5.1** | `main`, `version-4.5` | ErrorBoundary, fallbacks CSS, color-scheme, null-safety defensiva |
| **4.5.0** | `main`, `version-4.5` | Corrección visual del panel de administración y mejoras de UX |
| **3.0.0** | `main`, `version-3` | Proyecto organizado y documentación consolidada |
| 2.0.0 | `main`, `v2.0.0` | Configuración de despliegue lista para producción |
| 1.0.0 | `version-1-proyecto` | Estructura base del proyecto |
