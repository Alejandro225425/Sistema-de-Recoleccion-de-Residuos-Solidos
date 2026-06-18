import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

type Role = "ciudadano" | "operador" | "admin" | "conductor";
type View = "dashboard" | "schedules" | "reports" | "waste" | "routes" | "admin" | "analytics";

type Zone = { id: number; name: string; latitude: number; longitude: number; criticality: string };
type Schedule = { id: number; zone: string; day: string; time: string; waste: string };
type Truck = { id: number; code: string; driver: string; status: string; zone: string; latitude: number; longitude: number };
type Route = { id: number; truck: string; zone: string; progress: number; eta: string; delay: string; latitude: number; longitude: number };
type Report = { id: number; citizen: string; zone: string; type: string; detail: string; status: string };
type Collection = { id: number; zone: string; truck: string; kg: number; status: string; date: string };
type Summary = { zones: number; active_trucks: number; open_reports: number; confirmed_collections: number; total_kg: number; compliance: number };
type Session = { name: string; email: string; role: Role; zone: string };
type Bootstrap = { zones: Zone[]; schedules: Schedule[]; trucks: Truck[]; routes: Route[]; reports: Report[]; collections: Collection[]; analytics: Summary };
type ReportStatus = "Pendiente" | "En revision" | "Resuelto";

const apiBase = import.meta.env.VITE_API_URL ?? "/api";
const geoBase = import.meta.env.VITE_GEO_URL ?? "/geo";

// Iconos simples usando Unicode y emojis
const icons = {
  dashboard: "🏠",
  schedules: "⏰",
  reports: "📋",
  waste: "♻️",
  routes: "🗺️",
  admin: "⚙️",
  analytics: "📊"
};

const viewLabels: Record<View, string> = {
  dashboard: "Panel Principal",
  schedules: "Horarios",
  reports: "Reportes",
  waste: "Clasificación",
  routes: "Rutas",
  admin: "Administración",
  analytics: "Estadísticas"
};
const views = Object.keys(viewLabels) as View[];

const emptyBootstrap: Bootstrap = {
  zones: [],
  schedules: [],
  trucks: [],
  routes: [],
  reports: [],
  collections: [],
  analytics: { zones: 0, active_trucks: 0, open_reports: 0, confirmed_collections: 0, total_kg: 0, compliance: 0 }
};

function statusTone(status: string) {
  if (status === "Resuelto") return "blue";
  if (status === "En revision") return "yellow";
  return "red";
}

function reportStatusLabel(status: string) {
  return status === "Pendiente" ? "Pendiente" : status;
}

function getOperationalSignal(data: Bootstrap) {
  const delayedRoutes = data.routes.filter(route => route.delay.toLowerCase().includes("retraso")).length;
  if (data.analytics.open_reports > 2 || delayedRoutes > 0) {
    return { label: `${data.analytics.open_reports} incidencias abiertas`, tone: "warning" };
  }
  if (data.analytics.active_trucks === 0) {
    return { label: "Sin camiones activos", tone: "danger" };
  }
  return { label: "Operación estable", tone: "ok" };
}

// Función para exportar a CSV
function exportToCSV(filename: string, data: any[]) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => JSON.stringify(row[h])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
      ...options
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Recurso no encontrado: ${path}`);
      }
      throw new Error(`Error API ${response.status}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`No se pudo conectar con el backend en ${apiBase}. Verifica que esté ejecutándose.`);
    }
    throw error;
  }
}

function App() {
  const [data, setData] = useState<Bootstrap>(emptyBootstrap);
  const [session, setSession] = useState<Session | null>(() => JSON.parse(localStorage.getItem("sir-session") || "null"));
  const [view, setView] = useState<View>("dashboard");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("eco-dark-mode");
    return saved ? JSON.parse(saved) : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    localStorage.setItem("eco-dark-mode", JSON.stringify(isDarkMode));
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  async function loadData() {
    setLoading(true);
    try {
      const bootstrap = await request<Bootstrap>("/bootstrap");
      setData(bootstrap);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData().catch(() => setMessage("No se pudo conectar con FastAPI. Verifica que el backend este ejecutandose."));
  }, []);

  async function login(nextSession: Session) {
    await request("/auth/login", { method: "POST", body: JSON.stringify(nextSession) });
    localStorage.setItem("sir-session", JSON.stringify(nextSession));
    setSession(nextSession);
    setMessage("");
  }

  function logout() {
    localStorage.removeItem("sir-session");
    setSession(null);
    setView("dashboard");
  }

  async function createReport(report: Omit<Report, "id" | "status">) {
    await request<Report>("/reports", { method: "POST", body: JSON.stringify(report) });
    setMessage("Reporte registrado. El equipo municipal ya puede revisarlo.");
    await loadData();
  }

  async function resolveReport(id: number) {
    await request<Report>(`/reports/${id}/resolve`, { method: "PATCH" });
    setMessage("Incidencia marcada como resuelta.");
    await loadData();
  }

  if (!session) {
    return <AuthView zones={data.zones} onLogin={login} message={message} />;
  }

  const operationalSignal = getOperationalSignal(data);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">🌿</span>
          <div>
            <strong>EcoCusco</strong>
            <small>Gestión Ambiental Urbana</small>
          </div>
        </div>
        <nav className="nav">
          {views.map(item => (
            <button 
              className={view === item ? "active" : ""} 
              key={item} 
              onClick={() => setView(item)}
              title={viewLabels[item]}
            >
              <span className="nav-icon">{icons[item]}</span>
              <span className="nav-label">{viewLabels[item]}</span>
            </button>
          ))}
        </nav>
        <div className="session-card">
          <small>Sesión Activa</small>
          <strong>{session.name}</strong>
          <span className="role-badge">{session.role}</span>
          <span className="zone-badge">{session.zone}</span>
          <button className="ghost" onClick={() => setIsDarkMode(!isDarkMode)} title="Alternar tema oscuro" aria-label="Alternar tema oscuro">
            {isDarkMode ? "Modo claro" : "Modo oscuro"}
          </button>
          <button className="ghost" onClick={logout} aria-label="Cerrar sesión">
            <span className="logout-full">Cerrar Sesión</span>
            <span className="logout-short">Salir</span>
          </button>
        </div>
      </aside>
      <main className="shell">
        <header className="topbar">
          <div className="topbar-content">
            <h1>{viewLabels[view]}</h1>
            <p className="eyebrow">{session.name} · {session.zone}</p>
          </div>
          <div className="topbar-actions">
            <div className={`status-pill status-${operationalSignal.tone}`}>{operationalSignal.label}</div>
            <button className="icon-action" onClick={() => setIsDarkMode(!isDarkMode)} title="Alternar tema" aria-label="Alternar tema">
              {isDarkMode ? "☀️" : "🌙"}
            </button>
            <button className="logout-action" onClick={logout} aria-label="Cerrar sesión">
              Cerrar sesión
            </button>
          </div>
        </header>
        {message && <div className="notice" role="alert">{message}</div>}
        {loading ? (
          <section className="panel" style={{ textAlign: "center", padding: "60px 32px" }}>
            <div style={{ display: "inline-block", marginBottom: "20px" }}>
              <span className="spinner"></span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "1rem" }}>Cargando datos de la plataforma...</p>
          </section>
        ) : (
          <Content data={data} session={session} view={view} onCreateReport={createReport} onResolveReport={resolveReport} />
        )}
      </main>
    </div>
  );
}

function AuthView({ zones, onLogin, message }: { zones: Zone[]; onLogin: (session: Session) => Promise<void>; message: string }) {
  const fallbackZones = zones.length ? zones.map(zone => zone.name) : ["Centro Histórico", "Wanchaq", "San Sebastián", "San Jerónimo", "Santiago"];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onLogin({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      role: String(form.get("role")) as Role,
      zone: String(form.get("zone"))
    });
  }

  return (
    <main className="auth-view">
      <section className="auth-image-section">
        <div className="auth-overlay">
          <div className="auth-branding">
            <h1 className="eco-logo">🌿 EcoCusco</h1>
            <p className="auth-tagline">Gestión Inteligente de Residuos Sólidos</p>
            <div className="eco-features">
              <div className="eco-feature">
                <span>♻️</span>
                <p>Recolección Segregada</p>
              </div>
              <div className="eco-feature">
                <span>🌍</span>
                <p>Impacto Ambiental Positivo</p>
              </div>
              <div className="eco-feature">
                <span>🤝</span>
                <p>Participación Comunitaria</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-section">
        <form className="auth-panel" onSubmit={submit}>
          <div className="form-header">
            <h2>Bienvenido a EcoCusco</h2>
            <p>Plataforma de Gestión Ambiental Urbana</p>
          </div>

          <div className="form-group">
            <label htmlFor="name">Nombre Completo</label>
            <input 
              id="name"
              name="name" 
              required 
              placeholder="Ej. Ana Quispe Huamán" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input 
              id="email"
              name="email" 
              type="email" 
              required 
              placeholder="tu.email@ejemplo.com" 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="role">Rol de Usuario</label>
              <select id="role" name="role">
                <option value="ciudadano">👤 Ciudadano</option>
                <option value="operador">👷 Operador Municipal</option>
                <option value="admin">👨‍💼 Administrador</option>
                <option value="conductor">🚗 Conductor</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="zone">Zona</label>
              <select id="zone" name="zone">
                {fallbackZones.map(zone => (
                  <option key={zone}>{zone}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Iniciar Sesión</button>
          </div>

          <div className="form-links">
            <a href="#forgot">¿Olvidaste tu contraseña?</a>
            <span className="divider">•</span>
            <a href="#terms">Términos y Condiciones</a>
          </div>

          {message && <p className="hint error">{message}</p>}
        </form>
      </section>
    </main>
  );
}

function Content(props: { data: Bootstrap; session: Session; view: View; onCreateReport: (report: Omit<Report, "id" | "status">) => Promise<void>; onResolveReport: (id: number) => Promise<void> }) {
  const { data, view } = props;
  if (view === "dashboard") return <Dashboard data={data} />;
  if (view === "schedules") return <Schedules schedules={data.schedules} />;
  if (view === "reports") return <Reports {...props} />;
  if (view === "waste") return <Waste />;
  if (view === "routes") return <Routes data={data} />;
  if (view === "admin") return <Admin reports={data.reports} trucks={data.trucks} onResolveReport={props.onResolveReport} />;
  return <Analytics data={data} />;
}

function Dashboard({ data }: { data: Bootstrap }) {
  const metrics = [
    [data.analytics.zones, "Zonas Activas", "🗺️"],
    [data.analytics.active_trucks, "Camiones en Ruta", "🚛"],
    [data.analytics.open_reports, "Alertas Pendientes", "🚨"],
    [`${data.analytics.confirmed_collections}/${data.collections.length}`, "Recolecciones", "✅"]
  ];

  const alerts = [
    {
      id: 1,
      icon: "🚛",
      title: "Camión Próximo",
      description: "C-02 llegará a Wanchaq en 12 minutos",
      time: "Ahora",
      status: "activo"
    },
    {
      id: 2,
      icon: "🔴",
      title: "Contenedor Lleno",
      description: "Reporte ciudadano en Wanchaq requiere atención",
      time: "Hace 5 min",
      status: "pendiente"
    },
    {
      id: 3,
      icon: "📅",
      title: "Cambio de Horario",
      description: "Santiago pasa a turno 06:00 - 08:00",
      time: "Hace 2 horas",
      status: "resuelto"
    }
  ];

  return (
    <>
      <div className="metrics-grid">
        {metrics.map(([value, label, icon]) => (
          <div className="metric-card" key={label}>
            <span className="metric-icon">{icon}</span>
            <div className="metric-content">
              <strong className="metric-value">{value}</strong>
              <span className="metric-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <section className="panel panel-large">
          <h2>🗺️ Mapa Operativo</h2>
          <Map zones={data.zones} trucks={data.trucks} routes={data.routes} />
        </section>

        <section className="panel panel-alerts">
          <div className="alerts-header">
            <h2>⚠️ Alertas Activas</h2>
            <span className="alert-count">{alerts.filter(a => a.status === "pendiente").length}</span>
          </div>
          <div className="alerts-list">
            {alerts.map(alert => (
              <div className={`alert-item alert-${alert.status}`} key={alert.id}>
                <div className="alert-icon">{alert.icon}</div>
                <div className="alert-content">
                  <h4>{alert.title}</h4>
                  <p>{alert.description}</p>
                  <span className="alert-time">{alert.time}</span>
                </div>
                <span className={`alert-status alert-status-${alert.status}`}>
                  {alert.status === "activo" ? "🔴" : alert.status === "pendiente" ? "🟡" : "🟢"}
                </span>
              </div>
            ))}
          </div>
          <div className="load-more">
            <button className="ghost">Cargar más notificaciones →</button>
          </div>
        </section>
      </div>
    </>
  );
}

function Schedules({ schedules }: { schedules: Schedule[] }) {
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("Todos");
  
  const filtered = useMemo(() => {
    return schedules.filter(s => {
      const matchSearch = s.zone.toLowerCase().includes(search.toLowerCase());
      const matchDay = selectedDay === "Todos" || s.day === selectedDay;
      return matchSearch && matchDay;
    });
  }, [schedules, search, selectedDay]);
  
  const days = ["Todos", ...new Set(schedules.map(s => s.day))];
  
  return (
    <section className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>Consulta por zona</h2>
        <button className="export-btn" onClick={() => exportToCSV("horarios", filtered)}>
          📥 Exportar CSV
        </button>
      </div>
      
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Buscar zona..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar horarios por zona"
        />
      </div>
      
      <div className="filter-bar">
        {days.map(day => (
          <button 
            key={day} 
            className={`filter-btn ${selectedDay === day ? "active" : ""}`}
            onClick={() => setSelectedDay(day)}
            aria-pressed={selectedDay === day}
          >
            {day}
          </button>
        ))}
      </div>
      
      <div className="list">
        {filtered.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
            No hay horarios que coincidan con tu búsqueda
          </p>
        ) : (
          filtered.map(item => <Item key={item.id} title={item.zone} detail={`${item.day} | ${item.time} | ${item.waste}`} color="blue" />)
        )}
      </div>
    </section>
  );
}

function Reports({ data, session, onCreateReport }: { data: Bootstrap; session: Session; onCreateReport: (report: Omit<Report, "id" | "status">) => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await onCreateReport({
        citizen: session.name,
        zone: String(form.get("zone")),
        type: String(form.get("type")),
        detail: String(form.get("detail")).trim()
      });
      event.currentTarget.reset();
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="two-col">
      <section className="panel">
        <h2>Registrar incidencia</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>Zona<select name="zone">{data.zones.map(zone => <option key={zone.id}>{zone.name}</option>)}</select></label>
          <label>Tipo<select name="type"><option>Acumulacion de basura</option><option>Retraso</option><option>Contenedor lleno</option><option>Otro</option></select></label>
          <label className="wide">Detalle<textarea name="detail" required minLength={8} maxLength={600} placeholder="Describe el problema encontrado" /></label>
          <button disabled={submitting}>{submitting ? "Enviando..." : "Enviar reporte"}</button>
        </form>
      </section>
      <section className="panel"><h2>Seguimiento</h2><ReportList reports={data.reports} /></section>
    </div>
  );
}

function Waste() {
  return (
    <div className="grid waste-grid">
      <article className="card organic"><h2>Organicos</h2><p>Restos de comida, cascaras, hojas y residuos biodegradables.</p><span className="tag">Compostaje</span></article>
      <article className="card recycle"><h2>Reciclables</h2><p>Papel, carton, plastico limpio, vidrio y metales separados.</p><span className="tag blue">Reciclaje</span></article>
      <article className="card reject"><h2>No reciclables</h2><p>Papel higienico, tecnopor contaminado, colillas y residuos sanitarios.</p><span className="tag red">Disposicion final</span></article>
    </div>
  );
}

function Routes({ data }: { data: Bootstrap }) {
  const [alerts, setAlerts] = useState<string[]>([]);
  useEffect(() => {
    fetch(`${geoBase}/alerts`).then(response => response.json()).then(payload => setAlerts(payload.alerts ?? [])).catch(() => setAlerts([]));
  }, []);
  return (
    <div className="two-col">
      <section className="panel"><h2>Mapa operativo OpenStreetMap</h2><Map zones={data.zones} trucks={data.trucks} routes={data.routes} /></section>
      <section className="panel">
        <h2>Seguimiento GPS</h2>
        <div className="list">
          {data.routes.map(route => <Item key={route.id} title={`${route.truck} - ${route.zone}`} detail={`Avance ${route.progress}% | ETA ${route.eta} | ${route.delay}`} color={route.delay.includes("Retraso") ? "yellow" : "blue"} />)}
          {alerts.map(alert => <Item key={alert} title="Microservicio TS" detail={alert} color="blue" />)}
        </div>
      </section>
    </div>
  );
}

function Admin({ reports, trucks, onResolveReport }: { reports: Report[]; trucks: Truck[]; onResolveReport: (id: number) => Promise<void> }) {
  const pending = reports.find(report => report.status !== "Resuelto");
  const [resolving, setResolving] = useState(false);
  async function resolveFirstPending() {
    if (!pending) return;
    setResolving(true);
    try {
      await onResolveReport(pending.id);
    } finally {
      setResolving(false);
    }
  }
  return (
    <div className="two-col">
      <section className="panel"><h2>Camiones registrados</h2><div className="list">{trucks.map(truck => <Item key={truck.id} title={`${truck.code} - ${truck.driver}`} detail={`${truck.zone} | ${truck.status}`} color={truck.status === "Mantenimiento" ? "yellow" : "blue"} />)}</div></section>
      <section className="panel">
        <h2>Gestion de incidencias</h2>
        <ReportList reports={reports} />
        <div className="actions"><button disabled={!pending || resolving} onClick={resolveFirstPending}>{resolving ? "Actualizando..." : "Marcar primera incidencia como resuelta"}</button></div>
      </section>
    </div>
  );
}

function Analytics({ data }: { data: Bootstrap }) {
  return (
    <>
      <div className="grid metrics">
        <Metric value={`${data.analytics.total_kg} kg`} label="Residuos registrados" />
        <Metric value={`${data.analytics.compliance}%`} label="Cumplimiento de rutas" />
        <Metric value={data.reports.length} label="Participacion ciudadana" />
        <Metric value="3" label="Riesgos mitigados" />
      </div>
      <section className="panel"><h2>Historial de recoleccion</h2><div className="list">{data.collections.map(item => <Item key={item.id} title={`${item.date} - ${item.zone}`} detail={`${item.truck} | ${item.kg} kg | ${item.status}`} color={item.status === "Confirmada" ? "blue" : "yellow"} />)}</div></section>
    </>
  );
}

function Map({ zones, trucks, routes }: { zones: Zone[]; trucks: Truck[]; routes: Route[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const signature = useMemo(() => JSON.stringify({ zones, trucks, routes }), [zones, trucks, routes]);

  useEffect(() => {
    if (!ref.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(ref.current).setView([-13.532, -71.967], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(mapRef.current);
    }
    const layer = L.layerGroup().addTo(mapRef.current);
    zones.forEach(zone => L.marker([zone.latitude, zone.longitude]).bindPopup(`${zone.name} - ${zone.criticality}`).addTo(layer));
    trucks.forEach(truck => L.circleMarker([truck.latitude, truck.longitude], { radius: 8, color: "#f5b942", fillOpacity: 0.9 }).bindPopup(`${truck.code} - ${truck.status}`).addTo(layer));
    routes.forEach(route => L.circle([route.latitude, route.longitude], { radius: 450, color: route.delay.includes("Retraso") ? "#c94735" : "#0f8b8d" }).bindPopup(`${route.truck}: ${route.eta}`).addTo(layer));
    return () => { layer.remove(); };
  }, [signature]);

  return <div className="map" ref={ref} />;
}

function ReportList({ reports }: { reports: Report[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  
  const filtered = useMemo(() => {
    return reports.filter(r => {
      const matchSearch = r.type.toLowerCase().includes(search.toLowerCase()) || 
                          r.zone.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "Todos" || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [reports, search, filterStatus]);
  
  const statuses: Array<"Todos" | ReportStatus> = ["Todos", "Pendiente", "En revision", "Resuelto"];
  
  return (
    <div>
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Buscar reporte..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar reportes"
        />
      </div>
      
      <div className="filter-bar">
        {statuses.map(status => (
          <button 
            key={status} 
            className={`filter-btn ${filterStatus === status ? "active" : ""}`}
            onClick={() => setFilterStatus(status)}
            aria-pressed={filterStatus === status}
          >
            {status === "Pendiente" ? "🔴" : status === "En revision" ? "🟡" : status === "Resuelto" ? "🟢" : "📋"} {status}
          </button>
        ))}
      </div>
      
      <div className="list">
        {filtered.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
            No hay reportes que coincidan con tu búsqueda
          </p>
        ) : (
          filtered.map(report => (
            <article className="item" key={report.id}>
              <div className="item-row">
                <strong>{report.type}</strong>
                <span className={`tag ${statusTone(report.status)}`}>
                  {reportStatusLabel(report.status)}
                </span>
              </div>
              <span>{report.zone} | {report.citizen}</span>
              <p>{report.detail}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: React.ReactNode; label: React.ReactNode }) {
  return <article className="metric"><strong>{value}</strong><span>{label}</span></article>;
}

function Item({ title, detail, color = "" }: { title: string; detail: string; color?: string }) {
  return <article className="item"><div className="item-row"><strong>{title}</strong><span className={`tag ${color}`}>Activo</span></div><span>{detail}</span></article>;
}

createRoot(document.getElementById("root")!).render(<App />);
