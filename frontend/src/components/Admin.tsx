import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Bootstrap, Session, Role, Zone, Schedule, Truck, OperationUpdatePayload } from "../types";
import { request } from "../api";
import Item from "./Item";

type MaintenanceRecord = {
  id: number;
  truck_id: number;
  description: string;
  status: string;
  created_at: string;
};

export default function Admin({ data, session, onResolveReport, onOperationUpdate }: { data: Bootstrap; session: Session; onResolveReport: (id: number) => Promise<void>; onOperationUpdate: (payload: OperationUpdatePayload) => Promise<void>; }) {
  const [users, setUsers] = useState<Session[]>(data.users ?? []);
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<number, Role>>({});
  const [savingUserIds, setSavingUserIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState("");
  const [formValues, setFormValues] = useState({ name: "", email: "", password: "", role: "ciudadano" as Role, zone: "Centro Historico" });

  const [zones, setZones] = useState<Zone[]>(data.zones ?? []);
  const [zoneSearch, setZoneSearch] = useState("");
  const [newZoneName, setNewZoneName] = useState("");
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingZoneName, setEditingZoneName] = useState("");

  const [schedules, setSchedules] = useState<Schedule[]>(data.schedules ?? []);
  const [newSchedule, setNewSchedule] = useState({ zone: data.zones?.[0]?.name ?? "Centro Historico", day: "Lunes", time: "08:00", waste: "Orgánicos" });
  const [eventType, setEventType] = useState<"route_update" | "container_update">("route_update");
  const [eventTargetId, setEventTargetId] = useState<number>(data.routes?.[0]?.id ?? data.containers?.[0]?.id ?? 0);
  const [eventProgress, setEventProgress] = useState("");
  const [eventDelay, setEventDelay] = useState("");
  const [eventFillLevel, setEventFillLevel] = useState("");
  const [eventStatus, setEventStatus] = useState("");
  const [eventNote, setEventNote] = useState("");

  const [trucks, setTrucks] = useState<Truck[]>(data.trucks ?? []);
  const [truckDriverSearch, setTruckDriverSearch] = useState("");
  const [truckStatusFilter, setTruckStatusFilter] = useState("Todos");
  const [newTruck, setNewTruck] = useState({ code: "", driver: "", status: "En ruta", zone: data.zones?.[0]?.name ?? "Centro Historico", latitude: 0, longitude: 0 });

  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>(data.maintenance ?? []);
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("Todos");
  const [newMaintenance, setNewMaintenance] = useState({ truck_id: data.trucks?.[0]?.id ?? 0, description: "", status: "Pendiente" });

  useEffect(() => {
    setUsers(data.users ?? []);
    setZones(data.zones ?? []);
    setSchedules(data.schedules ?? []);
    setTrucks(data.trucks ?? []);
    setMaintenance(data.maintenance ?? []);
    setNewTruck(prev => ({ ...prev, zone: data.zones?.[0]?.name ?? prev.zone }));
    setNewMaintenance(prev => ({ ...prev, truck_id: data.trucks?.[0]?.id ?? prev.truck_id }));
  }, [data.users, data.zones, data.schedules, data.trucks, data.maintenance]);

  const filteredZones = useMemo(
    () => zones.filter(zone => zone.name.toLowerCase().includes(zoneSearch.toLowerCase().trim())),
    [zones, zoneSearch]
  );

  const filteredTrucks = useMemo(
    () => trucks.filter(truck => {
      const driver = truck.driver ?? "";
      const matchesDriver = driver.toLowerCase().includes(truckDriverSearch.toLowerCase().trim());
      const matchesStatus = truckStatusFilter === "Todos" || truck.status === truckStatusFilter;
      return matchesDriver && matchesStatus;
    }),
    [trucks, truckDriverSearch, truckStatusFilter]
  );

  const filteredMaintenance = useMemo(
    () => maintenance.filter(item => maintenanceStatusFilter === "Todos" || item.status === maintenanceStatusFilter),
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el usuario';
      setFeedback(message);
    } finally {
      setSavingUserIds(prev => prev.filter(id => id !== user.id));
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setFormValues({ name: "", email: "", password: "", role: "ciudadano", zone: "Centro Historico" });
      (event.currentTarget as HTMLFormElement).reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el usuario';
      setFeedback(message);
    }
  }

  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newZoneName.trim()) return;
    try {
      const created = await request<Zone>('/zones', {
        method: 'POST',
        body: JSON.stringify({ name: newZoneName, latitude: 0, longitude: 0, criticality: 'Media' })
      });
      setZones(prev => [...prev, created]);
      setNewZoneName('');
      setFeedback(`Zona creada: ${created.name}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo crear la zona');
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
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo editar la zona');
    }
  }

  async function deleteZone(zoneId: number) {
    try {
      await request(`/zones/${zoneId}`, { method: 'DELETE' });
      setZones(prev => prev.filter(zone => zone.id !== zoneId));
      setFeedback('Zona eliminada');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo eliminar la zona');
    }
  }

  async function createSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await request<Schedule>('/schedules', {
        method: 'POST',
        body: JSON.stringify(newSchedule)
      });
      setSchedules(prev => [...prev, created]);
      setNewSchedule({ zone: data.zones?.[0]?.name ?? 'Centro Historico', day: 'Lunes', time: '08:00', waste: 'Orgánicos' });
      setFeedback(`Horario creado para ${created.zone}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo crear el horario');
    }
  }

  async function createTruck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await request<Truck>('/trucks', {
        method: 'POST',
        body: JSON.stringify(newTruck)
      });
      setTrucks(prev => [...prev, created]);
      setNewTruck({ code: '', driver: '', status: 'En ruta', zone: data.zones?.[0]?.name ?? 'Centro Historico', latitude: 0, longitude: 0 });
      setFeedback(`Camión creado: ${created.code}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo crear el camión');
    }
  }

  async function createMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMaintenance.description.trim()) return;
    try {
      const created = await request<MaintenanceRecord>('/maintenance', {
        method: 'POST',
        body: JSON.stringify(newMaintenance)
      });
      setMaintenance(prev => [...prev, created]);
      setNewMaintenance({ truck_id: data.trucks?.[0]?.id ?? 0, description: '', status: 'Pendiente' });
      setFeedback(`Mantenimiento creado para camión ${created.truck_id}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo crear el mantenimiento');
    }
  }

  async function submitEventUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    await onOperationUpdate(payload);
    setEventProgress("");
    setEventDelay("");
    setEventFillLevel("");
    setEventStatus("");
    setEventNote("");
  }

  return (
    <div className="two-col">
      <section className="panel">
        <h2>Gestión de usuarios</h2>
        <p>Administra roles, accesos y usuarios del sistema.</p>
        <form className="form-grid" onSubmit={createUser}>
          <label htmlFor="admin-user-name">Nombre<input id="admin-user-name" required value={formValues.name} onChange={event => setFormValues(prev => ({ ...prev, name: event.currentTarget.value }))} /></label>
          <label htmlFor="admin-user-email">Correo<input id="admin-user-email" required type="email" value={formValues.email} onChange={event => setFormValues(prev => ({ ...prev, email: event.currentTarget.value }))} /></label>
          <label htmlFor="admin-user-password">Contraseña<input id="admin-user-password" required type="password" minLength={8} value={formValues.password} onChange={event => setFormValues(prev => ({ ...prev, password: event.currentTarget.value }))} /></label>
          <label htmlFor="admin-user-role">Rol<select id="admin-user-role" value={formValues.role} onChange={event => setFormValues(prev => ({ ...prev, role: event.currentTarget.value as Role }))}>
            <option value="ciudadano">Ciudadano</option>
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
            <option value="conductor">Conductor</option>
          </select></label>
          <label htmlFor="admin-user-zone">Zona<input id="admin-user-zone" value={formValues.zone} onChange={event => {
              const value = event.target.value;
              setFormValues(prev => ({ ...prev, zone: value }));
            }} /></label>
          <button type="submit">Crear usuario</button>
        </form>
        {feedback && <p className="hint success" aria-live="polite">{feedback}</p>}
        <ul className="list" aria-label="Lista de usuarios">
          {users.map((user, index) => (
            <li key={`user-${user.id ?? user.email}-${index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
              <div>
                <strong>{user.name}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{user.email} · {user.zone}</div>
              </div>
              <select value={userRoleDrafts[user.id ?? 0] ?? user.role} onChange={event => {
                const value = event.target.value as Role;
                setUserRoleDrafts(prev => ({ ...prev, [user.id ?? 0]: value }));
              }} aria-label={`Rol de ${user.name}`}>
                <option value="ciudadano">Ciudadano</option>
                <option value="operador">Operador</option>
                <option value="admin">Administrador</option>
                <option value="conductor">Conductor</option>
              </select>
              <button type="button" onClick={() => updateUserRole(user)} disabled={!user.id || savingUserIds.includes(user.id)}>{savingUserIds.includes(user.id ?? -1) ? "Guardando..." : "Guardar rol"}</button>
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
              const value = event.target.value;
              setNewZoneName(value);
            }} /></label>
            <button type="submit">Crear zona</button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={saveZoneEdit}>
            <label htmlFor="edit-zone-name">Nombre de la zona<input id="edit-zone-name" required value={editingZoneName} onChange={event => {
              const value = event.target.value;
              setEditingZoneName(value);
            }} /></label>
            <button type="submit">Guardar cambios</button>
            <button type="button" onClick={() => { setEditingZoneId(null); setEditingZoneName(""); }}>Cancelar</button>
          </form>
        )}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Filtrar zonas" value={zoneSearch} onChange={event => {
              const value = event.target.value;
              setZoneSearch(value);
            }} aria-label="Filtrar zonas" />
        </div>
        <ul className="list" aria-label="Lista de zonas">
          {filteredZones.map(zone => (
            <li key={zone.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
              <div>
                <strong>{zone.name}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Criticidad {zone.criticality}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
        <form className="form-grid" onSubmit={createSchedule}>
          <label htmlFor="schedule-zone">Zona<select id="schedule-zone" value={newSchedule.zone} onChange={event => {
              const value = event.target.value;
              setNewSchedule(prev => ({ ...prev, zone: value }));
            }}>{data.zones?.map((zone, index) => <option key={`zone-${zone.id}-${index}`} value={zone.name}>{zone.name}</option>)}</select></label>
          <label htmlFor="schedule-day">Día<select id="schedule-day" value={newSchedule.day} onChange={event => {
              const value = event.target.value;
              setNewSchedule(prev => ({ ...prev, day: value }));
            }}><option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option></select></label>
          <label htmlFor="schedule-time">Hora<input id="schedule-time" type="time" value={newSchedule.time} onChange={event => {
              const value = event.target.value;
              setNewSchedule(prev => ({ ...prev, time: value }));
            }} /></label>
          <label htmlFor="schedule-waste">Tipo de residuo<input id="schedule-waste" value={newSchedule.waste} onChange={event => {
              const value = event.target.value;
              setNewSchedule(prev => ({ ...prev, waste: value }));
            }} /></label>
          <button type="submit">Crear horario</button>
        </form>
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
              const value = event.target.value;
              setNewTruck(prev => ({ ...prev, code: value }));
            }} /></label>
          <label htmlFor="truck-driver">Conductor<input id="truck-driver" required value={newTruck.driver} onChange={event => {
              const value = event.target.value;
              setNewTruck(prev => ({ ...prev, driver: value }));
            }} /></label>
          <label htmlFor="truck-status">Estado<select id="truck-status" value={newTruck.status} onChange={event => {
              const value = event.target.value;
              setNewTruck(prev => ({ ...prev, status: value }));
            }}><option>En ruta</option><option>Mantenimiento</option><option>Disponible</option></select></label>
          <label htmlFor="truck-zone">Zona<select id="truck-zone" value={newTruck.zone} onChange={event => {
              const value = event.target.value;
              setNewTruck(prev => ({ ...prev, zone: value }));
            }}>{data.zones?.map((zone, index) => <option key={`zone-${zone.id}-${index}`} value={zone.name}>{zone.name}</option>)}</select></label>
          <button type="submit">Crear camión</button>
        </form>
        <ul className="list" aria-label="Lista de camiones">
          {filteredTrucks.map((truck, index) => <li key={`truck-${truck.id}-${index}`}><Item title={`${truck.code} · ${truck.driver ?? 'Sin conductor'}`} detail={`${truck.zone} · ${truck.status}`} color={truck.status === 'Mantenimiento' ? 'yellow' : 'blue'} /></li>)}
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
              const value = Number(event.target.value);
              setNewMaintenance(prev => ({ ...prev, truck_id: value }));
            }}>
            {data.trucks?.map((truck, index) => <option key={`truck-${truck.id}-${index}`} value={truck.id}>{truck.code}</option>)}
          </select></label>
          <label htmlFor="maintenance-description">Descripción<textarea id="maintenance-description" required value={newMaintenance.description} onChange={event => {
              const value = event.target.value;
              setNewMaintenance(prev => ({ ...prev, description: value }));
            }} /></label>
          <label htmlFor="maintenance-status">Estado<select id="maintenance-status" value={newMaintenance.status} onChange={event => {
              const value = event.target.value;
              setNewMaintenance(prev => ({ ...prev, status: value }));
            }}><option>Pendiente</option><option>Completado</option></select></label>
          <button type="submit">Crear mantenimiento</button>
        </form>
        <ul className="list" aria-label="Lista de mantenimiento">
          {filteredMaintenance.map(item => <li key={item.id}><Item title={`Mantenimiento #${item.id}`} detail={`${item.description} · ${item.status}`} color={item.status === 'Pendiente' ? 'yellow' : 'blue'} /></li>)}
        </ul>
      </section>

      <section className="panel">
        <h2>Eventos operativos</h2>
        <p>Envía actualizaciones de ruta y contenedor desde el panel administrativo.</p>
        <form className="form-grid" onSubmit={submitEventUpdate}>
          <label htmlFor="event-type">Tipo de evento<select id="event-type" value={eventType} onChange={event => setEventType(event.currentTarget.value as "route_update" | "container_update") }>
            <option value="route_update">Actualización de ruta</option>
            <option value="container_update">Actualización de contenedor</option>
          </select></label>
          <label htmlFor="event-target">Objetivo<select id="event-target" value={eventTargetId} onChange={event => setEventTargetId(Number(event.currentTarget.value))}>
            {eventType === "route_update"
              ? data.routes?.map((route, index) => <option key={`route-${route.id}-${index}`} value={route.id}>{`Ruta ${route.truck} - ${route.zone}`}</option>)
              : data.containers?.map((container, index) => <option key={`container-${container.id}-${index}`} value={container.id}>{`${container.name} (${container.fill_level}%)`}</option>)}
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
