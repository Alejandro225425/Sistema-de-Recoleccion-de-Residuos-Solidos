# Prompt: Operaciones masivas en el panel de administrador

> **Objetivo:** Extender el panel de administrador de SIR Cusco para soportar operaciones masivas completas: cambio de estado, asignación masiva, exportación, edición masiva, y extender estas capacidades a entidades que actualmente no tienen ninguna operación masiva (Rutas, Reportes, Contenedores, Colecciones).
>
> **Alcance:** Backend FastAPI (`backend-python/app/main.py` y modelos) + Frontend React (`frontend/src/components/Admin.tsx` y componentes relacionados).
>
> **Restricción:** No romper la funcionalidad existente de eliminación masiva (bulk delete) que ya funciona.

---

## Prompt único para el agente

Eres el lead de backend y frontend de SIR Cusco. Tu tarea es implementar operaciones masivas completas en el panel de administrador, extendiendo la funcionalidad actual de bulk delete y agregando nuevas operaciones para todas las entidades administrables.

---

### 1. Backend — Extender el endpoint `/api/admin/bulk-action`

**Archivo:** `backend-python/app/main.py`

#### 1.1. Actualizar el modelo de request

Busca la clase `BulkActionRequest` (alrededor de la línea 97) y extiéndela:

```python
class BulkActionRequest(BaseModel):
    resource: str
    action: str
    ids: list[int]
    data: dict | None = None  # Payload adicional para acciones que requieren parámetros
```

#### 1.2. Actualizar el handler `bulk_action()`

El endpoint actual (`POST /api/admin/bulk-action`, línea ~1504) solo permite `action == "delete"`. Modifícalo para soportar:

**Acciones por recurso:**

| Recurso | Acciones soportadas | Parámetros en `data` |
|---------|---------------------|---------------------|
| `users` | `delete`, `update_status`, `change_role`, `export` | `status` (str), `role` (str) |
| `zones` | `delete`, `update_status`, `assign_user`, `export` | `status` (str), `user_id` (int) |
| `schedules` | `delete`, `update_status`, `export` | `status` (str) |
| `trucks` | `delete`, `update_status`, `assign_zone`, `export` | `status` (str), `zone_id` (int) |
| `maintenance` | `delete`, `update_status`, `export` | `status` (str) |
| `routes` | `delete`, `update_status`, `assign_truck`, `assign_zone`, `export` | `status` (str), `truck_id` (int), `zone_id` (int) |
| `reports` | `delete`, `update_status`, `export` | `status` (str) |
| `containers` | `delete`, `update_status`, `assign_zone`, `export` | `status` (str), `zone_id` (int) |
| `collections` | `delete`, `update_status`, `assign_truck`, `assign_zone`, `export` | `status` (str), `truck_id` (int), `zone_id` (int) |

**Validaciones requeridas:**
- `ids` no vacío (mantener validación existente).
- `action` debe estar en la lista de acciones permitidas para el `resource`.
- Si la acción requiere parámetros (ej: `assign_user`, `update_status`), validar que `data` contenga los campos necesarios.
- Validar que el `user_id`, `truck_id`, `zone_id` existan antes de asignar.
- Para `export`, devolver un archivo CSV/JSON con los registros seleccionados.

#### 1.3. Implementar funciones auxiliares

Crea las siguientes funciones auxiliares (o intégralas en `bulk_action()` si prefieres):

- `bulk_update_status(resource, ids, status)` — Actualiza el campo `status` o `estado` de múltiples registros.
- `bulk_assign_user(resource, ids, user_id)` — Asigna un usuario a múltiples zonas/registros.
- `bulk_assign_truck(resource, ids, truck_id)` — Asigna un camión a múltiples rutas/colecciones.
- `bulk_assign_zone(resource, ids, zone_id)` — Asigna una zona a múltiples camiones/contenedores/rutas/colecciones.
- `bulk_export(resource, ids)` — Genera y devuelve un CSV/JSON con los registros seleccionados.

**Mapeo de campos por recurso:**
- `users` → tabla `users`, campo `status` (activo/inactivo), campo `role`.
- `zones` → tabla `zones`, campo `status` (activo/inactivo), relación con `user_id` (supervisor).
- `schedules` → tabla `schedules`, campo `status` (activo/inactivo).
- `trucks` → tabla `trucks`, campo `status` (disponible/en_ruta/mantenimiento), relación con `zone_id`.
- `maintenance` → tabla `maintenance_records`, campo `status` (pendiente/completado/cancelado).
- `routes` → tabla `routes`, campo `status` (activo/inactivo), relación con `truck_id` y `zone_id`.
- `reports` → tabla `reports`, campo `status` (nuevo/en_proceso/resuelto).
- `containers` → tabla `containers`, campo `status` (activo/inactivo), relación con `zone_id`.
- `collections` → tabla `collections`, campo `status` (pendiente/completado/cancelado), relación con `truck_id` y `zone_id`.

#### 1.4. Exportación

Para la acción `export`:
- Devuelve `Response` con `media_type="text/csv"` o `application/json`.
- Incluye todos los campos relevantes del recurso.
- Genera un nombre de archivo descriptivo: `{resource}_{timestamp}.csv`.
- Si `ids` está vacío, exportar todos los registros del recurso (opcional, pero útil).

#### 1.5. Mantener backward compatibility

- La acción `delete` debe funcionar exactamente igual que antes.
- El endpoint debe seguir requiriendo rol `admin`.
- No modifiques la firma del endpoint (mantén `POST /api/admin/bulk-action`).

---

### 2. Backend — Tests

**Archivo:** `backend-python/tests/test_operational_logic.py`

Agrega tests para las nuevas acciones:

- `test_bulk_update_status_users()` — Actualiza status de múltiples usuarios.
- `test_bulk_assign_user_to_zones()` — Asigna un usuario a múltiples zonas.
- `test_bulk_assign_truck_to_routes()` — Asigna un camión a múltiples rutas.
- `test_bulk_assign_zone_to_trucks()` — Asigna una zona a múltiples camiones.
- `test_bulk_export_users_csv()` — Verifica que la exportación devuelve CSV con contenido correcto.
- `test_bulk_export_zones_json()` — Verifica que la exportación devuelve JSON.
- `test_bulk_action_invalid_resource()` — Devuelve 400 para recurso no soportado.
- `test_bulk_action_missing_required_data()` — Devuelve 400 si falta `data` para acciones que lo requieren.
- `test_bulk_action_non_admin()` — Devuelve 403 para usuario no admin.
- Tests para `routes`, `reports`, `containers`, `collections` con las mismas operaciones.

**Criterios:**
- Todos los tests nuevos deben pasar.
- Los tests existentes de bulk delete no deben romperse.

---

### 3. Frontend — Actualizar `Admin.tsx`

**Archivo:** `frontend/src/components/Admin.tsx`

#### 3.1. Extender la barra de acciones masivas

Actualmente la barra de acciones masivas solo muestra el botón "Eliminar seleccionados" (línea ~503-525). Modifícala para mostrar un menú desplegable o botones adicionales según la entidad:

**Componente de barra de acciones:**
- Selector de acción (dropdown) con opciones: "Eliminar", "Cambiar estado", "Asignar usuario", "Asignar camión", "Asignar zona", "Exportar".
- Si la acción requiere parámetros (ej: asignar usuario), mostrar un formulario modal o inline para seleccionar el valor.
- Botón "Aplicar" que ejecuta la acción.
- Botón "Cancelar" para limpiar selección.

#### 3.2. Implementar funciones de acción masiva

Agrega funciones al componente `Admin.tsx`:

```typescript
const handleBulkAction = async (action: string, resource: string, selectedIds: number[], extraData?: Record<string, any>) => {
    const payload = {
        resource,
        action,
        ids: selectedIds,
        data: extraData || null
    };
    
    const response = await fetch('/api/admin/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error en operación masiva');
    }
    
    // Si es exportación, descargar archivo
    if (action === 'export') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resource}_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        return;
    }
    
    // Recargar datos después de la acción
    await loadData();
    setSelectedIds([]);
};
```

#### 3.3. Agregar UI por entidad

Para cada entidad en `Admin.tsx` (Users, Zones, Schedules, Trucks, Maintenance), agrega:

**Usuarios:**
- Dropdown "Cambiar estado" con opciones: "Activar", "Desactivar".
- Dropdown "Cambiar rol" con opciones: "admin", "ciudadano", "conductor".
- Botón "Exportar CSV".

**Zonas:**
- Dropdown "Cambiar estado" con opciones: "Activar", "Desactivar".
- Dropdown "Asignar supervisor" con lista de usuarios (fetch de `/api/users`).
- Botón "Exportar CSV".

**Horarios:**
- Dropdown "Cambiar estado" con opciones: "Activar", "Desactivar".
- Botón "Exportar CSV".

**Camiones:**
- Dropdown "Cambiar estado" con opciones: "Disponible", "En ruta", "Mantenimiento".
- Dropdown "Asignar zona" con lista de zonas (fetch de `/api/zones`).
- Botón "Exportar CSV".

**Mantenimiento:**
- Dropdown "Cambiar estado" con opciones: "Pendiente", "Completado", "Cancelado".
- Botón "Exportar CSV".

#### 3.4. Agregar secciones nuevas a `Admin.tsx`

Actualmente `Admin.tsx` solo maneja 5 entidades. Agrega secciones completas para:

**Rutas:**
- Tabla con columnas: ID, Nombre, Zona, Camión asignado, Estado, Acciones.
- Checkboxes por fila.
- Bulk actions: eliminar, cambiar estado, asignar camión, asignar zona, exportar.

**Reportes:**
- Tabla con columnas: ID, Título, Tipo, Estado, Fecha, Acciones.
- Checkboxes por fila.
- Bulk actions: eliminar, cambiar estado, exportar.

**Contenedores:**
- Tabla con columnas: ID, Código, Zona, Estado, Acciones.
- Checkboxes por fila.
- Bulk actions: eliminar, cambiar estado, asignar zona, exportar.

**Colecciones:**
- Tabla con columnas: ID, Camión, Zona, Fecha, Estado, Acciones.
- Checkboxes por fila.
- Bulk actions: eliminar, cambiar estado, asignar camión, asignar zona, exportar.

#### 3.5. Actualizar la navegación del admin

En `Admin.tsx`, agrega pestañas o secciones para las nuevas entidades:
- Rutas
- Reportes
- Contenedores
- Colecciones

Mantén las existentes:
- Usuarios
- Zonas
- Horarios
- Camiones
- Mantenimiento

#### 3.6. Estilos

**Archivo:** `frontend/src/styles.css`

- Agrega estilos para el menú desplegable de acciones masivas.
- Agrega estilos para el modal/formulario de parámetros de acción masiva.
- Asegura que la barra de acciones masivas sea responsive.
- Estilos para las nuevas tablas (Rutas, Reportes, Contenedores, Colecciones) consistentes con las existentes.

---

### 4. Frontend — Tests

**Archivo:** `frontend/src/components/Admin.test.tsx`

Agrega tests para:

- `test_bulk_delete_users()` — Verifica que eliminar usuarios funciona.
- `test_bulk_update_status_zones()` — Simula cambio de estado masivo en zonas.
- `test_bulk_assign_truck_to_routes()` — Simula asignación masiva de camión a rutas.
- `test_bulk_export_maintenance_csv()` — Verifica que se descarga un CSV.
- `test_select_all_checkbox()` — Verifica que "Seleccionar todo" marca/desmarca todas las filas.
- `test_bulk_action_bar_visibility()` — Verifica que la barra aparece solo cuando hay selección.
- Tests para las nuevas entidades (Rutas, Reportes, Contenedores, Colecciones).

**Criterios:**
- Todos los tests nuevos deben pasar.
- Los tests existentes no deben romperse.

---

### 5. Backend — API de datos para selects

Si las entidades nuevas (Rutas, Reportes, Contenedores, Colecciones) no tienen endpoints CRUD completos, asegúrate de que existan endpoints mínimos para:

- Listar rutas (`GET /api/routes`)
- Listar reportes (`GET /api/reports`)
- Listar contenedores (`GET /api/containers`)
- Listar colecciones (`GET /api/collections`)
- Listar usuarios (`GET /api/users`) — para selects de asignación.
- Listar zonas (`GET /api/zones`) — para selects de asignación.
- Listar camiones (`GET /api/trucks`) — para selects de asignación.

Si estos endpoints no existen, créalos o verifica que los existentes devuelvan los datos necesarios (al menos `id` y `nombre`/`descripcion`).

---

### 6. Pruebas y verificación

#### 6.1. Backend — modo memoria

```powershell
cd backend-python
.\.venv\Scripts\python.exe -m pytest -q
```

- Todos los tests deben pasar.
- Verifica manualmente con curl o Postman:
  - `POST /api/admin/bulk-action` con `action: "delete"` → funciona como antes.
  - `POST /api/admin/bulk-action` con `action: "update_status"` → actualiza estados.
  - `POST /api/admin/bulk-action` con `action: "export"` → devuelve CSV.

#### 6.2. Frontend

```powershell
cd frontend
npm run dev
```

- Abre `http://localhost:5173`.
- Ve al panel de administración.
- Prueba cada operación masiva en cada entidad.
- Verifica que las nuevas secciones (Rutas, Reportes, Contenedores, Colecciones) se muestren correctamente.
- Verifica que la exportación descargue archivos válidos.

#### 6.3. Tests frontend

```powershell
cd frontend
npx vitest run
```

- Todos los tests deben pasar.

---

### 7. Documentación

#### 7.1. Actualizar `docs/DESPLIEGUE.md`

Agrega una sección:

```markdown
## Operaciones masivas en panel de administrador

El panel de administrador soporta las siguientes operaciones masivas:

- **Eliminación masiva:** Elimina múltiples registros de cualquier entidad.
- **Cambio de estado:** Actualiza el estado de múltiples registros (usuarios, zonas, horarios, camiones, mantenimiento, rutas, reportes, contenedores, colecciones).
- **Asignación masiva:** Asigna usuarios, zonas o camiones a múltiples registros.
- **Exportación:** Exporta registros seleccionados a CSV o JSON.

### Uso

1. Selecciona los registros usando los checkboxes.
2. Usa "Seleccionar todo" para marcar todos los registros de la página.
3. Elige una acción en la barra de acciones masivas.
4. Si la acción requiere parámetros (ej: asignar usuario), selecciona el valor en el formulario que aparece.
5. Haz clic en "Aplicar".
```

#### 7.2. Actualizar `AGENTS.md`

Agrega en la sección de convenciones o en una nueva sección:

```markdown
## Operaciones masivas

El panel de administrador soporta operaciones masivas en todas las entidades:
- Usuarios, Zonas, Horarios, Camiones, Mantenimiento, Rutas, Reportes, Contenedores, Colecciones.

Acciones disponibles: eliminar, cambiar estado, asignar (usuario/zona/camión), exportar CSV/JSON.
```

---

### 8. Criterios de aceptación

- [ ] Backend: `POST /api/admin/bulk-action` soporta `delete`, `update_status`, `assign_user`, `assign_truck`, `assign_zone`, `export` para todas las entidades.
- [ ] Backend: Validaciones correctas para parámetros requeridos y existencia de registros relacionados.
- [ ] Backend: Exportación devuelve CSV/JSON válido con los datos solicitados.
- [ ] Frontend: Barra de acciones masivas funcional para todas las entidades.
- [ ] Frontend: Formularios de parámetros (selects) para acciones que lo requieren.
- [ ] Frontend: Secciones nuevas para Rutas, Reportes, Contenedores, Colecciones.
- [ ] Frontend: Exportación descarga archivos correctamente.
- [ ] Tests backend: `pytest` pasa al 100%.
- [ ] Tests frontend: `vitest` pasa al 100%.
- [ ] Documentación actualizada.
- [ ] No se rompe la funcionalidad existente de bulk delete.
