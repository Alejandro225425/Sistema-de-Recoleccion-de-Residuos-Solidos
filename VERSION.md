# Sistema de Recolección de Residuos Sólidos - Versión 2.0.0

## Versión 2.0.0 - Lista para despliegue

Esta es la **versión 2.0.0** del Sistema Inteligente de Recolección de Residuos Sólidos para la Gestión Ambiental Urbana en la ciudad del Cusco.

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
- Versión de demostración estable con frontend compilable y backend probado.
- Endpoint operativo `/api/health` validado y funcionando en modo memoria y con persistencia PostgreSQL cuando `DATABASE_URL` está configurada.
- Backend Python verificado con `16 passed` en la suite de pruebas.
- Frontend React validado con pruebas e2e reales contra FastAPI y microservicio TypeScript compilado con éxito.
- Configuración de despliegue preparada para Render + Vercel (recomendado) o Render + Netlify.
