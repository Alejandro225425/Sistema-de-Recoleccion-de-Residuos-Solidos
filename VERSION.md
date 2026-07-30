# Sistema de Recolección de Residuos Sólidos - Versión 0

## MVP Inicial

Esta es la **versión 0** del Sistema Inteligente de Recolección de Residuos Sólidos para la Gestión Ambiental Urbana en la ciudad del Cusco.

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
- Endpoint operativo `/api/operations/update` validado y funcionando en modo memoria y con persistencia PostgreSQL cuando `DATABASE_URL` está configurado.
- Backend Python verificado con `13 passed` en la suite de pruebas.
- Frontend React validado con pruebas e2e reales contra FastAPI y microservicio TypeScript compilado con éxito.