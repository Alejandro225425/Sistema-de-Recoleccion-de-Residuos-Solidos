# Sistema de Recolección de Residuos Sólidos - Versión 4.0.0

## Versión 4.0.0 - Revisión completa del login y seguridad

Esta es la **versión 4.0.0** del Sistema Inteligente de Recolección de Residuos Sólidos para la Gestión Ambiental Urbana en la ciudad del Cusco.

### Correcciones de login y seguridad
- **Timing attack corregido**: el endpoint `/api/auth/login` ahora ejecuta una verificación de password dummy (bcrypt) cuando el email no existe, manteniendo un tiempo de respuesta constante para prevenir enumeración de usuarios.
- **Strip de password corregido**: el backend ya no elimina espacios en blanco del password (antes `str_strip_whitespace=True` afectaba todos los campos incluido password). Ahora solo el email se normaliza con `field_validator`.
- **Hack de `window.__password` eliminado**: la contraseña ya no se almacena en el objeto global `window`. El login pasa la contraseña directamente como argumento al callback `onLogin`.
- **Trim de password corregido en frontend**: el formulario deja de hacer `.trim()` en el password, permitiendo contraseñas con espacios adicionales.
- **Token de recuperación visible en demo**: al solicitar recuperación de contraseña, el token generado se muestra en la UI para que el usuario pueda usarlo directamente en modo demo (sin necesidad de email real).
- **Variable shadowing corregido**: la función `login` en `main.tsx` dejó de sombrear la variable `session` con una constante local.

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
- **Bug del componente `Item`**: el texto de la etiqueta ya no está hardcodeado a "Activo". Se agregó un prop opcional `tag` para mostrar contexto relevante (tipo de residuo en horarios).
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
- **Verificación**: `tsc --noEmit` 0 errores, `npm run build` exitoso, `vitest run` — 11 passed.

### Rutas de despliegue recomendadas

| Opción | Backend | Frontend | Plan gratuito |
|--------|---------|----------|---------------|
| **B (recomendada)** | Render | **Vercel** | Ambos permanentes |
| C | Render | Netlify | Ambos permanentes |
| D | Railway | Netlify | $5 crédito/mes (Railway) |

### Rama de producción
- Rama: `main` y `version-4`
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
 - Versión 4.0.0: login revisado, corregido timing attack, eliminado hack de `window.__password`, toggle de visibilidad de contraseña, indicador de fortaleza, token de recuperación visible en demo, AuthView extraído a componente dedicado. Dashboard revisado y corregido (horas de despacho, alerts case-sensitivity, estado vacío, badge de rol, ARIA, signal tone, código muerto).
- Endpoint operativo `/api/health` validado y funcionando en modo memoria y con persistencia PostgreSQL cuando `DATABASE_URL` está configurada.
- Backend Python verificado con `16 passed` en la suite de pruebas.
- Frontend React validado con pruebas e2e reales contra FastAPI y microservicio TypeScript compilado con éxito.
- Configuración de despliegue preparada para Render + Vercel (recomendado) o Render + Netlify.

| Versión | Rama | Estado |
|---------|------|--------|
| **4.0.0** | `main`, `version-4` | Revisión completa del login, seguridad y accesibilidad |
| **3.0.0** | `main`, `version-3` | Proyecto organizado y documentación consolidada |
| 2.0.0 | `main`, `v2.0.0` | Configuración de despliegue lista para producción |
| 1.0.0 | `version-1-proyecto` | Estructura base del proyecto |
