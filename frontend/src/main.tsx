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

const apiBase = import.meta.env.VITE_API_URL ?? "/api";
const geoBase = import.meta.env.VITE_GEO_URL ?? "/geo";
const viewLabels: Record<View, string> = {
  dashboard: "Inicio",
  schedules: "Horarios",
  reports: "Reportes ciudadanos",
  waste: "Clasificacion",
  routes: "Mapa y rutas",
  admin: "Administracion",
  analytics: "Estadisticas"
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
    await loadData();
  }

  async function resolveReport(id: number) {
    await request<Report>(`/reports/${id}/resolve`, { method: "PATCH" });
    await loadData();
  }

  if (!session) {
    return <AuthView zones={data.zones} onLogin={login} message={message} />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SIR</span>
          <div>
            <strong>Recoleccion Cusco</strong>
            <small>Residuos segregados</small>
          </div>
        </div>
        <nav className="nav">
          {views.map(item => (
            <button className={view === item ? "active" : ""} key={item} onClick={() => setView(item)}>
              {viewLabels[item]}
            </button>
          ))}
        </nav>
        <div className="session-card">
          <small>Sesion activa</small>
          <strong>{session.name}</strong>
          <span>{session.role} - {session.zone}</span>
          <button className="ghost" onClick={logout}>Salir</button>
        </div>
      </aside>
      <main className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Panel operativo</p>
            <h1>{viewLabels[view]}</h1>
          </div>
          <div className="status-pill">Camion a 12 min de Wanchaq</div>
        </header>
        {message && <div className="notice">{message}</div>}
        {loading ? <section className="panel">Cargando datos...</section> : (
          <Content data={data} session={session} view={view} onCreateReport={createReport} onResolveReport={resolveReport} />
        )}
      </main>
    </div>
  );
}

function AuthView({ zones, onLogin, message }: { zones: Zone[]; onLogin: (session: Session) => Promise<void>; message: string }) {
  const fallbackZones = zones.length ? zones.map(zone => zone.name) : ["Centro Historico", "Wanchaq", "San Sebastian", "San Jeronimo", "Santiago"];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onLogin({
      name: String(form.get("name")),
      email: String(form.get("email")),
      role: String(form.get("role")) as Role,
      zone: String(form.get("zone"))
    });
  }

  return (
    <main className="auth-view">
      <section className="auth-copy">
        <p className="eyebrow">Gestion ambiental urbana</p>
        <h1>Sistema inteligente de recoleccion de residuos solidos segregados</h1>
        <p>Consulta horarios, reporta incidencias, gestiona rutas y monitorea el cumplimiento del servicio municipal en Cusco.</p>
      </section>
      <form className="auth-panel" onSubmit={submit}>
        <h2>Ingresar al sistema</h2>
        <label>Nombre completo<input name="name" required placeholder="Ej. Ana Quispe" /></label>
        <label>Correo<input name="email" type="email" required placeholder="correo@ejemplo.com" /></label>
        <label>Rol
          <select name="role">
            <option value="ciudadano">Ciudadano</option>
            <option value="operador">Operador municipal</option>
            <option value="admin">Administrador</option>
            <option value="conductor">Conductor</option>
          </select>
        </label>
        <label>Zona
          <select name="zone">{fallbackZones.map(zone => <option key={zone}>{zone}</option>)}</select>
        </label>
        <button>Entrar / Registrar</button>
        {message && <p className="hint">{message}</p>}
      </form>
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
    [data.analytics.zones, "Zonas con horario"],
    [data.analytics.active_trucks, "Camiones en ruta"],
    [data.analytics.open_reports, "Incidencias abiertas"],
    [`${data.analytics.confirmed_collections}/${data.collections.length}`, "Recolecciones confirmadas"]
  ];
  return (
    <>
      <div className="grid metrics">{metrics.map(([value, label]) => <Metric key={label} value={value} label={label} />)}</div>
      <div className="two-col">
        <section className="panel"><h2>Ruta activa</h2><Map zones={data.zones} trucks={data.trucks} routes={data.routes} /></section>
        <section className="panel">
          <h2>Alertas recientes</h2>
          <div className="list">
            <Item title="Camion proximo" detail="C-02 llegara a Wanchaq en 12 minutos." color="blue" />
            <Item title="Contenedor lleno" detail="Reporte ciudadano en Wanchaq requiere atencion." color="yellow" />
            <Item title="Cambio de horario" detail="Santiago pasa a turno 06:00 - 08:00." />
          </div>
        </section>
      </div>
    </>
  );
}

function Schedules({ schedules }: { schedules: Schedule[] }) {
  return <section className="panel"><h2>Consulta por zona</h2><div className="list">{schedules.map(item => <Item key={item.id} title={item.zone} detail={`${item.day} | ${item.time} | ${item.waste}`} color="blue" />)}</div></section>;
}

function Reports({ data, session, onCreateReport }: { data: Bootstrap; session: Session; onCreateReport: (report: Omit<Report, "id" | "status">) => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onCreateReport({
      citizen: session.name,
      zone: String(form.get("zone")),
      type: String(form.get("type")),
      detail: String(form.get("detail"))
    });
    event.currentTarget.reset();
  }
  return (
    <div className="two-col">
      <section className="panel">
        <h2>Registrar incidencia</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>Zona<select name="zone">{data.zones.map(zone => <option key={zone.id}>{zone.name}</option>)}</select></label>
          <label>Tipo<select name="type"><option>Acumulacion de basura</option><option>Retraso</option><option>Contenedor lleno</option><option>Otro</option></select></label>
          <label className="wide">Detalle<textarea name="detail" required placeholder="Describe el problema encontrado" /></label>
          <button>Enviar reporte</button>
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
  return (
    <div className="two-col">
      <section className="panel"><h2>Camiones registrados</h2><div className="list">{trucks.map(truck => <Item key={truck.id} title={`${truck.code} - ${truck.driver}`} detail={`${truck.zone} | ${truck.status}`} color={truck.status === "Mantenimiento" ? "yellow" : "blue"} />)}</div></section>
      <section className="panel">
        <h2>Gestion de incidencias</h2>
        <ReportList reports={reports} />
        <div className="actions"><button disabled={!pending} onClick={() => pending && onResolveReport(pending.id)}>Marcar primera incidencia como resuelta</button></div>
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
  return <div className="list">{reports.map(report => <article className="item" key={report.id}><div className="item-row"><strong>{report.type}</strong><span className={`tag ${report.status === "Resuelto" ? "blue" : report.status === "En revision" ? "yellow" : "red"}`}>{report.status}</span></div><span>{report.zone} | {report.citizen}</span><p>{report.detail}</p></article>)}</div>;
}

function Metric({ value, label }: { value: React.ReactNode; label: React.ReactNode }) {
  return <article className="metric"><strong>{value}</strong><span>{label}</span></article>;
}

function Item({ title, detail, color = "" }: { title: string; detail: string; color?: string }) {
  return <article className="item"><div className="item-row"><strong>{title}</strong><span className={`tag ${color}`}>Activo</span></div><span>{detail}</span></article>;
}

createRoot(document.getElementById("root")!).render(<App />);
