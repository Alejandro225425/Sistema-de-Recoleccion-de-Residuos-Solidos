# 🌍 Sistema Inteligente de Recolección de Residuos Sólidos - Cusco

**MVP funcional al 50%+** | MVP web de recolección de residuos segregados optimizado para Cusco.

**Tech Stack:** React/TypeScript • Python/FastAPI • OpenStreetMap • PostgreSQL (opcional)

## Estructura del proyecto

```text
backend/
  # carpeta legacy vacia
backend-python/
  app/main.py        API REST principal con FastAPI
backend-typescript/
  src/server.ts      Servicio auxiliar de geolocalizacion y alertas
database/
  schema.sql         Estructura PostgreSQL
  seed.sql           Datos iniciales de Cusco
frontend/
  index.html         Entrada Vite
  src/
    main.tsx         App React TypeScript
    styles.css       Estilos de la aplicacion
docs/
  entrega-2.md       Documento base para la segunda entrega
```

## Funcionalidades implementadas

- Registro e inicio de sesion simulado por rol: ciudadano, operador, administrador y conductor.
- Recuperacion de contrasena simulada.
- Consulta de horarios de recoleccion por zona.
- Notificacion visible de camion cercano.
- Reporte ciudadano de incidencias y seguimiento de estado.
- Guia de clasificacion de residuos: organicos, reciclables y no reciclables.
- Visualizacion de mapa operativo y rutas con ETA.
- Registro visual de camiones, zonas asignadas y estados.
- Gestion basica de incidencias desde el panel administrativo.
- Historial de recolecciones, confirmaciones y estadisticas del servicio.

## 🚀 Inicio Rápido

### Requisitos
- Node.js v18+
- Python 3.9+

### Instalación & Ejecución

```bash
# 1. Frontend
cd frontend && npm install

# 2. Backend Python
cd ../backend-python
pip install -r requirements.txt

# 3. Ejecutar (desde raíz del proyecto)
cd ../backend-python && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# En otra terminal:
cd frontend && npm run dev
```

**Acceso:**
- 🌐 Frontend: http://localhost:5173
- 🔌 API: http://localhost:8000
- 📍 Health: http://localhost:8000/api/health

## 📚 Características Principales

✅ Autenticación multi-rol (ciudadano, operador, administrador, conductor)  
✅ Consulta de horarios por zona  
✅ Reportes ciudadanos con seguimiento  
✅ Mapa operativo con rutas y camiones  
✅ Gestión de incidencias  
✅ Estadísticas del servicio  
✅ Responsive (móvil & desktop)  
✅ Modo memoria (sin PostgreSQL)  

## 🛠️ Stack Tecnológico

- **Frontend:** React + TypeScript + Vite
- **Backend:** Python/FastAPI + OpenStreetMap/Leaflet
- **Base de datos:** PostgreSQL (opcional)
- **Autenticación:** Simulada por sesión

## 🔌 API Endpoints

```
GET  /api/bootstrap           → Datos iniciales (zonas, rutas, camiones)
GET  /api/zones               → Zonas de recolección
GET  /api/schedules           → Horarios por zona
GET  /api/trucks              → Camiones activos
GET  /api/routes              → Rutas y ETA
GET  /api/reports             → Incidencias ciudadanas
GET  /api/collections         → Historial de recolecciones
GET  /api/analytics/summary   → Indicadores del servicio
POST /api/auth/login          → Autenticación
POST /api/reports             → Crear incidencia
PATCH /api/reports/:id/resolve → Resolver incidencia
```

## 📝 Historias de Usuario

**Cobertura:** 25 de 30 historias implementadas (83%)

Incluye registro, autenticación, consulta de horarios, reportes de incidencias, seguimiento GPS simulado, gestión de rutas, estadísticas y clasificación de residuos.
