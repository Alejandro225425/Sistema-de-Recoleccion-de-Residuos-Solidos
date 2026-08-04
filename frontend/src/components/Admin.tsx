import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Bootstrap, Session, Role, Zone, Schedule, Truck, OperationUpdatePayload } from "../types";
import { request } from "../api";
import Item from "./Item";

function compactArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => Boolean(item)) : [];
}

type MaintenanceRecord = {
  id: number;
  truck_id: number;
  description: string;
  status: string;
  created_at: string;
};

const initialUserFormValues = {
  name: "",
  email: "",
  password: "",
  role: "ciudadano" as Role,
  zone: "Centro Historico",
};

export default function Admin({ data, session, onOperationUpdate, onRefresh }: { data: Bootstrap; session: Session; onOperationUpdate: (payload: OperationUpdatePayload) => Promise<void>; onRefresh?: () => Promise<void>; }) {
  const safeData = useMemo(() => {
    const base = data ?? { zones: [], schedules: [], trucks: [], routes: [], reports: [], collections: [], analytics: { zones: 0, active_trucks: 0, open_reports: 0, confirmed_collections: 0, total_kg: 0, compliance: 0 } };
    return {
      zones: compactArray<Zone>(base.zones),
      schedules: compactArray<Schedule>(base.schedules),
      trucks: compactArray<Truck>(base.trucks),
      routes: compactArray<Bootstrap["routes"][number]>(base.routes),
      reports: compactArray<Bootstrap["reports"][number]>(base.reports),
      collections: compactArray<Bootstrap["collections"][number]>(base.collections),
      users: compactArray<Session>(base.users),
      containers: compactArray<NonNullable<Bootstrap["containers"]>[number]>(base.containers),
      maintenance: compactArray<MaintenanceRecord>(base.maintenance),
    };
  }, [data]);

  const [users, setUsers] = useState<Session[]>(safeData.users);
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<number, Role>>({});
  const [savingUserIds, setSavingUserIds] = useState<number[]>([]);
  const [deletingUserIds, setDeletingUserIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const truckNameById = useMemo(() => {
    const map: Record<number, string> = {};
    (safeData.trucks ?? []).forEach(t => { map[t.id] = `${t.code} - ${t.driver}`; });
    return map;
  }, [safeData.trucks]);
  const [formValues, setFormValues] = useState(() => ({
    ...initialUserFormValues,
    zone: session?.zone ?? initialUserFormValues.zone,
  }));

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const [zones, setZones] = useState<Zone[]>(safeData.zones);
  const [zoneSearch, setZoneSearch] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneLat, setNewZoneLat] = useState("");
  const [newZoneLng, setNewZoneLng] = useState("");
  const [newZoneCriticality, setNewZoneCriticality] = useState("Media");
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingZoneName, setEditingZoneName] = useState("");

  const [schedules, setSchedules] = useState<Schedule[]>(safeData.schedules);
  const [newSchedule, setNewSchedule] = useState({ zone_id: safeData.zones[0]?.id ?? 0, day: "Lunes", time: "08:00", waste: "Orgánicos" });
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState({ zone_id: safeData.zones[0]?.id ?? 0, day: "Lunes", time: "08:00", waste: "Orgánicos" });
  const [eventType, setEventType] = useState<"route_update" | "container_update">("route_update");
  const [eventTargetId, setEventTargetId] = useState<number | null>(safeData.routes[0]?.id ?? safeData.containers[0]?.id ?? null);
  const [eventProgress, setEventProgress] = useState("");
  const [eventDelay, setEventDelay] = useState("");
  const [eventFillLevel, setEventFillLevel] = useState("");
  const [eventStatus, setEventStatus] = useState("");
  const [eventNote, setEventNote] = useState("");

  const [trucks, setTrucks] = useState<Truck[]>(safeData.trucks);
  const [truckDriverSearch, setTruckDriverSearch] = useState("");
  const [truckStatusFilter, setTruckStatusFilter] = useState("Todos");
  const [newTruck, setNewTruck] = useState({ code: "", driver: "", status: "En ruta", zone_id: safeData.zones[0]?.id ?? 1, latitude: 0, longitude: 0 });
  const [editingTruckId, setEditingTruckId] = useState<number | null>(null);
  const [editingTruck, setEditingTruck] = useState({ code: "", driver: "", status: "En ruta", zone_id: safeData.zones[0]?.id ?? 1, latitude: 0, longitude: 0 });
  const [savingTruckIds, setSavingTruckIds] = useState<number[]>([]);
  const [deletingTruckIds, setDeletingTruckIds] = useState<number[]>([]);

  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>(safeData.maintenance);
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("Todos");
  const [newMaintenance, setNewMaintenance] = useState({ truck_id: safeData.trucks[0]?.id ?? 0, description: "", status: "Pendiente" });
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<number | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState({ truck_id: safeData.trucks[0]?.id ?? 0, description: "", status: "Pendiente" });
  const [savingMaintenanceIds, setSavingMaintenanceIds] = useState<number[]>([]);
  const [deletingMaintenanceIds, setDeletingMaintenanceIds] = useState<number[]>([]);

  useEffect(() => {
    setUsers(safeData.users);
    setZones(safeData.zones);
    setSchedules(safeData.schedules);
    setTrucks(safeData.trucks);
    setMaintenance(safeData.maintenance);
    setNewTruck(prev => ({ ...prev, zone_id: safeData.zones[0]?.id ?? prev.zone_id }));
    setNewMaintenance(prev => ({ ...prev, truck_id: safeData.trucks[0]?.id ?? prev.truck_id }));
    setNewSchedule(prev => ({ ...prev, zone_id: safeData.zones[0]?.id ?? prev.zone_id }));
    setEditingTruckId(null);
    setEditingTruck({ code: '', driver: '', status: 'En ruta', zone_id: safeData.zones[0]?.id ?? 1, latitude: 0, longitude: 0 });
    setEditingMaintenanceId(null);
    setEditingMaintenance({ truck_id: safeData.trucks[0]?.id ?? 0, description: '', status: 'Pendiente' });
  }, [safeData]);

  useEffect(() => {
    const routeIds = safeData.routes.map(route => route.id);
    const containerIds = safeData.containers.map(container => container.id);
    const availableIds = eventType === "route_update" ? routeIds : containerIds;
    if (availableIds.length === 0) {
      setEventTargetId(null);
      return;
    }
    if (eventTargetId === null || !availableIds.includes(eventTargetId)) {
      setEventTargetId(availableIds[0]);
    }
  }, [eventType, safeData.routes, safeData.containers, eventTargetId]);

  const filteredZones = useMemo(
    () => (Array.isArray(zones) ? zones : []).filter(zone => zone && String(zone.name ?? "").toLowerCase().includes(String(zoneSearch ?? "").toLowerCase().trim())),
    [zones, zoneSearch]
  );

  const filteredTrucks = useMemo(
    () => (Array.isArray(trucks) ? trucks : []).filter(truck => {
      if (!truck) return false;
      const driver = String(truck.driver ?? "");
      const matchesDriver = driver.toLowerCase().includes(String(truckDriverSearch ?? "").toLowerCase().trim());
      const matchesStatus = truckStatusFilter === "Todos" || truck.status === truckStatusFilter;
      return matchesDriver && matchesStatus;
    }),
    [trucks, truckDriverSearch, truckStatusFilter]
  );

  const filteredMaintenance = useMemo(
    () => (Array.isArray(maintenance) ? maintenance : []).filter(item => item && (maintenanceStatusFilter === "Todos" || item.status === maintenanceStatusFilter)),
    [maintenance, maintenanceStatusFilter]
  );

  async function updateUserRole(user: Session) {
    if (!user.id) return;
    const nextRole = userRoleDrafts[user.id] ?? user.role;
    setSavingUserIds(prev => prev.includes(user.id!) ? prev : [...prev, user.id!]);
    try {
      const updated = await request<Session>(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole })
      });
      setUsers(prev => prev.map(item => item.id === user.id ? { ...item, role: updated.role ?? nextRole } : item));
      setFeedback(`Rol actualizado para ${user.name}`);
      await onRefresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el usuario';
      setFeedback(message);
    } finally {
      setSavingUserIds(prev => prev.filter(id => id !== user.id));
    }
  }

async function deleteUser(user: Session) {
     if (!user.id) return;
     if (!window.confirm(`¿Estás seguro de eliminar al usuario ${user.name}? Esta acción no se puede deshacer.`)) return;
     setDeletingUserIds(prev => prev.includes(user.id!) ? prev : [...prev, user.id!]);
    try {
      await request(`/users/${user.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(item => item.id !== user.id));
      setFeedback(`Usuario ${user.name} eliminado`);
      await onRefresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario';
      setFeedback(message);
    } finally {
      setDeletingUserIds(prev => prev.filter(id => id !== user.id));
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await request<Session>('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: formValues.name,
          email: formValues.email,
          password: formValues.password,
          role: formValues.role,
          zone: formValues.zone,
        })
      });
       if (created) {
         setUsers(prev => [...prev, { ...created, email: formValues.email, role: formValues.role, zone: formValues.zone }]);
       }
       setFeedback(`Usuario creado: ${formValues.name}`);
       setFormValues({ ...initialUserFormValues, zone: session?.zone ?? initialUserFormValues.zone });
       await onRefresh?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el usuario';
      setFeedback(message);
    } finally {
      setCreating(false);
    }
  }

  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newZoneName.trim()) return;
    const lat = Number(newZoneLat);
    const lng = Number(newZoneLng);
    if (isNaN(lat) || isNaN(lng)) {
      setFeedback("Ingresa coordenadas válidas para latitud y longitud.");
      return;
    }
    setCreating(true);
    try {
      const created = await request<Zone>('/zones', {
        method: 'POST',
        body: JSON.stringify({ name: newZoneName, latitude: lat, longitude: lng, criticality: newZoneCriticality })
      });
      setZones(prev => [...prev, created]);
      setNewZoneName('');
      setNewZoneLat('');
      setNewZoneLng('');
      setNewZoneCriticality('Media');
      setFeedback(`Zona creada: ${created.name}`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo crear la zona');
    } finally {
      setCreating(false);
    }
  }

  function startEditZone(zone: Zone) {
    setEditingZoneId(zone.id);
    setEditingZoneName(zone.name);
  }

  async function saveZoneEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingZoneId === null) return;
    try {
      const updated = await request<Zone>(`/zones/${editingZoneId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingZoneName })
      });
       setZones(prev => prev.map(zone => zone.id === editingZoneId ? { ...zone, name: updated.name } : zone));
       setEditingZoneId(null);
       setEditingZoneName("");
       setFeedback(`Zona actualizada: ${updated.name}`);
       await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo editar la zona');
    }
  }

async function deleteZone(zoneId: number) {
     const zone = zones.find(z => z.id === zoneId);
     if (!window.confirm(`¿Estás seguro de eliminar la zona ${zone?.name ?? zoneId}? Esta acción no se puede deshacer.`)) return;
     try {
      await request(`/zones/${zoneId}`, { method: 'DELETE' });
      setZones(prev => prev.filter(zone => zone.id !== zoneId));
      setFeedback('Zona eliminada');
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo eliminar la zona');
    }
  }

  async function createSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await request<Schedule>('/schedules', {
        method: 'POST',
        body: JSON.stringify(newSchedule)
      });
      setSchedules(prev => [...prev, created]);
      setNewSchedule({ zone_id: safeData.zones[0]?.id ?? 1, day: 'Lunes', time: '08:00', waste: 'Orgánicos' });
      setFeedback(`Horario creado para ${created.zone}`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo crear el horario');
    } finally {
      setCreating(false);
    }
  }

  function startEditSchedule(schedule: Schedule) {
    setEditingScheduleId(schedule.id);
    setEditingSchedule({ zone_id: schedule.zone_id ?? 1, day: schedule.day, time: schedule.time, waste: schedule.waste });
  }

  async function saveScheduleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingScheduleId === null) return;
    try {
      const updated = await request<Schedule>(`/schedules/${editingScheduleId}`, {
        method: 'PATCH',
        body: JSON.stringify(editingSchedule)
      });
      setSchedules(prev => prev.map(s => s.id === editingScheduleId ? { ...s, ...updated } : s));
      setEditingScheduleId(null);
      setEditingSchedule({ zone_id: 1, day: 'Lunes', time: '08:00', waste: 'Orgánicos' });
      setFeedback(`Horario actualizado para ${updated.zone}`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo editar el horario');
    }
  }

async function deleteSchedule(scheduleId: number) {
     if (!window.confirm('¿Estás seguro de eliminar este horario? Esta acción no se puede deshacer.')) return;
     try {
      await request(`/schedules/${scheduleId}`, { method: 'DELETE' });
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      setFeedback('Horario eliminado');
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo eliminar el horario');
    }
  }

  async function createTruck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await request<Truck>('/trucks', {
        method: 'POST',
        body: JSON.stringify(newTruck)
      });
      setTrucks(prev => [...prev, created]);
      setNewTruck({ code: '', driver: '', status: 'En ruta', zone_id: safeData.zones[0]?.id ?? 1, latitude: 0, longitude: 0 });
      setFeedback(`Camión creado: ${created.code}`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo crear el camión');
    } finally {
      setCreating(false);
    }
  }

  function startEditTruck(truck: Truck) {
    setEditingTruckId(truck.id);
    setEditingTruck({ code: truck.code, driver: truck.driver, status: truck.status, zone_id: truck.zone_id ?? safeData.zones[0]?.id ?? 1, latitude: truck.latitude, longitude: truck.longitude });
  }

  async function saveTruckEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingTruckId === null) return;
    setSavingTruckIds(prev => prev.includes(editingTruckId) ? prev : [...prev, editingTruckId]);
    try {
      const updated = await request<Truck>(`/trucks/${editingTruckId}`, {
        method: 'PATCH',
        body: JSON.stringify(editingTruck)
      });
      setTrucks(prev => prev.map(t => t.id === editingTruckId ? { ...t, ...updated } : t));
      setEditingTruckId(null);
      setEditingTruck({ code: '', driver: '', status: 'En ruta', zone_id: safeData.zones[0]?.id ?? 1, latitude: 0, longitude: 0 });
      setFeedback(`Camión actualizado: ${updated.code}`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo editar el camión');
    } finally {
      setSavingTruckIds(prev => prev.filter(id => id !== editingTruckId));
    }
  }

async function deleteTruck(truck: Truck) {
     if (!truck.id) return;
     if (!window.confirm(`¿Estás seguro de eliminar el camión ${truck.code} de ${truck.driver}? Esta acción no se puede deshacer.`)) return;
     setDeletingTruckIds(prev => prev.includes(truck.id!) ? prev : [...prev, truck.id!]);
    try {
      await request(`/trucks/${truck.id}`, { method: 'DELETE' });
      setTrucks(prev => prev.filter(t => t.id !== truck.id));
      setFeedback(`Camión ${truck.code} eliminado`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo eliminar el camión');
    } finally {
      setDeletingTruckIds(prev => prev.filter(id => id !== truck.id));
    }
  }

  async function createMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMaintenance.description.trim()) return;
    setCreating(true);
    try {
      const created = await request<MaintenanceRecord>('/maintenance', {
        method: 'POST',
        body: JSON.stringify(newMaintenance)
      });
      setMaintenance(prev => [...prev, created]);
      setNewMaintenance({ truck_id: safeData.trucks[0]?.id ?? 0, description: '', status: 'Pendiente' });
      setFeedback(`Mantenimiento creado para camión ${truckNameById[created.truck_id] ?? `#${created.truck_id}`}`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo crear el mantenimiento');
    } finally {
      setCreating(false);
    }
  }

  function startEditMaintenance(item: MaintenanceRecord) {
    setEditingMaintenanceId(item.id);
    setEditingMaintenance({ truck_id: item.truck_id, description: item.description, status: item.status });
  }

  async function saveMaintenanceEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingMaintenanceId === null) return;
    setSavingMaintenanceIds(prev => prev.includes(editingMaintenanceId) ? prev : [...prev, editingMaintenanceId]);
    try {
      const updated = await request<MaintenanceRecord>(`/maintenance/${editingMaintenanceId}`, {
        method: 'PATCH',
        body: JSON.stringify(editingMaintenance)
      });
      setMaintenance(prev => prev.map(item => item.id === editingMaintenanceId ? { ...item, ...updated } : item));
      setEditingMaintenanceId(null);
      setEditingMaintenance({ truck_id: safeData.trucks[0]?.id ?? 0, description: '', status: 'Pendiente' });
      setFeedback(`Mantenimiento #${updated.id} actualizado`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo editar el mantenimiento');
    } finally {
      setSavingMaintenanceIds(prev => prev.filter(id => id !== editingMaintenanceId));
    }
  }

async function deleteMaintenance(item: MaintenanceRecord) {
     if (!item.id) return;
     if (!window.confirm(`¿Estás seguro de eliminar el mantenimiento #${item.id}? Esta acción no se puede deshacer.`)) return;
     setDeletingMaintenanceIds(prev => prev.includes(item.id!) ? prev : [...prev, item.id!]);
    try {
      await request(`/maintenance/${item.id}`, { method: 'DELETE' });
      setMaintenance(prev => prev.filter(m => m.id !== item.id));
      setFeedback(`Mantenimiento #${item.id} eliminado`);
      await onRefresh?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo eliminar el mantenimiento');
    } finally {
      setDeletingMaintenanceIds(prev => prev.filter(id => id !== item.id));
    }
  }

  async function submitEventUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (eventTargetId === null) {
      setFeedback('Selecciona primero una ruta o contenedor válido.');
      return;
    }
    const payload: OperationUpdatePayload = {
      type: eventType,
      id: eventTargetId,
      note: eventNote.trim() || undefined,
    };

    if (eventType === "route_update") {
      if (eventProgress.trim()) payload.progress = Number(eventProgress);
      if (eventDelay.trim()) payload.delay = eventDelay;
    } else {
      if (eventFillLevel.trim()) payload.fill_level = Number(eventFillLevel);
      if (eventStatus.trim()) payload.status = eventStatus;
    }

    try {
      await onOperationUpdate(payload);
      setEventProgress("");
      setEventDelay("");
      setEventFillLevel("");
      setEventStatus("");
      setEventNote("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo enviar el evento operativo');
    }
  }

  return (
    <div className="admin-grid admin-shell" data-testid="admin-shell">
      <section className="panel">
        <h2>Gestión de usuarios</h2>
        <p>Administra roles, accesos y usuarios del sistema.</p>
        <form className="form-grid" onSubmit={createUser}>
          <label htmlFor="admin-user-name">Nombre<input id="admin-user-name" required value={formValues.name} onChange={event => {
              const value = event.currentTarget.value;
              setFormValues(prev => ({ ...prev, name: value }));
            }} /></label>
          <label htmlFor="admin-user-email">Correo<input id="admin-user-email" required type="email" value={formValues.email} onChange={event => {
              const value = event.currentTarget.value;
              setFormValues(prev => ({ ...prev, email: value }));
            }} /></label>
          <label htmlFor="admin-user-password">Contraseña<input id="admin-user-password" required type="password" minLength={8} value={formValues.password} onChange={event => {
              const value = event.currentTarget.value;
              setFormValues(prev => ({ ...prev, password: value }));
            }} /></label>
          <label htmlFor="admin-user-role">Rol<select id="admin-user-role" value={formValues.role} onChange={event => {
              const value = event.currentTarget.value as Role;
              setFormValues(prev => ({ ...prev, role: value }));
            }}>
            <option value="ciudadano">Ciudadano</option>
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
            <option value="conductor">Conductor</option>
          </select></label>
          <label htmlFor="admin-user-zone">Zona<input id="admin-user-zone" value={formValues.zone} onChange={event => {
              const value = event.currentTarget.value;
              setFormValues(prev => ({ ...prev, zone: value }));
            }} /></label>
          <button type="submit" disabled={creating}>{creating ? "Creando..." : "Crear usuario"}</button>
        </form>
        {feedback && <p className="hint success" role="status" aria-live="polite">{feedback}</p>}
        <ul className="list" aria-label="Lista de usuarios">
          {users.length === 0 ? (
            <li className="empty-state">No hay usuarios registrados todavía.</li>
          ) : users.map((user, index) => (
<li key={`user-${user.id ?? user.email}-${index}`} className="admin-list-item">
               <div className="admin-list-main">
                 <strong>{user.name ?? "Sin nombre"}</strong>
                 <div className="admin-list-meta">{user.email} · {user.zone ?? "Sin zona"}</div>
               </div>
               <div className="admin-list-actions">
                 <select value={userRoleDrafts[user.id ?? 0] ?? user.role} onChange={event => {
                   const value = event.currentTarget.value as Role;
                   setUserRoleDrafts(prev => ({ ...prev, [user.id ?? 0]: value }));
                 }} aria-label={`Rol de ${user.name}`}>
                   <option value="ciudadano">Ciudadano</option>
                   <option value="operador">Operador</option>
                   <option value="admin">Administrador</option>
                   <option value="conductor">Conductor</option>
                 </select>
                 <button type="button" onClick={() => updateUserRole(user)} disabled={!user.id || savingUserIds.includes(user.id)}>{savingUserIds.includes(user.id ?? -1) ? "Guardando..." : "Guardar rol"}</button>
                 <button type="button" onClick={() => deleteUser(user)} disabled={deletingUserIds.includes(user.id ?? -1)} className="danger">{deletingUserIds.includes(user.id ?? -1) ? "Eliminando..." : "Eliminar"}</button>
               </div>
             </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Gestión de zonas</h2>
        <p>Administra las zonas de recolección y priorización urbana.</p>
        {editingZoneId === null ? (
          <form className="form-grid" onSubmit={createZone}>
             <label htmlFor="new-zone-name">Nombre de la zona<input id="new-zone-name" required placeholder="Nombre de zona" value={newZoneName} onChange={event => {
               const value = event.currentTarget.value;
               setNewZoneName(value);
             }} /></label>
             <label htmlFor="new-zone-lat">Latitud<input id="new-zone-lat" required type="number" step="0.0000001" value={newZoneLat} onChange={event => setNewZoneLat(event.currentTarget.value)} placeholder="-13.5166" /></label>
             <label htmlFor="new-zone-lng">Longitud<input id="new-zone-lng" required type="number" step="0.0000001" value={newZoneLng} onChange={event => setNewZoneLng(event.currentTarget.value)} placeholder="-71.9670" /></label>
             <label htmlFor="new-zone-criticality">Criticidad<select id="new-zone-criticality" value={newZoneCriticality} onChange={event => setNewZoneCriticality(event.currentTarget.value)}><option>Alta</option><option>Media</option><option>Baja</option></select></label>
             <button type="submit" disabled={creating}>{creating ? "Creando..." : "Crear zona"}</button>
           </form>
        ) : (
          <form className="form-grid" onSubmit={saveZoneEdit}>
            <label htmlFor="edit-zone-name">Nombre de la zona<input id="edit-zone-name" required value={editingZoneName} onChange={event => {
              const value = event.currentTarget.value;
              setEditingZoneName(value);
            }} /></label>
            <button type="submit">Guardar cambios</button>
            <button type="button" onClick={() => { setEditingZoneId(null); setEditingZoneName(""); }}>Cancelar</button>
          </form>
        )}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Filtrar zonas" value={zoneSearch} onChange={event => {
              const value = event.currentTarget.value;
              setZoneSearch(value);
            }} aria-label="Filtrar zonas" />
        </div>
        <ul className="list" aria-label="Lista de zonas">
          {filteredZones.length === 0 ? (
            <li className="empty-state">No se encontraron zonas que coincidan con el filtro.</li>
          ) : filteredZones.map(zone => (
            <li key={zone.id} className="admin-list-item">
              <div className="admin-list-main">
                <strong>{zone.name ?? "Sin nombre"}</strong>
                <div className="admin-list-meta">Criticidad {zone.criticality ?? "Sin datos"}</div>
              </div>
              <div className="admin-list-actions">
                <button type="button" onClick={() => startEditZone(zone)}>Editar zona</button>
                <button type="button" onClick={() => deleteZone(zone.id)}>Eliminar zona</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Gestión de horarios</h2>
        <p>Define y administra la programación de recolección por zona.</p>
        {editingScheduleId === null ? (
          <form className="form-grid" onSubmit={createSchedule}>
            <label htmlFor="schedule-zone">Zona<select id="schedule-zone" value={newSchedule.zone_id} onChange={event => {
              const value = Number(event.currentTarget.value);
              setNewSchedule(prev => ({ ...prev, zone_id: value }));
            }}>{safeData.zones.map((zone, index) => <option key={`zone-${zone.id}-${index}`} value={zone.id}>{zone.name}</option>)}</select></label>
            <label htmlFor="schedule-day">Día<select id="schedule-day" value={newSchedule.day} onChange={event => {
              const value = event.currentTarget.value;
              setNewSchedule(prev => ({ ...prev, day: value }));
            }}><option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option><option>Sábado</option></select></label>
            <label htmlFor="schedule-time">Hora<input id="schedule-time" type="time" value={newSchedule.time} onChange={event => {
              const value = event.currentTarget.value;
              setNewSchedule(prev => ({ ...prev, time: value }));
            }} /></label>
            <label htmlFor="schedule-waste">Tipo de residuo<input id="schedule-waste" value={newSchedule.waste} onChange={event => {
              const value = event.currentTarget.value;
              setNewSchedule(prev => ({ ...prev, waste: value }));
            }} /></label>
            <button type="submit" disabled={creating}>{creating ? "Creando..." : "Crear horario"}</button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={saveScheduleEdit}>
            <label htmlFor="edit-schedule-zone">Zona<select id="edit-schedule-zone" value={editingSchedule.zone_id} onChange={event => {
              const value = Number(event.currentTarget.value);
              setEditingSchedule(prev => ({ ...prev, zone_id: value }));
            }}>{safeData.zones.map((zone, index) => <option key={`zone-${zone.id}-${index}`} value={zone.id}>{zone.name}</option>)}</select></label>
            <label htmlFor="edit-schedule-day">Día<select id="edit-schedule-day" value={editingSchedule.day} onChange={event => {
              const value = event.currentTarget.value;
              setEditingSchedule(prev => ({ ...prev, day: value }));
            }}><option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option><option>Sábado</option></select></label>
            <label htmlFor="edit-schedule-time">Hora<input id="edit-schedule-time" type="time" value={editingSchedule.time} onChange={event => {
              const value = event.currentTarget.value;
              setEditingSchedule(prev => ({ ...prev, time: value }));
            }} /></label>
            <label htmlFor="edit-schedule-waste">Tipo de residuo<input id="edit-schedule-waste" value={editingSchedule.waste} onChange={event => {
              const value = event.currentTarget.value;
              setEditingSchedule(prev => ({ ...prev, waste: value }));
            }} /></label>
            <button type="submit">Guardar cambios</button>
            <button type="button" onClick={() => { setEditingScheduleId(null); setEditingSchedule({ zone_id: 1, day: 'Lunes', time: '08:00', waste: 'Orgánicos' }); }}>Cancelar</button>
          </form>
        )}
        <ul className="list" aria-label="Lista de horarios">
          {schedules.length === 0 ? (
            <li className="empty-state">No hay horarios registrados aún.</li>
          ) : schedules.map(schedule => (
            <li key={schedule.id} className="admin-list-item">
              <div className="admin-list-main">
                <strong>{schedule.zone}</strong>
                <div className="admin-list-meta">{schedule.day} · {schedule.time} · {schedule.waste}</div>
              </div>
              <div className="admin-list-actions">
                <button type="button" onClick={() => startEditSchedule(schedule)}>Editar</button>
                <button type="button" onClick={() => deleteSchedule(schedule.id)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Gestión de camiones</h2>
        <p>Filtra y administra el estado de los vehículos de recolección.</p>
        <div className="search-box">
          <span className="search-icon">🚗</span>
          <input type="text" placeholder="Buscar por conductor" value={truckDriverSearch} onChange={event => setTruckDriverSearch(event.currentTarget.value)} aria-label="Buscar por conductor" />
        </div>
        <div className="filter-bar">
          {['Todos', 'En ruta', 'Mantenimiento'].map(option => (
            <button key={option} type="button" className={`filter-btn ${truckStatusFilter === option ? 'active' : ''}`} onClick={() => setTruckStatusFilter(option)}>{option}</button>
          ))}
        </div>
        <form className="form-grid" onSubmit={createTruck}>
          <label htmlFor="truck-code">Código<input id="truck-code" required value={newTruck.code} onChange={event => {
              const value = event.currentTarget.value;
              setNewTruck(prev => ({ ...prev, code: value }));
            }} /></label>
          <label htmlFor="truck-driver">Conductor<input id="truck-driver" required value={newTruck.driver} onChange={event => {
              const value = event.currentTarget.value;
              setNewTruck(prev => ({ ...prev, driver: value }));
            }} /></label>
          <label htmlFor="truck-status">Estado<select id="truck-status" value={newTruck.status} onChange={event => {
              const value = event.currentTarget.value;
              setNewTruck(prev => ({ ...prev, status: value }));
            }}><option>En ruta</option><option>Mantenimiento</option><option>Disponible</option></select></label>
          <label htmlFor="truck-zone">Zona<select id="truck-zone" value={newTruck.zone_id} onChange={event => {
              const value = Number(event.currentTarget.value);
              setNewTruck(prev => ({ ...prev, zone_id: value }));
            }}>{safeData.zones.map((zone, index) => <option key={`zone-${zone.id}-${index}`} value={zone.id}>{zone.name}</option>)}</select></label>
          <button type="submit" disabled={creating}>{creating ? "Creando..." : "Crear camión"}</button>
        </form>
<ul className="list" aria-label="Lista de camiones">
           {filteredTrucks.length === 0 ? (
             <li className="empty-state">No hay camiones que coincidan con el filtro actual.</li>
           ) : filteredTrucks.map((truck, index) => (
             <li key={`truck-${truck.id}-${index}`}>
               {editingTruckId === truck.id ? (
                 <form className="form-grid" onSubmit={saveTruckEdit}>
                   <label htmlFor="edit-truck-code">Código<input id="edit-truck-code" required value={editingTruck.code} onChange={event => {
                     const value = event.currentTarget.value;
                     setEditingTruck(prev => ({ ...prev, code: value }));
                   }} /></label>
                   <label htmlFor="edit-truck-driver">Conductor<input id="edit-truck-driver" required value={editingTruck.driver} onChange={event => {
                     const value = event.currentTarget.value;
                     setEditingTruck(prev => ({ ...prev, driver: value }));
                   }} /></label>
                   <label htmlFor="edit-truck-status">Estado<select id="edit-truck-status" value={editingTruck.status} onChange={event => {
                     const value = event.currentTarget.value;
                     setEditingTruck(prev => ({ ...prev, status: value }));
                   }}><option>En ruta</option><option>Mantenimiento</option><option>Disponible</option></select></label>
                   <label htmlFor="edit-truck-zone">Zona<select id="edit-truck-zone" value={editingTruck.zone_id} onChange={event => {
                     const value = Number(event.currentTarget.value);
                     setEditingTruck(prev => ({ ...prev, zone_id: value }));
                   }}>{safeData.zones.map((zone, idx) => <option key={`zone-${zone.id}-${idx}`} value={zone.id}>{zone.name}</option>)}</select></label>
                   <button type="submit" disabled={savingTruckIds.includes(editingTruckId ?? -1)}>Guardar</button>
                   <button type="button" onClick={() => { setEditingTruckId(null); setEditingTruck({ code: '', driver: '', status: 'En ruta', zone_id: safeData.zones[0]?.id ?? 1, latitude: 0, longitude: 0 }); }}>Cancelar</button>
                 </form>
               ) : (
                 <Item title={`${truck.code} · ${truck.driver ?? 'Sin conductor'}`} detail={`${truck.zone} · ${truck.status}`} color={truck.status === 'Mantenimiento' ? 'yellow' : 'blue'} />
               )}
               {editingTruckId !== truck.id && (
                 <div className="admin-list-actions">
                   <button type="button" onClick={() => startEditTruck(truck)}>Editar camión</button>
                   <button type="button" onClick={() => deleteTruck(truck)} disabled={deletingTruckIds.includes(truck.id ?? -1)} className="danger">{deletingTruckIds.includes(truck.id ?? -1) ? "Eliminando..." : "Eliminar"}</button>
                 </div>
               )}
             </li>
           ))}
         </ul>
      </section>

      <section className="panel">
        <h2>Gestión de mantenimiento</h2>
        <p>Registra y consulta los estados de mantenimiento de la flota.</p>
        <div className="filter-bar">
          {['Todos', 'Pendiente', 'Completado'].map(option => (
            <button key={option} type="button" className={`filter-btn ${maintenanceStatusFilter === option ? 'active' : ''}`} onClick={() => setMaintenanceStatusFilter(option)}>{option}</button>
          ))}
        </div>
        <form className="form-grid" onSubmit={createMaintenance}>
          <label htmlFor="maintenance-truck">Camión<select id="maintenance-truck" value={newMaintenance.truck_id} onChange={event => {
              const value = Number(event.currentTarget.value);
              setNewMaintenance(prev => ({ ...prev, truck_id: value }));
            }}>
            {safeData.trucks.map((truck, index) => <option key={`truck-${truck.id}-${index}`} value={truck.id}>{truck.code}</option>)}
          </select></label>
          <label htmlFor="maintenance-description">Descripción<textarea id="maintenance-description" required value={newMaintenance.description} onChange={event => {
              const value = event.currentTarget.value;
              setNewMaintenance(prev => ({ ...prev, description: value }));
            }} /></label>
          <label htmlFor="maintenance-status">Estado<select id="maintenance-status" value={newMaintenance.status} onChange={event => {
              const value = event.currentTarget.value;
              setNewMaintenance(prev => ({ ...prev, status: value }));
            }}><option>Pendiente</option><option>Completado</option></select></label>
          <button type="submit" disabled={creating}>{creating ? "Creando..." : "Crear mantenimiento"}</button>
        </form>
<ul className="list" aria-label="Lista de mantenimiento">
           {filteredMaintenance.length === 0 ? (
             <li className="empty-state">No hay registros de mantenimiento para el filtro seleccionado.</li>
           ) : filteredMaintenance.map(item => (
             <li key={item.id}>
               {editingMaintenanceId === item.id ? (
                 <form className="form-grid" onSubmit={saveMaintenanceEdit}>
                   <label htmlFor="edit-maintenance-truck">Camión<select id="edit-maintenance-truck" value={editingMaintenance.truck_id} onChange={event => {
                     const value = Number(event.currentTarget.value);
                     setEditingMaintenance(prev => ({ ...prev, truck_id: value }));
                   }}>
                     {safeData.trucks.map((truck, idx) => <option key={`truck-${truck.id}-${idx}`} value={truck.id}>{truck.code}</option>)}
                   </select></label>
                   <label htmlFor="edit-maintenance-description">Descripción<textarea id="edit-maintenance-description" required value={editingMaintenance.description} onChange={event => {
                     const value = event.currentTarget.value;
                     setEditingMaintenance(prev => ({ ...prev, description: value }));
                   }} /></label>
                   <label htmlFor="edit-maintenance-status">Estado<select id="edit-maintenance-status" value={editingMaintenance.status} onChange={event => {
                     const value = event.currentTarget.value;
                     setEditingMaintenance(prev => ({ ...prev, status: value }));
                   }}><option>Pendiente</option><option>Completado</option></select></label>
                   <button type="submit" disabled={savingMaintenanceIds.includes(editingMaintenanceId ?? -1)}>Guardar</button>
                   <button type="button" onClick={() => { setEditingMaintenanceId(null); setEditingMaintenance({ truck_id: safeData.trucks[0]?.id ?? 0, description: '', status: 'Pendiente' }); }}>Cancelar</button>
                 </form>
               ) : (
                 <Item title={`Mantenimiento #${item.id}`} detail={`${truckNameById[item.truck_id] ?? `Camión #${item.truck_id}`} · ${item.description} · ${item.status}`} color={item.status === 'Pendiente' ? 'yellow' : 'blue'} />
               )}
               {editingMaintenanceId !== item.id && (
                 <div className="admin-list-actions">
                   <button type="button" onClick={() => startEditMaintenance(item)}>Editar</button>
                   <button type="button" onClick={() => deleteMaintenance(item)} disabled={deletingMaintenanceIds.includes(item.id ?? -1)} className="danger">{deletingMaintenanceIds.includes(item.id ?? -1) ? "Eliminando..." : "Eliminar"}</button>
                 </div>
               )}
             </li>
           ))}
         </ul>
</section>

       <section className="panel">
         <h2>Flota</h2>
         <div className="list">
           {(safeData.trucks ?? []).map(truck => (
             <Item key={truck.id} title={`${truck.code} - ${truck.driver}`} detail={`${truck.status} · Zona: ${truck.zone}`} color={truck.status === "Activo" ? "blue" : "yellow"} />
           ))}
         </div>
       </section>

       <section className="panel">
         <h2>Gestión de recolecciones</h2>
         <div className="list">
           {(safeData.collections ?? []).map(collection => (
             <Item key={collection.id} title={`${collection.date} - ${collection.zone}`} detail={`${collection.truck} · ${collection.kg} kg · ${collection.status}`} color={collection.status === "Confirmada" ? "blue" : "yellow"} />
           ))}
         </div>
       </section>

       <section className="panel">
         <h2>Registro de auditoría</h2>
         <div className="list">
           <Item title="Usuarios" detail={`${safeData.users?.length ?? 0} registrados`} color="blue" />
           <Item title="Zonas" detail={`${safeData.zones?.length ?? 0} activas`} color="blue" />
           <Item title="Camiones" detail={`${safeData.trucks?.length ?? 0} registrados`} color="blue" />
           <Item title="Reportes" detail={`${safeData.reports?.length ?? 0} totales`} color="blue" />
           <Item title="Recolecciones" detail={`${safeData.collections?.length ?? 0} registradas`} color="blue" />
           <Item title="Mantenimiento" detail={`${safeData.maintenance?.length ?? 0} registros`} color="blue" />
         </div>
       </section>

       <section className="panel">
         <h2>Eventos operativos</h2>
         <p>Envía actualizaciones de ruta y contenedor desde el panel administrativo.</p>
         <form className="form-grid" onSubmit={submitEventUpdate}>
          <label htmlFor="event-type">Tipo de evento<select id="event-type" value={eventType} onChange={event => setEventType(event.currentTarget.value as "route_update" | "container_update") }>
            <option value="route_update">Actualización de ruta</option>
            <option value="container_update">Actualización de contenedor</option>
          </select></label>
          <label htmlFor="event-target">Objetivo<select id="event-target" value={eventTargetId ?? ""} onChange={event => {
              const value = event.currentTarget.value;
              setEventTargetId(value ? Number(value) : null);
            }}>
            <option value="" disabled>{eventType === "route_update" ? "Selecciona una ruta" : "Selecciona un contenedor"}</option>
            {eventType === "route_update"
              ? safeData.routes.length > 0
                ? safeData.routes.map((route, index) => <option key={`route-${route.id}-${index}`} value={route.id}>{`Ruta ${route.truck} - ${route.zone}`}</option>)
                : null
              : safeData.containers.length > 0
                ? safeData.containers.map((container, index) => <option key={`container-${container.id}-${index}`} value={container.id}>{`${container.name} (${container.fill_level}%)`}</option>)
                : null}
          </select></label>
          {eventType === "route_update" ? (
            <>
              <label htmlFor="event-progress">Progreso<input id="event-progress" name="progress" value={eventProgress} onChange={event => setEventProgress(event.currentTarget.value)} placeholder="Ej. 92" /></label>
              <label htmlFor="event-delay">Retraso<input id="event-delay" name="delay" value={eventDelay} onChange={event => setEventDelay(event.currentTarget.value)} placeholder="Retraso leve" /></label>
            </>
          ) : (
            <>
              <label htmlFor="event-fill">Llenado<input id="event-fill" name="fill_level" value={eventFillLevel} onChange={event => setEventFillLevel(event.currentTarget.value)} placeholder="95" /></label>
              <label htmlFor="event-status">Estado<input id="event-status" name="status" value={eventStatus} onChange={event => setEventStatus(event.currentTarget.value)} placeholder="Lleno" /></label>
            </>
          )}
          <label htmlFor="event-note" className="wide">Nota<textarea id="event-note" value={eventNote} onChange={event => setEventNote(event.currentTarget.value)} placeholder="Detalle de la acción..." /></label>
          <button type="submit">Enviar evento</button>
        </form>
      </section>
    </div>
  );
}


