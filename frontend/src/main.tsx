import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import Admin from "./components/Admin";
import Item, { Metric } from "./components/Item";
import { request } from "./api";
import {
  Bootstrap,
  Collection,
  Monitor,
  OperationUpdatePayload,
  Report,
  ReportStatus,
  Route,
  Schedule,
  Session,
  Summary,
  Truck,
  View,
  Zone,
  Role,
} from "./types";

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

function exportToPDF(title: string, html: string) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:system-ui, sans-serif;padding:20px;color:#1f2937;}h1,h2{margin:0 0 16px;}h1{font-size:24px;}h2{font-size:18px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #d1d5db;padding:10px;text-align:left;}tr:nth-child(even){background:#f9fafb;} .report-card{border:1px solid #d1d5db;border-radius:10px;padding:16px;margin-bottom:16px;} .tag{display:inline-block;background:#e5e7eb;color:#111827;padding:4px 10px;border-radius:999px;font-size:12px;margin-top:8px;}</style></head><body><h1>${title}</h1>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function App() {
  const [data, setData] = useState<Bootstrap>(emptyBootstrap);
  const [monitor, setMonitor] = useState<Monitor>({});
  const effectiveData = useMemo(() => ({ ...data, ...monitor }) as Bootstrap, [data, monitor]);
  const [session, setSession] = useState<Session | null>(() => JSON.parse(localStorage.getItem("sir-session") || "null"));
  const [view, setView] = useState<View>("dashboard");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const accessibleViews = session?.role === "admin" ? views : views.filter(item => item !== "admin");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("eco-dark-mode");
    return saved ? JSON.parse(saved) : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  async function loadMonitor() {
    try {
      const monitorPayload = await request<Monitor>("/operations/monitor");
      setMonitor(monitorPayload);
    } catch (error) {
      console.error("Error loading monitor data:", error);
    }
  }

  useEffect(() => {
    if (session && session.role !== "admin" && view === "admin") {
      setView("dashboard");
    }
  }, [session, view]);

  useEffect(() => {
    loadData().catch(() => setMessage("No se pudo conectar con FastAPI. Verifica que el backend este ejecutandose."));
    loadMonitor().catch(() => {});
    const monitorInterval = window.setInterval(() => {
      loadMonitor().catch(() => {});
    }, 10000);
    return () => window.clearInterval(monitorInterval);
  }, []);

  async function login(nextSession: Session) {
    try {
      const payload = await request<{ token?: string; user?: Session; detail?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: nextSession.email, password: String((window as Window & { __password?: string }).__password ?? '') })
      });
      if (!payload.token || !payload.user) {
        throw new Error('No se recibió token válido del backend');
      }
      const session = { ...payload.user, email: nextSession.email };
      localStorage.setItem('sir-session', JSON.stringify(session));
      localStorage.setItem('sir-token', payload.token);
      setSession(session);
      setMessage('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
      setMessage(message);
      throw error;
    }
  }

  function logout() {
    localStorage.removeItem('sir-session');
    localStorage.removeItem('sir-token');
    setSession(null);
    setView('dashboard');
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

  async function updateOperation(payload: OperationUpdatePayload) {
    const monitorPayload = await request<Monitor>("/operations/update", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setMonitor(monitorPayload);
    setMessage("Evento operativo registrado y monitoreo actualizado.");
  }

  async function createCollection(payload: { truck_id: number; zone_id: number; kg: number }) {
    await request<any>("/collections", { method: "POST", body: JSON.stringify(payload) });
    setMessage("Recolección registrada correctamente.");
    await loadData();
  }

  async function confirmCollection(collectionId: number) {
    await request<any>(`/collections/${collectionId}/confirm`, { method: "POST" });
    setMessage("Recolección confirmada por ciudadano.");
    await loadData();
  }

  if (!session) {
    return <AuthView zones={data.zones} onLogin={login} message={message} />;
  }

  const operationalSignal = getOperationalSignal({ ...data, ...monitor });

  return (
    <main className="app-shell">
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
      <button className="hamburger" type="button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">☰</button>
      <div className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">E</div>
          <div className="brand-text">
            <h1>EcoCusco</h1>
            <small>Gestión Ambiental</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {accessibleViews.map(item => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              type="button"
              onClick={() => { setView(item); setSidebarOpen(false); }}
            >
              {icons[item]} {viewLabels[item]}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" onClick={logout}>Cerrar sesión</button>
          <button type="button" className="theme-toggle" onClick={() => setIsDarkMode((value: boolean) => !value)}>
            {isDarkMode ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}
          </button>
        </div>
      </aside>

      <section id="main-content" className="main-content">
        <header className="page-header">
          <h2>{viewLabels[view]}</h2>
          <p>{operationalSignal.label}</p>
        </header>
        {message && <div role="alert" className="app-alert">{message}</div>}
        {loading ? (
          <div className="loading">Cargando datos...</div>
        ) : (
          <Content
            data={effectiveData}
            monitor={monitor}
            session={session}
            view={view}
            onCreateReport={createReport}
            onResolveReport={resolveReport}
            onOperationUpdate={updateOperation}
            onCreateCollection={createCollection}
            onConfirmCollection={confirmCollection}
          />
        )}
      </section>
    </main>
  );
}

function AuthView({ zones, onLogin, message }: { zones: Zone[]; onLogin: (session: Session) => Promise<void>; message: string }) {
  const fallbackZones = zones.length ? zones.map(zone => zone.name) : ["Centro Historico", "Wanchaq", "San Sebastian", "San Jeronimo", "Santiago"];
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password")).trim();
    const token = String(form.get("token") || "").trim();
    const name = String(form.get("name") || "").trim();
    const role = String(form.get("role") || "ciudadano") as Role;
    const zone = String(form.get("zone") || "Centro Historico");
    setIsSubmitting(true);
    setFeedback("");
    try {
      if (mode === "register") {
        const created = await request<{ token?: string; user?: Session }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role, zone }) });
        if (!created.token || !created.user) throw new Error('No se pudo registrar el usuario');
        localStorage.setItem('sir-token', created.token);
        localStorage.setItem('sir-session', JSON.stringify({ ...created.user, email }));
        window.location.reload();
        return;
      }
      if (mode === "forgot") {
        if (!email) throw new Error('Ingresa un correo para recuperar la contraseña');
        if (!token) {
          const response = await request<{ ok?: boolean; token?: string; message?: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
          setFeedback(response.message || 'Si el correo existe, se enviará el token de recuperación');
          return;
        }
        const response = await request<{ ok?: boolean; message?: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
        setFeedback(response.message || 'Contraseña actualizada correctamente');
        setMode('login');
        return;
      }
      (window as Window & { __password?: string }).__password = password;
      await onLogin({ name, email, role, zone });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la acción';
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
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

          <div className="form-actions" style={{ justifyContent: "flex-start", gap: "8px", marginBottom: "12px" }}>
            <button type="button" className={mode === "login" ? "btn-primary" : "ghost"} onClick={() => setMode("login")}>Iniciar sesión</button>
            <button type="button" className={mode === "register" ? "btn-primary" : "ghost"} onClick={() => setMode("register")}>Registrarme</button>
            <button type="button" className={mode === "forgot" ? "btn-primary" : "ghost"} onClick={() => setMode("forgot")}>Recuperar contraseña</button>
          </div>

          {mode === "register" && <div className="form-group">
            <label htmlFor="name">Nombre Completo</label>
            <input 
              id="name"
              name="name" 
              required 
              placeholder="Ej. Ana Quispe Huamán" 
            />
          </div>}

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

          {mode !== "forgot" && <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              id="password"
              name="password" 
              type="password" 
              required 
              minLength={8}
              placeholder="Mínimo 8 caracteres" 
            />
          </div>}

          {mode === "forgot" && <div className="form-group">
            <label htmlFor="token">Token de recuperación</label>
            <input id="token" name="token" placeholder="Pega el token recibido por correo" />
          </div>}

          {mode === "forgot" && <div className="form-group">
            <label htmlFor="password">Nueva contraseña</label>
            <input id="password" name="password" type="password" required minLength={8} placeholder="Ingresa una nueva contraseña" />
          </div>}

          {mode !== "forgot" && (
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
          )}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? "Procesando..." : mode === "login" ? "Iniciar Sesión" : mode === "forgot" ? "Restablecer contraseña" : "Crear cuenta"}</button>
          </div>

          <div className="form-links">
            <button type="button" className="ghost" style={{ padding: 0, border: 0, background: "transparent" }} onClick={() => setMode("forgot")}>¿Olvidaste tu contraseña?</button>
            <span className="divider">•</span>
            <a href="#terms">Términos y Condiciones</a>
          </div>

          {feedback && <p className="hint success">{feedback}</p>}
          {message && <p className="hint error">{message}</p>}
        </form>
      </section>
    </main>
  );
}

function Content(props: { data: Bootstrap; monitor: Monitor; session: Session; view: View; onCreateReport: (report: Omit<Report, "id" | "status">) => Promise<void>; onResolveReport: (id: number) => Promise<void>; onOperationUpdate: (payload: OperationUpdatePayload) => Promise<void>; onCreateCollection: (payload: { truck_id: number; zone_id: number; kg: number }) => Promise<void>; onConfirmCollection: (collectionId: number) => Promise<void>; }) {
  const { data, monitor, session, view, onOperationUpdate, onResolveReport, onCreateCollection, onConfirmCollection } = props;
  if (view === "dashboard") return <Dashboard data={data} monitor={monitor} />;
  if (view === "admin") return <Admin data={data} session={session} onResolveReport={onResolveReport} onOperationUpdate={onOperationUpdate} />;
  if (view === "schedules") return <Schedules schedules={data.schedules} />;
  if (view === "reports") return <Reports {...props} />;
  if (view === "waste") return <Waste />;
  if (view === "routes") return <Routes data={data} monitor={monitor} session={session} onCreateCollection={onCreateCollection} />;
  return <Analytics data={data} session={session} onConfirmCollection={onConfirmCollection} />;
}

function Dashboard({ data, monitor }: { data: Bootstrap; monitor: Monitor }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setTick(value => value + 1), 5000);
    return () => window.clearInterval(interval);
  }, []);

  const effectiveData = { ...data, ...monitor } as Bootstrap;

  const metrics = [
    [effectiveData.analytics.zones, "Zonas Activas", "🗺️"],
    [effectiveData.analytics.active_trucks, "Camiones en Ruta", "🚛"],
    [effectiveData.analytics.open_reports, "Alertas Pendientes", "🚨"],
    [`${effectiveData.analytics.confirmed_collections}/${effectiveData.collections.length}`, "Recolecciones", "✅"],
    ...(monitor.performance ? [
      [monitor.performance.delayed_routes, "Rutas con retraso", "⏱️"],
      [`${monitor.performance.average_progress}%`, "Progreso medio", "📈"],
      [monitor.performance.compliance_estimate, "Índice de cumplimiento", "✅"]
    ] : [])
  ];

  const dispatchBoard = useMemo(() => {
    if (monitor.truck_assignments?.length) {
      return monitor.truck_assignments.slice(0, 3).map((assignment, index) => ({
        hour: `0${8 + index}:00`,
        zone: assignment.zone,
        truck: assignment.truck_code,
        action: assignment.action ?? `Atender ${assignment.zone}`,
        status: index === tick % 3 ? "En curso" : index < tick % 3 ? "Completado" : "Programado"
      }));
    }

    const prioritized = [...(effectiveData.prioritized_zones ?? [])].sort((a, b) => b.priority_score - a.priority_score);
    const routes = [...(effectiveData.optimized_routes ?? effectiveData.routes ?? [])].sort((a, b) => {
      const aUrgency = /retraso/i.test(a.delay) || a.progress < 40 ? 1 : 0;
      const bUrgency = /retraso/i.test(b.delay) || b.progress < 40 ? 1 : 0;
      return bUrgency - aUrgency || b.progress - a.progress;
    });

    const sequence = [
      { hour: "08:00", zone: prioritized[0]?.name ?? "Centro Historico", truck: routes[0]?.truck ?? "C-02", action: "Despacho inicial" },
      { hour: "09:00", zone: prioritized[1]?.name ?? "Wanchaq", truck: routes[1]?.truck ?? "C-01", action: "Revisión de contenedores" },
      { hour: "10:00", zone: prioritized[2]?.name ?? "Santiago", truck: routes[2]?.truck ?? "C-03", action: "Atención de reporte" }
    ];

    return sequence.map((step, index) => ({
      ...step,
      status: index === tick % 3 ? "En curso" : index < tick % 3 ? "Completado" : "Programado"
    }));
  }, [monitor.truck_assignments, effectiveData.prioritized_zones, effectiveData.optimized_routes, effectiveData.routes, tick]);

  const alerts = (monitor.alerts ?? []).map((alert, index) => ({
    id: index,
    icon: alert.includes("retraso") ? "🚛" : "🔔",
    title: alert,
    description: alert,
    time: "Ahora",
    status: alert.toLowerCase().includes("retraso") ? "pendiente" : "activo"
  }));

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
          <Map zones={data.zones} trucks={effectiveData.trucks} routes={effectiveData.optimized_routes ?? effectiveData.routes} prioritizedZones={effectiveData.prioritized_zones ?? []} />
        </section>
        <section className="panel panel-alerts">
          <div className="alerts-header">
            <h2>📋 Tablero de despacho</h2>
            <span className="alert-count">Operativo</span>
          </div>
          <div className="alerts-list">
            {dispatchBoard.map(step => (
              <div className={`alert-item alert-${step.status === "En curso" ? "activo" : step.status === "Programado" ? "pendiente" : "resuelto"}`} key={step.hour}>
                <div className="alert-icon">🚛</div>
                <div className="alert-content">
                  <h4>{step.hour} · {step.zone}</h4>
                  <p>{step.action} · Camión {step.truck}</p>
                  <span className="alert-time">{step.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel-alerts">
          <div className="alerts-header">
            <h2>🚧 Plan de intervención</h2>
            <span className="alert-count">{effectiveData.intervention_plan?.length ?? 0}</span>
          </div>
          <div className="alerts-list">
            {(effectiveData.intervention_plan ?? []).map((step, index) => (
              <div className="alert-item alert-activo" key={`${step.title}-${index}`}>
                <div className="alert-icon">✅</div>
                <div className="alert-content">
                  <h4>{step.title}</h4>
                  <p>{step.detail}</p>
                  <span className="alert-time">Prioridad {step.priority}</span>
                </div>
              </div>
            ))}
            {(effectiveData.intervention_plan ?? []).length === 0 && (
              <p style={{ color: "var(--muted)", padding: "12px 0" }}>No hay acciones de intervención prioritarias definidas.</p>
            )}
          </div>
        </section>

        <section className="panel panel-alerts">
          <div className="alerts-header">
            <h2>⚠️ Alertas Activas</h2>
            <span className="alert-count">{alerts.length}</span>
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

function Reports({ data, session, onCreateReport, onResolveReport }: { data: Bootstrap; session: Session; onCreateReport: (report: Omit<Report, "id" | "status">) => Promise<void>; onResolveReport: (id: number) => Promise<void>; }) {
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
  const isCitizen = session.role === "ciudadano";
  const canResolve = session.role === "operador" || session.role === "admin";

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
      <section className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2>{isCitizen ? "Mis reportes" : "Seguimiento"}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="export-btn" onClick={() => exportToCSV("reportes", data.reports)}>
              📥 Exportar reportes CSV
            </button>
            <button type="button" className="export-btn" onClick={() => exportToPDF("Reportes", data.reports.map(report => `<div class="report-card"><h2>${report.type}</h2><div class="tag">${report.status}</div><p><strong>Zona:</strong> ${report.zone}</p><p><strong>Ciudadano:</strong> ${report.citizen}</p><p>${report.detail}</p></div>`).join(""))}>
              📄 Exportar reportes PDF
            </button>
          </div>
        </div>
        {isCitizen && <p style={{ color: "var(--muted)", marginBottom: "12px" }}>Como ciudadano, esta vista muestra solo tus reportes.</p>}
        <ReportList reports={data.reports} trucks={data.trucks} showDriverFilter={!isCitizen} showResolve={canResolve} onResolveReport={onResolveReport} />
      </section>
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

function Routes({ data, monitor, session, onCreateCollection }: { data: Bootstrap; monitor: Monitor; session?: Session | null; onCreateCollection?: (payload: { truck_id: number; zone_id: number; kg: number }) => Promise<void>; }) {
  const [alerts, setAlerts] = useState<string[]>([]);
  const trucks = monitor.trucks ?? data.trucks;
  const routes = monitor.optimized_routes ?? data.routes;
  const prioritizedZones = monitor.prioritized_zones ?? data.prioritized_zones ?? [];
  const [kgValue, setKgValue] = useState(0);
  const [selectedTruck, setSelectedTruck] = useState<number | "">(trucks[0]?.id ?? "");
  const [selectedZone, setSelectedZone] = useState<number | "">(data.zones[0]?.id ?? "");
  const [submittingCollection, setSubmittingCollection] = useState(false);

  useEffect(() => {
    fetch(`${geoBase}/alerts`).then(response => response.json()).then(payload => setAlerts(payload.alerts ?? [])).catch(() => setAlerts([]));
  }, []);

  async function submitCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreateCollection) return;
    setSubmittingCollection(true);
    try {
      await onCreateCollection({ truck_id: Number(selectedTruck), zone_id: Number(selectedZone), kg: Number(kgValue) });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmittingCollection(false);
    }
  }

  return (
    <div className="two-col">
      <section className="panel"><h2>Mapa operativo OpenStreetMap</h2><Map zones={data.zones} trucks={trucks} routes={routes} prioritizedZones={prioritizedZones} /></section>
      <section className="panel">
        <h2>Seguimiento GPS</h2>
        <div className="list">
          {routes.map(route => <Item key={route.id} title={`${route.truck} - ${route.zone}`} detail={`Avance ${route.progress}% | ETA ${route.eta} | ${route.delay}`} color={route.delay.includes("Retraso") ? "yellow" : "blue"} />)}
          {alerts.map(alert => <Item key={alert} title="Microservicio TS" detail={alert} color="blue" />)}
        </div>
      </section>
    </div>
  );
}

export function Operations({ data, monitor, onOperationUpdate }: { data: Bootstrap; monitor: Monitor; onOperationUpdate: (payload: OperationUpdatePayload) => Promise<void>; }) {
  const effectiveData = { ...data, ...monitor } as Bootstrap;
  const alerts = [
    ...(effectiveData.notifications?.length ? effectiveData.notifications : data.notifications ?? []).map(item => `${item.title}: ${item.message}`),
    ...((effectiveData.containers?.length ? effectiveData.containers : data.containers ?? [])).filter(container => container.fill_level >= 80).map(container => `Contenedor ${container.name} en ${container.status}`),
    ...(effectiveData.maintenance?.length ? effectiveData.maintenance : data.maintenance ?? []).filter(item => item.status === "Pendiente").map(item => `Mantenimiento pendiente: ${item.description}`)
  ];

  const routes = (effectiveData.optimized_routes?.length ? effectiveData.optimized_routes : effectiveData.routes) ?? [];
  const containers = (effectiveData.containers?.length ? effectiveData.containers : data.containers) ?? [];
  const recentEvents = (effectiveData.notifications?.length ? effectiveData.notifications : data.notifications) ?? [];
  const [eventType, setEventType] = useState<"route_update" | "container_update">("route_update");

  async function submitEventUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: OperationUpdatePayload = {
      type: formData.get("type") as "route_update" | "container_update",
      id: Number(formData.get("targetId")) || 0,
      note: String(formData.get("note") || "").trim() || undefined,
    };

    if (payload.type === "route_update") {
      const progressValue = formData.get("progress");
      if (progressValue) payload.progress = Number(progressValue);
      const delayValue = String(formData.get("delay") || "").trim();
      if (delayValue) payload.delay = delayValue;
    } else {
      const fillLevelValue = formData.get("fill_level");
      if (fillLevelValue) payload.fill_level = Number(fillLevelValue);
      const statusValue = String(formData.get("status") || "").trim();
      if (statusValue) payload.status = statusValue;
    }

    const form = event.currentTarget;
    await onOperationUpdate(payload);
    if (form) {
      form.reset();
    }
  }

  const topZone = (effectiveData.prioritized_zones?.length ? effectiveData.prioritized_zones : data.prioritized_zones ?? [])[0];
  const topRoute = ((effectiveData.optimized_routes?.length ? effectiveData.optimized_routes : effectiveData.routes) ?? [])[0];
  const assignments = (effectiveData.truck_assignments?.length ? effectiveData.truck_assignments : data.truck_assignments) ?? [];
  const plan = (effectiveData.intervention_plan?.length ? effectiveData.intervention_plan : data.intervention_plan) ?? [];
  const recommendation = topZone && topRoute
    ? `Asignar prioridad a ${topZone.name} y despachar ${topRoute.truck} para atender la ruta más urgente.`
    : "Revisar el monitoreo de zonas y rutas para definir la siguiente acción operativa.";
  const actionDetail = topZone && topRoute
    ? `Acción sugerida: ${topRoute.truck} debe dirigirse a ${topZone.name} con intervención inmediata.`
    : "No hay una acción prioritaria definida en este momento.";

  return (
    <div className="two-col">
      <section className="panel">
        <h2>Acción prioritaria</h2>
        <div className="list">
          <Item title="Recomendación" detail={recommendation} color="red" />
          <Item title="Plan de intervención" detail={actionDetail} color="yellow" />
          {plan.map((step, index) => <Item key={`${step.title}-${index}`} title={step.title} detail={`${step.detail} · Prioridad ${step.priority}`} color={step.priority === "alta" ? "red" : "blue"} />)}
          {topZone && <Item title="Zona crítica" detail={`${topZone.name} · Puntaje ${topZone.priority_score} · ${topZone.criticality}`} color="yellow" />}
          {topRoute && <Item title="Ruta priorizada" detail={`${topRoute.truck} · ${topRoute.zone} · ${topRoute.eta} · ${topRoute.delay}`} color="blue" />}
        </div>
      </section>
      <section className="panel">
        <h2>Monitoreo operativo</h2>
        <div className="list">
          {alerts.length === 0 ? <p>No hay alertas operativas.</p> : alerts.map((alert, index) => <Item key={`${alert}-${index}`} title="Operación" detail={alert} color="yellow" />)}
        </div>
      </section>
      <section className="panel">
        <h2>Eventos recientes</h2>
        <div className="list">
          {recentEvents.length === 0 ? <p>No hay eventos operativos recientes.</p> : recentEvents.map(event => <Item key={event.id} title={event.title} detail={event.message} color="blue" />)}
        </div>
      </section>
      <section className="panel">
        <h2>Eventos operativos</h2>
        <form className="form-grid" onSubmit={submitEventUpdate}>
          <label>
            Tipo de evento
            <select name="type" value={eventType} onChange={(event) => setEventType(event.currentTarget.value as "route_update" | "container_update") }>
              <option value="route_update">Actualización de ruta</option>
              <option value="container_update">Actualización de contenedor</option>
            </select>
          </label>
          <label>
            Objetivo
            <select name="targetId">
              {eventType === "route_update" ? (
                routes.map(route => <option key={route.id} value={route.id}>{`Ruta ${route.truck} - ${route.zone}`}</option>)
              ) : (
                containers.map(container => <option key={container.id} value={container.id}>{`${container.name} (${container.fill_level}%)`}</option>)
              )}
            </select>
          </label>
          {eventType === "route_update" ? (
            <>
              <label>
                Progreso
                <input name="progress" type="number" min={0} max={100} placeholder="Ej. 75" />
              </label>
              <label>
                Retraso
                <input name="delay" type="text" placeholder="Retraso leve" />
              </label>
            </>
          ) : (
            <>
              <label>
                Llenado (%)
                <input name="fill_level" type="number" min={0} max={100} placeholder="85" />
              </label>
              <label>
                Estado
                <input name="status" type="text" placeholder="Operativo / Lleno" />
              </label>
            </>
          )}
          <label className="wide">
            Nota operativa
            <textarea name="note" placeholder="Detalle de la acción..." />
          </label>
          <button type="submit" className="btn-primary">Enviar evento</button>
        </form>
      </section>
      <section className="panel">
        <h2>Asignaciones de despacho</h2>
        <div className="list">
          {assignments.length === 0 ? <p>No hay asignaciones activas.</p> : assignments.map(assignment => <Item key={assignment.route_id} title={`${assignment.truck_code} · ${assignment.zone}`} detail={`${assignment.action} · Prioridad ${assignment.priority} · ETA ${assignment.eta}`} color={assignment.priority === "Alta" ? "red" : "blue"} />)}
        </div>
      </section>
      <section className="panel">
        <h2>Prioridad de zonas y rutas</h2>
        <div className="list">
          {(data.prioritized_zones ?? []).map(zone => <Item key={zone.id} title={zone.name} detail={`Prioridad ${zone.priority_score} | ${zone.criticality}`} color={zone.priority_score >= 5 ? "red" : "blue"} />)}
          {(data.optimized_routes ?? []).map(route => <Item key={route.id} title={`Ruta ${route.truck}`} detail={`${route.zone} | ${route.eta} | ${route.delay}`} color={route.delay.includes("Retraso") ? "yellow" : "blue"} />)}
          {(data.truck_assignments ?? []).map(assignment => <Item key={assignment.route_id} title={`Asignación ${assignment.truck_code}`} detail={`${assignment.zone} · ${assignment.priority} · ETA ${assignment.eta}`} color={assignment.priority === "Alta" ? "red" : "blue"} />)}
        </div>
      </section>
      <section className="panel">
        <h2>Contenedores y mantenimiento</h2>
        <div className="list">
          {(data.containers ?? []).map(container => <Item key={container.id} title={container.name} detail={`${container.fill_level}% | ${container.status}`} color={container.fill_level >= 80 ? "red" : "blue"} />)}
          {(data.maintenance ?? []).map(item => <Item key={item.id} title={`Mantenimiento #${item.id}`} detail={`${item.description} | ${item.status}`} color={item.status === "Pendiente" ? "yellow" : "blue"} />)}
        </div>
      </section>
    </div>
  );
}

function Analytics({ data, session, onConfirmCollection }: { data: Bootstrap; session?: Session | null; onConfirmCollection?: (id: number) => Promise<void>; }) {
  const performance = data.performance;
  const reportCounts = data.reports.reduce((acc, report) => {
    acc[report.status] = (acc[report.status] ?? 0) + 1;
    return acc;
  }, { Pendiente: 0, "En revision": 0, Resuelto: 0 } as Record<string, number>);
  const collectionCounts = data.collections.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const metricsCSV = [
    { nombre: "Residuos registrados", valor: `${data.analytics.total_kg} kg` },
    { nombre: "Cumplimiento de rutas", valor: `${data.analytics.compliance}%` },
    { nombre: "Reportes abiertos", valor: data.analytics.open_reports },
    { nombre: "Camiones activos", valor: data.analytics.active_trucks },
    { nombre: "Rutas con retraso", valor: performance?.delayed_routes ?? 0 },
    { nombre: "Progreso medio", valor: `${performance?.average_progress ?? 0}%` },
    { nombre: "Llenado promedio contenedores", valor: `${performance?.average_container_fill ?? 0}%` },
    { nombre: "Recolecciones confirmadas", valor: `${collectionCounts["Confirmada"] ?? 0}/${data.collections.length}` }
  ];

  return (
    <>
      <div className="grid metrics">
        <Metric value={`${data.analytics.total_kg} kg`} label="Residuos registrados" />
        <Metric value={`${data.analytics.compliance}%`} label="Cumplimiento de rutas" />
        <Metric value={`${data.analytics.open_reports}`} label="Reportes abiertos" />
        <Metric value={`${data.analytics.active_trucks}`} label="Camiones activos" />
        <Metric value={`${performance?.delayed_routes ?? 0}`} label="Rutas con retraso" />
        <Metric value={`${performance?.average_progress ?? 0}%`} label="Progreso medio" />
        <Metric value={`${performance?.average_container_fill ?? 0}%`} label="Llenado promedio" />
        <Metric value={`${collectionCounts["Confirmada"] ?? 0}/${data.collections.length}`} label="Recolectas confirmadas" />
      </div>
      <section className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2>Historial de recoleccion</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="export-btn" onClick={() => exportToCSV("metricas", metricsCSV)}>
              📥 Exportar métricas CSV
            </button>
            <button type="button" className="export-btn" onClick={() => exportToPDF("Metricas", `<table><thead><tr><th>Métrica</th><th>Valor</th></tr></thead><tbody>${metricsCSV.map(item => `<tr><td>${item.nombre}</td><td>${item.valor}</td></tr>`).join("")}</tbody></table>`) }>
              📄 Exportar métricas PDF
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <section className="panel" style={{ padding: "16px" }}>
            <h3>Resumen de reportes</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 1.8 }}>
              <li>Pendientes: <strong>{reportCounts.Pendiente}</strong></li>
              <li>En revisión: <strong>{reportCounts["En revision"]}</strong></li>
              <li>Resueltos: <strong>{reportCounts.Resuelto}</strong></li>
            </ul>
          </section>
          <section className="panel" style={{ padding: "16px" }}>
            <h3>Estado de recolecciones</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 1.8 }}>
              {Object.entries(collectionCounts).map(([status, count]) => (
                <li key={status}>{status}: <strong>{count}</strong></li>
              ))}
            </ul>
          </section>
        </div>
        <div className="list">
          {data.collections.map(item => (
            <article className="item" key={item.id}>
              <div className="item-row">
                <strong>{`${item.date} - ${item.zone}`}</strong>
                <span className={`tag ${item.status === "Confirmada" ? "blue" : "yellow"}`}>{item.status}</span>
              </div>
              <span>{`${item.truck} · ${item.kg} kg`}</span>
              {session && session.role === "ciudadano" && !String(item.status).toLowerCase().includes("confirmada") && onConfirmCollection && (
                <div style={{ marginTop: 8 }}>
                  <button className="btn-primary" onClick={() => onConfirmCollection(item.id)}>Confirmar recolección</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Map({ zones, trucks, routes, prioritizedZones }: { zones: Zone[]; trucks: Truck[]; routes: Route[]; prioritizedZones: Array<{ id: number; name: string; priority_score: number; criticality: string; latitude?: number; longitude?: number }> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const signature = useMemo(() => JSON.stringify({ zones, trucks, routes, prioritizedZones }), [zones, trucks, routes, prioritizedZones]);

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
    prioritizedZones.forEach(zone => {
      const lat = zone.latitude ?? zones.find(item => item.name === zone.name)?.latitude;
      const lon = zone.longitude ?? zones.find(item => item.name === zone.name)?.longitude;
      if (lat !== undefined && lon !== undefined) {
        L.circleMarker([lat, lon], { radius: 12, color: zone.priority_score >= 5 ? "#c94735" : "#f5b942", fillColor: zone.priority_score >= 5 ? "#c94735" : "#f5b942", fillOpacity: 0.9, weight: 3 }).bindPopup(`${zone.name} · Prioridad ${zone.priority_score}`).addTo(layer);
      }
    });
    trucks.forEach(truck => L.circleMarker([truck.latitude, truck.longitude], { radius: 8, color: "#f5b942", fillOpacity: 0.9 }).bindPopup(`${truck.code} - ${truck.status}`).addTo(layer));
    routes.forEach(route => L.circle([route.latitude, route.longitude], { radius: 450, color: route.delay.includes("Retraso") ? "#c94735" : "#0f8b8d" }).bindPopup(`${route.truck}: ${route.eta}`).addTo(layer));
    return () => { layer.remove(); };
  }, [signature]);

  return <div className="map" ref={ref} />;
}

function ReportList({ reports, trucks = [], showDriverFilter = false, showResolve = false, onResolveReport }: { reports: Report[]; trucks?: Truck[]; showDriverFilter?: boolean; showResolve?: boolean; onResolveReport?: (id: number) => Promise<void>; }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [driverSearch, setDriverSearch] = useState("");
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  
  const driverByZone = useMemo(() => {
    const map: Record<string, string> = {};
    trucks.forEach(truck => {
      const zoneKey = truck.zone.toLowerCase();
      if (!map[zoneKey]) {
        map[zoneKey] = truck.driver.toLowerCase();
      }
    });
    return map;
  }, [trucks]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    const normalizedDriver = driverSearch.toLowerCase().trim();

    return reports.filter(r => {
      const reportDriver = driverByZone[r.zone.toLowerCase()] ?? "";
      const matchSearch = r.type.toLowerCase().includes(normalizedSearch) || 
                          r.zone.toLowerCase().includes(normalizedSearch) ||
                          r.citizen.toLowerCase().includes(normalizedSearch) ||
                          r.detail.toLowerCase().includes(normalizedSearch) ||
                          reportDriver.includes(normalizedSearch);
      const matchStatus = filterStatus === "Todos" || r.status === filterStatus;
      const matchDriver = !normalizedDriver || reportDriver.includes(normalizedDriver);
      return matchSearch && matchStatus && matchDriver;
    });
  }, [reports, search, filterStatus, driverSearch, driverByZone]);
  
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
      {showDriverFilter && (
        <div className="search-box" style={{ marginTop: '10px' }}>
          <span className="search-icon">🚗</span>
          <input
            type="text"
            placeholder="Buscar por conductor..."
            value={driverSearch}
            onChange={(e) => setDriverSearch(e.target.value)}
            aria-label="Buscar reportes por conductor"
          />
        </div>
      )}
      
      <div className="filter-bar">
        {filtered.length === 0 ? (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>
            No hay reportes que coincidan con tu búsqueda
          </p>
        ) : (
          filtered.map(report => {
            const reportDriver = driverByZone[report.zone.toLowerCase()] ?? "Sin conductor asignado";
            return (
              <article className="item" key={report.id}>
                <div className="item-row">
                  <strong>{report.type}</strong>
                  <span className={`tag ${statusTone(report.status)}`}>
                    {reportStatusLabel(report.status)}
                  </span>
                </div>
                <span>{report.zone} | {report.citizen} | {reportDriver}</span>
                <p>{report.detail}</p>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

const rootElement = typeof document !== "undefined" ? document.getElementById("root") : null;
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
