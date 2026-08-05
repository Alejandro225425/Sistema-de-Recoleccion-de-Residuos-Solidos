import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
import "./styles.css";
import Admin from "./components/Admin";
import { AuthView } from "./components/AuthView";
import Item, { Metric } from "./components/Item";
import { request } from "./api";
import { shouldAutoLoginAsAdmin } from "./demoAuth";
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

function statusTone(status: string | undefined | null) {
  const s = (status ?? "").toString().toLowerCase().trim();
  if (s === "resuelto") return "blue";
  if (s === "en revision") return "yellow";
  if (s === "pendiente") return "red";
  if (s === "parcial") return "yellow";
  return "red";
}

function getOperationalSignal(data: Bootstrap) {
  const analytics = data?.analytics ?? { open_reports: 0, active_trucks: 0 };
  const delayedRoutes = (data?.routes ?? []).filter(route => String(route?.delay ?? "").toLowerCase().includes("retraso")).length;
  if (analytics.open_reports > 2 || delayedRoutes > 0) {
    return { label: `${analytics.open_reports} incidencias abiertas`, tone: "warning" };
  }
  if (analytics.active_trucks === 0) {
    return { label: "Sin camiones activos", tone: "danger" };
  }
  return { label: "Operación estable", tone: "ok" };
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportToCSV(filename: string, data: any[]) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => escapeCSV(row[h])).join(","))
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
  URL.revokeObjectURL(url);
}

function exportToPDF(title: string, html: string) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:system-ui, sans-serif;padding:20px;color:#1f2937;}h1,h2{margin:0 0 16px;}h1{font-size:24px;}h2{font-size:18px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #d1d5db;padding:10px;text-align:left;}tr:nth-child(even){background:#f9fafb;} .report-card{border:1px solid #d1d5db;border-radius:10px;padding:16px;margin-bottom:16px;} .tag{display:inline-block;background:#e5e7eb;color:#111827;padding:4px 10px;border-radius:999px;font-size:12px;margin-top:8px;}</style></head><body><h1>${escapeHtml(title)}</h1>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function extractWasteTypes(waste: string): string[] {
  if (!waste) return [];
  return waste
    .split(/[,\;]|\s+(?:y|e|&)\s+/i)
    .map(t => t.trim())
    .filter(t => t && !(t === "y" || t === "e" || t === "&" || ["y", "e", "&"].includes(t.toLowerCase())))
    .map(t => t.charAt(0).toUpperCase() + t.slice(1));
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Error capturado en ErrorBoundary:", error, errorInfo);
    console.error("Stack:", error.stack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const stack = this.state.errorInfo?.componentStack ?? "";
      return (
        <div className="panel" style={{ margin: "32px" }}>
          <h2>Se produjo un error al renderizar esta sección</h2>
          <p className="hint error" style={{ margin: "12px 0" }}>
            {this.state.error?.message || "Error inesperado de interfaz"}
          </p>
          {import.meta.env.DEV && stack && (
            <pre style={{ fontSize: "0.7rem", whiteSpace: "pre-wrap", color: "var(--muted, #5a6670)" }}>{stack}</pre>
          )}
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [data, setData] = useState<Bootstrap>(emptyBootstrap);
  const [monitor, setMonitor] = useState<Monitor>({});
  const effectiveData = useMemo(() => {
    const safeData = data ?? emptyBootstrap;
    const safeMonitor: Monitor = Object.fromEntries(Object.entries(monitor ?? {}).filter(([, v]) => v !== null)) as Monitor;
    const mergedTrucks = (safeMonitor.trucks && Array.isArray(safeMonitor.trucks) && safeMonitor.trucks.length > 0)
      ? safeMonitor.trucks.map(mt => {
          const base = (Array.isArray(safeData.trucks) ? safeData.trucks : []).find(t => t.code === mt.code || t.id === mt.id);
          return { ...base, ...mt };
        })
      : (safeData.trucks ?? []);

    return {
      ...safeData,
      ...safeMonitor,
      trucks: mergedTrucks,
      zones: safeData.zones ?? [],
      schedules: safeData.schedules ?? [],
      routes: safeMonitor.optimized_routes ?? safeMonitor.routes ?? safeData.routes ?? [],
      reports: safeData.reports ?? [],
      collections: safeData.collections ?? [],
      analytics: safeData.analytics ?? emptyBootstrap.analytics,
      users: safeData.users ?? [],
      containers: safeMonitor.containers ?? safeData.containers ?? [],
      maintenance: safeMonitor.maintenance ?? safeData.maintenance ?? [],
      notifications: safeMonitor.notifications ?? safeData.notifications ?? [],
      prioritized_zones: safeMonitor.prioritized_zones ?? safeData.prioritized_zones ?? [],
      optimized_routes: safeMonitor.optimized_routes ?? safeData.optimized_routes ?? [],
      truck_assignments: safeMonitor.truck_assignments ?? safeData.truck_assignments ?? [],
      intervention_plan: safeMonitor.intervention_plan ?? safeData.intervention_plan ?? [],
      performance: safeMonitor.performance ?? safeData.performance ?? { total_routes: 0, delayed_routes: 0, low_progress_routes: 0, average_progress: 0, open_reports: 0, average_container_fill: 0, compliance_estimate: 0 },
    } as Bootstrap;
  }, [data, monitor]);
  const [session, setSession] = useState<Session | null>(() => JSON.parse(localStorage.getItem("sir-session") || "null"));
  const [view, setView] = useState<View>("dashboard");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [health, setHealth] = useState<{ mode: string; connected: boolean; database: string } | null>(null);
  const [lastSync, setLastSync] = useState("");
  const roleViews: Record<Role, View[]> = {
    admin: views,
    operador: ["dashboard", "reports", "routes", "analytics"],
    conductor: ["dashboard", "routes", "analytics"],
    ciudadano: ["dashboard", "reports", "schedules", "waste", "analytics"],
  };
  const accessibleViews = session ? roleViews[session.role] ?? roleViews.ciudadano : roleViews.ciudadano;

  useEffect(() => {
    if (session || typeof window === "undefined") return;
    const shouldAutoLogin = shouldAutoLoginAsAdmin(window.location.href);
    if (!shouldAutoLogin) return;

    void login("admin@ecocusco.pe", "admin123").catch(() => {
      setMessage("No se pudo entrar automáticamente como administrador. Prueba con las credenciales de demo.");
    });
  }, [session]);

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);

async function loadData() {
     setLoading(true);
     try {
       const bootstrap = await request<Bootstrap>("/bootstrap");
       setData(bootstrap);
     } catch (error) {
       const msg = error instanceof Error ? error.message : "";
       // Si el backend rechaza el token (401/expirado), limpiar sesión para evitar estado inconsistente
       if (msg.includes("401") || msg.toLowerCase().includes("token") || msg.toLowerCase().includes("no autorizado")) {
         localStorage.removeItem("sir-session");
         localStorage.removeItem("sir-token");
         setSession(null);
       }
     } finally {
       setLoading(false);
     }
   }

  async function loadMonitor() {
    try {
      const monitorPayload = await request<Monitor>("/operations/monitor");
      setMonitor(monitorPayload);
      setLastSync(new Date().toLocaleString("es-PE"));
    } catch (error) {
      console.error("Error loading monitor data:", error);
    }
  }

  async function loadHealth() {
    try {
      const healthPayload = await request<{ mode: string; connected: boolean; database: string }>("/health");
      setHealth(healthPayload);
    } catch {
      setHealth(null);
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
     loadHealth().catch(() => {});
     const monitorInterval = window.setInterval(() => {
      loadMonitor().catch(() => {});
    }, 10000);
    return () => window.clearInterval(monitorInterval);
  }, []);

  async function login(email: string, password: string) {
    try {
      const payload = await request<{ token?: string; user?: Session; detail?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!payload.token || !payload.user) {
        throw new Error(payload.detail || 'No se recibió token válido del backend');
      }
      localStorage.setItem('sir-session', JSON.stringify(payload.user));
      localStorage.setItem('sir-token', payload.token);
      setSession(payload.user);
      setMessage('');
      await loadData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
      setMessage(msg);
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

  let operationalSignal;
  try {
    operationalSignal = getOperationalSignal({ ...data, ...monitor });
  } catch (error) {
    console.error("Error en getOperationalSignal:", error);
    operationalSignal = { label: "Estado desconocido", tone: "danger" };
  }

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
        </div>
      </aside>

      <section id="main-content" className="main-content">
        <header className="page-header">
          <h2>{viewLabels[view]}</h2>
          <p className={`signal signal-${operationalSignal.tone}`}>{operationalSignal.label}</p>
        </header>
        {message && <div role="alert" className="app-alert">{message}</div>}
        <ErrorBoundary>
          {loading ? (
            <div className="loading">Cargando datos...</div>
          ) : (
<Content
                data={effectiveData}
                monitor={monitor}
                session={session}
                view={view}
                setView={setView}
                onCreateReport={createReport}
                onResolveReport={resolveReport}
                onOperationUpdate={updateOperation}
                onCreateCollection={createCollection}
                onConfirmCollection={confirmCollection}
                health={health}
                lastSync={lastSync}
                onRefresh={loadData}
              />
          )}
        </ErrorBoundary>
      </section>
    </main>
  );
}

function Content(props: { data: Bootstrap; monitor: Monitor; session: Session; view: View; setView: (v: View) => void; onCreateReport: (report: Omit<Report, "id" | "status">) => Promise<void>; onResolveReport: (id: number) => Promise<void>; onOperationUpdate: (payload: OperationUpdatePayload) => Promise<void>; onCreateCollection: (payload: { truck_id: number; zone_id: number; kg: number }) => Promise<void>; onConfirmCollection: (collectionId: number) => Promise<void>; health: { mode: string; connected: boolean; database: string } | null; lastSync: string; onRefresh: () => Promise<void>; }) {
  const { data, monitor, session, view, setView, onCreateReport, onOperationUpdate, onResolveReport, onCreateCollection, onConfirmCollection, health, lastSync, onRefresh } = props;
  const safeData = data ?? emptyBootstrap;
  if (view === "dashboard") return <Dashboard data={safeData} monitor={monitor} session={session} onConfirmCollection={onConfirmCollection} health={health} lastSync={lastSync} view={view} setView={setView} />;
  if (view === "admin") return (
    <ErrorBoundary fallback={<div className="panel" style={{ margin: 32 }}><h2>Error en Administración</h2><p className="hint error">El panel de administración encontró un error al cargar. Reintenta desde el menú lateral.</p><button type="button" onClick={() => window.location.reload()}>Recargar página</button></div>}>
      <Admin data={safeData} session={session} onOperationUpdate={onOperationUpdate} onRefresh={onRefresh} />
    </ErrorBoundary>
  );
  if (view === "schedules") return <Schedules schedules={Array.isArray(data?.schedules) ? data.schedules : []} citizenZone={session?.zone} />;
  if (view === "reports") return <Reports {...props} data={safeData} />;
  if (view === "waste") return <Waste data={safeData} monitor={monitor} session={session} onCreateReport={onCreateReport} />;
  if (view === "routes") return <Routes data={safeData} monitor={monitor} session={session} onCreateCollection={onCreateCollection} />;
  return <Analytics data={safeData} session={session} onConfirmCollection={onConfirmCollection} />;
}

export function Dashboard({ data, monitor, session, onConfirmCollection, health, lastSync, view, setView }: { data: Bootstrap; monitor: Monitor; session: Session; onConfirmCollection?: (collectionId: number) => Promise<void>; health: { mode: string; connected: boolean; database: string } | null; lastSync: string; view: View; setView: (v: View) => void; }) {
  const [tick, setTick] = useState(0);
  const tickRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const isCitizen = session.role === "ciudadano";
  const isAdmin = session.role === "admin";
  const isConductor = session.role === "conductor";

  useEffect(() => {
    if (isCitizen) return;
    intervalRef.current = window.setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
    }, 5000);
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isCitizen]);

  const effectiveData = useMemo(() => {
    const mergedTrucks = (monitor.trucks && Array.isArray(monitor.trucks) && monitor.trucks.length > 0)
      ? monitor.trucks.map(mt => {
          const base = (Array.isArray(data.trucks) ? data.trucks : []).find(t => t.code === mt.code || t.id === mt.id);
          return { ...base, ...mt };
        })
      : (data.trucks ?? []);

    return {
      ...data,
      ...monitor,
      trucks: mergedTrucks,
      zones: data.zones ?? [],
      schedules: data.schedules ?? [],
      routes: monitor.optimized_routes ?? monitor.routes ?? data.routes ?? [],
      reports: data.reports ?? [],
      collections: data.collections ?? [],
      analytics: data.analytics ?? emptyBootstrap.analytics,
      users: data.users ?? [],
      containers: monitor.containers ?? data.containers ?? [],
      maintenance: monitor.maintenance ?? data.maintenance ?? [],
      notifications: monitor.notifications ?? data.notifications ?? [],
    } as Bootstrap;
  }, [data, monitor]);

  const safeReports = useMemo(() => (Array.isArray(data.reports) ? data.reports : []), [data.reports]);
  const safeCollections = useMemo(() => (Array.isArray(data.collections) ? data.collections : []), [data.collections]);
  const myReports = useMemo(() => {
    if (!isCitizen) return [];
    return safeReports.filter(report => String(report.citizen ?? "").toLowerCase() === String(session.name ?? "").toLowerCase());
  }, [isCitizen, safeReports, session.name]);
  const pendingReports = useMemo(() => myReports.filter(report => !String(report.status ?? "").toLowerCase().includes("resuelto")), [myReports]);
  const pendingCollections = useMemo(() => {
    if (!isCitizen) return [];
    return safeCollections.filter(collection => !String(collection.status ?? "").toLowerCase().includes("confirmada"));
  }, [isCitizen, safeCollections]);
  const zoneSummary = useMemo(() => {
    const zone = (data.zones ?? []).find(item => String(item.name).toLowerCase() === String(session.zone ?? "").toLowerCase());
    return zone ? `${zone.name} · ${zone.criticality}` : session.zone || "Sin zona asignada";
  }, [data.zones, session.zone]);

  const myTruck = useMemo(() => {
    if (!isConductor) return undefined;
    const trucks = Array.isArray(effectiveData.trucks) ? effectiveData.trucks : [];
    return trucks.find(t => String(t.driver ?? "").toLowerCase() === String(session.name ?? "").toLowerCase());
  }, [isConductor, effectiveData.trucks, session.name]);

  const myZoneCollections = useMemo(() => {
    if (!isConductor) return [];
    const zoneLower = String(session.zone ?? "").toLowerCase();
    if (!zoneLower) return [];
    return (Array.isArray(data.collections) ? data.collections : []).filter(c => String(c.zone ?? "").toLowerCase() === zoneLower);
  }, [isConductor, data.collections, session.zone]);

  const myZoneReports = useMemo(() => {
    if (!isConductor) return [];
    const zoneLower = String(session.zone ?? "").toLowerCase();
    if (!zoneLower) return [];
    return (Array.isArray(data.reports) ? data.reports : []).filter(r => String(r.zone ?? "").toLowerCase() === zoneLower);
  }, [isConductor, data.reports, session.zone]);

  const metrics = [
    ...(isCitizen
      ? [
          [pendingReports.length, "Reportes pendientes", "🧾"],
          [pendingCollections.length, "Recolecciones pendientes", "✅"],
          [myReports.filter(r => String(r.status ?? "").toLowerCase().includes("resuelto")).length, "Reportes resueltos", "👍"],
          [safeCollections.length, "Recolecciones en mi zona", "📍"],
        ]
      : isAdmin
      ? [
          [effectiveData.analytics.zones, "Zonas Activas", "🗺️"],
          [effectiveData.analytics.active_trucks, "Camiones en Ruta", "🚛"],
          [effectiveData.analytics.open_reports, "Alertas Pendientes", "🚨"],
          [`${effectiveData.analytics.confirmed_collections}/${effectiveData.collections.length}`, "Recolecciones", "✅"],
          ...(monitor.performance ? [
            [monitor.performance.delayed_routes, "Rutas con retraso", "⏱️"],
            [`${monitor.performance.average_progress}%`, "Progreso medio", "📈"],
            [monitor.performance.compliance_estimate, "Índice de cumplimiento", "✅"],
            [data.users?.length ?? 0, "Usuarios registrados", "👥"],
            [data.trucks?.filter((t: Truck) => t.status === "Mantenimiento").length ?? 0, "Camiones en mantenimiento", "🔧"],
          ] : []),
        ]
      : isConductor
      ? [
          [myZoneCollections.length, "Recolecciones en mi zona", "✅"],
          [myZoneCollections.filter(c => String(c.status ?? "").toLowerCase().includes("confirmada")).length, "Confirmadas", "✅"],
          [myZoneReports.length, "Incidencias en mi zona", "🚨"],
          [myZoneReports.filter(r => !String(r.status ?? "").toLowerCase().includes("resuelto")).length, "Incidencias abiertas", "🟡"],
          ...(myTruck ? [
            [myZoneCollections.reduce((sum, c) => sum + (Number(c.kg) || 0), 0), "Kg recolectados hoy", "⚖️"],
            [`${myTruck.code} - ${myTruck.status}`, "Mi camión", "🚛"],
          ] : []),
          ...(monitor.performance ? [
            [monitor.performance.delayed_routes, "Rutas con retraso", "⏱️"],
            [`${monitor.performance.average_progress}%`, "Progreso medio", "📈"],
            [monitor.performance.compliance_estimate, "Índice de cumplimiento", "✅"],
          ] : []),
        ]
      : [
          [effectiveData.analytics.zones, "Zonas Activas", "🗺️"],
          [effectiveData.analytics.active_trucks, "Camiones en Ruta", "🚛"],
          [effectiveData.analytics.open_reports, "Alertas Pendientes", "🚨"],
          [`${effectiveData.analytics.confirmed_collections}/${effectiveData.collections.length}`, "Recolecciones", "✅"],
          ...(monitor.performance ? [
            [monitor.performance.delayed_routes, "Rutas con retraso", "⏱️"],
            [`${monitor.performance.average_progress}%`, "Progreso medio", "📈"],
            [monitor.performance.compliance_estimate, "Índice de cumplimiento", "✅"]
          ] : [])
        ]),
  ];

  const conductorZone = String(session.zone ?? "").toLowerCase();
  const conductorTruckCode = String(myTruck?.code ?? "").toLowerCase();

  const dispatchBoard = useMemo(() => {
    if (isCitizen) return [];
    if (monitor.truck_assignments?.length) {
      const allAssignments = monitor.truck_assignments.map((assignment, index) => ({
        hour: `${String(8 + index).padStart(2, "0")}:00`,
        zone: assignment.zone,
        truck: assignment.truck_code,
        action: assignment.action ?? `Atender ${assignment.zone}`,
        status: index === tick % 3 ? "En curso" : index < tick % 3 ? "Completado" : "Programado"
      }));
      if (isConductor) {
        const zoneFiltered = allAssignments.filter(a => String(a.zone ?? "").toLowerCase() === conductorZone);
        if (zoneFiltered.length) return zoneFiltered.slice(0, 3);
      }
      return allAssignments.slice(0, 3);
    }

    const prioritized = [...(effectiveData.prioritized_zones ?? [])].sort((a, b) => b.priority_score - a.priority_score);
    const allRoutes = [...(effectiveData.optimized_routes ?? effectiveData.routes ?? [])].sort((a, b) => {
      const aUrgency = /retraso/i.test(a.delay) || a.progress < 40 ? 1 : 0;
      const bUrgency = /retraso/i.test(b.delay) || b.progress < 40 ? 1 : 0;
      return bUrgency - aUrgency || b.progress - a.progress;
    });

    const filteredRoutes = isConductor && conductorTruckCode
      ? allRoutes.filter(r => String(r.truck ?? "").toLowerCase() === conductorTruckCode)
      : allRoutes;

    const activeSchedules = (effectiveData.schedules ?? []).filter(s =>
      !isConductor || !conductorZone || String(s.zone ?? "").toLowerCase() === conductorZone
    ).slice(0, 3);
    const scheduleBased = activeSchedules.length > 0
      ? activeSchedules.map((s, index) => ({
          hour: (s.time || "").split(" - ")[0] ?? `${String(8 + index).padStart(2, "0")}:00`,
          zone: s.zone,
          truck: filteredRoutes[index]?.truck ?? effectiveData.trucks[index]?.code ?? `C-${index + 1}`,
          action: `Recolección: ${s.waste}`,
        }))
      : (effectiveData.zones ?? []).filter(z =>
          !isConductor || !conductorZone || String(z.name ?? "").toLowerCase() === conductorZone
        ).slice(0, 3).map((zone, index) => ({
          hour: `${String(8 + index).padStart(2, "0")}:00`,
          zone: zone.name,
          truck: filteredRoutes[index]?.truck ?? effectiveData.trucks[index]?.code ?? `C-${index + 1}`,
          action: "Despacho inicial",
        }));

    return scheduleBased.map((step, index) => ({
      ...step,
      status: index === tick % 3 ? "En curso" : index < tick % 3 ? "Completado" : "Programado"
    }));
  }, [monitor.truck_assignments, effectiveData.prioritized_zones, effectiveData.optimized_routes, effectiveData.routes, effectiveData.schedules, effectiveData.zones, effectiveData.trucks, tick, isCitizen, isConductor, conductorZone, conductorTruckCode]);

  const alerts = useMemo(() => {
    if (isCitizen) return [];
    const allAlerts = (monitor.alerts ?? []).map((alert, index) => ({
      id: index,
      icon: String(alert ?? "").toLowerCase().includes("retraso") ? "🚛" : "🔔",
      title: alert ?? "Alerta",
      description: alert ?? "Alerta",
      time: "Ahora",
      status: String(alert ?? "").toLowerCase().includes("retraso") ? "pendiente" : "activo"
    }));
    if (isConductor && conductorZone && myTruck) {
      const truckPrefix = `${String(myTruck.code ?? "")}`;
      const zonePrefix = String(session.zone ?? "");
      return allAlerts.filter(alert =>
        String(alert.title ?? "").toLowerCase().includes(truckPrefix.toLowerCase()) ||
        String(alert.title ?? "").toLowerCase().includes(zonePrefix.toLowerCase()) ||
        String(alert.description ?? "").toLowerCase().includes(truckPrefix.toLowerCase()) ||
        String(alert.description ?? "").toLowerCase().includes(zonePrefix.toLowerCase())
      );
    }
    return allAlerts;
  }, [monitor.alerts, isCitizen, isConductor, conductorZone, myTruck, session.zone]);

  const interventionPlan = useMemo(() => {
    const all = effectiveData.intervention_plan ?? [];
    if (isConductor && conductorZone) {
      const filtered = all.filter(step => {
        const stepZone = String(step.zone ?? "").toLowerCase();
        const stepRoute = String(step.route ?? "").toLowerCase();
        const detail = String(step.detail ?? "").toLowerCase();
        return stepZone === conductorZone || stepRoute.includes(conductorZone) || detail.includes(conductorZone);
      });
      return filtered.length > 0 ? filtered : all;
    }
    return all;
  }, [effectiveData.intervention_plan, isConductor, conductorZone]);

  const citizenAlerts = useMemo(() => {
    if (!isCitizen) return [];
    const items: Array<{ id: string | number; icon: string; title: string; description: string; time: string; tone: string }> = [];
    const unreadNotifications = ((data.notifications ?? []) as Array<Record<string, any>>).filter(n => {
      const message = String(n.message ?? n.title ?? "").toLowerCase();
      const title = String(n.title ?? "").toLowerCase();
      const zone = String(session.zone ?? "").toLowerCase();
      return !zone || message.includes(zone) || title.includes(zone) || message.includes("ciudadano") || message.includes("zona");
    });
    if (unreadNotifications.length > 0) {
      unreadNotifications.slice(0, 3).forEach((notification, index) => {
        items.push({
          id: `notification-${index}`,
          icon: "🔔",
          title: String(notification.title ?? "Notificación"),
          description: String(notification.message ?? ""),
          time: String(notification.created_at ?? "Ahora"),
          tone: "info"
        });
      });
    }
    if (pendingCollections.length > 0) {
      items.push({
        id: "pending-collections",
        icon: "✅",
        title: "Recolecciones pendientes",
        description: `Tienes ${pendingCollections.length} recolección(es) pendiente(s) de confirmar en tu zona.`,
        time: "Ahora",
        tone: "warning"
      });
    }
    if (pendingReports.length >= 3) {
      items.push({
        id: "pending-reports",
        icon: "🚨",
        title: "Reportes pendientes",
        description: `Tienes ${pendingReports.length} reportes pendientes. Sigue su estado desde la vista de reportes.`,
        time: "Ahora",
        tone: pendingReports.length >= 5 ? "danger" : "warning"
      });
    }
    return items;
  }, [isCitizen, data.notifications, session.zone, pendingCollections.length, pendingReports.length]);

  const recommendation = useMemo(() => {
    if (pendingCollections.length > 0) return "Confirma tus recolecciones pendientes para mantener actualizado el estado del servicio en tu zona.";
    if (pendingReports.length > 0) return "Tus reportes están siendo atendidos. Puedes consultar su estado en la sección 'Mis reportes'.";
    return "Todo en orden en tu zona. Sigue reportando incidencias para mejorar el servicio municipal.";
  }, [pendingCollections.length, pendingReports.length]);

  if (isCitizen) {
    return (
      <>
        <div className="metrics-grid citizen-summary-grid">
          <div className="metric-card citizen-hero-card">
            <span className="metric-icon" aria-hidden="true">👤</span>
            <div className="metric-content">
              <strong className="metric-value">{session.name}</strong>
              <span className="metric-label">Ciudadano · {zoneSummary}</span>
            </div>
          </div>
          <div className="metric-card" role="button" tabIndex={0} onClick={() => handleMetricClick("Reportes pendientes")} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMetricClick("Reportes pendientes"); }}>
            <span className="metric-icon" aria-hidden="true">🧾</span>
            <div className="metric-content">
              <strong className="metric-value">{pendingReports.length}</strong>
              <span className="metric-label">Reportes pendientes</span>
            </div>
          </div>
          <div className="metric-card" role="button" tabIndex={0} onClick={() => handleMetricClick("Recolecciones pendientes")} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMetricClick("Recolecciones pendientes"); }}>
            <span className="metric-icon" aria-hidden="true">✅</span>
            <div className="metric-content">
              <strong className="metric-value">{pendingCollections.length}</strong>
              <span className="metric-label">Recolecciones pendientes</span>
            </div>
          </div>
          <div className="metric-card" role="button" tabIndex={0} onClick={() => handleMetricClick("Reportes resueltos")} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMetricClick("Reportes resueltos"); }}>
            <span className="metric-icon" aria-hidden="true">👍</span>
            <div className="metric-content">
              <strong className="metric-value">{myReports.filter(r => String(r.status ?? "").toLowerCase().includes("resuelto")).length}</strong>
              <span className="metric-label">Reportes resueltos</span>
            </div>
          </div>
          <div className="metric-card" role="button" tabIndex={0} onClick={() => handleMetricClick("Recolecciones en mi zona")} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMetricClick("Recolecciones en mi zona"); }}>
            <span className="metric-icon" aria-hidden="true">📍</span>
            <div className="metric-content">
              <strong className="metric-value">{zoneSummary}</strong>
              <span className="metric-label">Mi zona</span>
            </div>
          </div>
          <div className="metric-card" role="button" tabIndex={0} onClick={() => handleMetricClick("Mis reportes")} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMetricClick("Mis reportes"); }}>
            <span className="metric-icon" aria-hidden="true">🧮</span>
            <div className="metric-content">
              <strong className="metric-value">{myReports.length}</strong>
              <span className="metric-label">Mis reportes</span>
            </div>
          </div>
        </div>

        <div className="dashboard-role-row">
          <span className="dashboard-role-badge" aria-label={`Rol activo: ${session.role}`}>
            {session.role}
          </span>
        </div>

        <div className="dashboard-sections citizen-dashboard-grid">
          <section className="panel">
            <h2>📍 Mi zona y seguimiento</h2>
            <div className="citizen-card-list">
              <div className="citizen-info-card">
                <strong>{zoneSummary}</strong>
                <p>Tu zona cuenta con atención prioritaria y seguimiento del equipo municipal.</p>
              </div>
              <div className="citizen-info-card">
                <strong>Próximos pasos</strong>
                <p>{recommendation}</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>🧾 Mis reportes</h2>
            <div className="list">
              {myReports.length === 0 ? (
                <p className="empty-state">Aún no has enviado reportes. Puedes crear uno desde la vista de reportes.</p>
              ) : (
                myReports.map(report => (
                  <article className="item" key={report.id}>
                    <div className="item-row">
                      <strong>{report.type}</strong>
                      <span className={`tag ${statusTone(report.status)}`}>{report.status}</span>
                    </div>
                    <span>{report.zone}</span>
                    <p>{report.detail}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          {pendingCollections.length > 0 && (
            <section className="panel">
              <h2>✅ Recolecciones pendientes</h2>
              <div className="list">
                {pendingCollections.map(collection => (
                  <article className="item" key={collection.id}>
                    <div className="item-row">
                      <strong>{collection.zone}</strong>
                      <span className="tag blue">{collection.status}</span>
                    </div>
                    <span>{collection.truck} · {collection.kg} kg</span>
                    <p>{collection.date}</p>
                    {onConfirmCollection && (
                      <div className="item-actions">
                        <button type="button" className="report-action-btn" onClick={() => void onConfirmCollection(collection.id)}>
                          Confirmar recolección
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <h2>📋 Mis recolecciones</h2>
            <div className="list">
              {safeCollections.length === 0 ? (
                <p className="empty-state">Aún no hay recolecciones registradas en tu zona.</p>
              ) : (
                safeCollections.map(collection => (
                  <article className="item" key={collection.id}>
                    <div className="item-row">
                      <strong>{collection.zone}</strong>
                      <span className={`tag ${String(collection.status).toLowerCase().includes("confirmada") ? "blue" : "yellow"}`}>{collection.status}</span>
                    </div>
                    <span>{collection.truck} · {collection.kg} kg</span>
                    <p>{collection.date}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          {citizenAlerts.length > 0 && (
            <section className="panel">
              <h2>🔔 Alertas y notificaciones</h2>
              <div className="alerts-list">
                {citizenAlerts.map(alert => (
                  <div className={`alert-item alert-${alert.tone === "danger" ? "activo" : alert.tone === "warning" ? "pendiente" : "resuelto"}`} key={alert.id}>
                    <div className="alert-icon" aria-hidden="true">{alert.icon}</div>
                    <div className="alert-content">
                      <h4>{alert.title}</h4>
                      <p>{alert.description}</p>
                      <span className="alert-time">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <h2>💡 Recomendaciones del sistema</h2>
            <div className="citizen-card-list">
              <div className="citizen-info-card">
                <strong>Registra incidencias</strong>
                <p>Reporta residuos, contenedores llenos o problemas de limpieza para recibir apoyo rápido.</p>
              </div>
              <div className="citizen-info-card">
                <strong>Revisa el estado</strong>
                <p>Tu historial queda disponible para que puedas verificar qué se ha atendido y qué falta.</p>
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }

  const metricViewMap: Record<string, View> = {
    "Reportes pendientes": "reports",
    "Recolecciones pendientes": "dashboard",
    "Reportes resueltos": "reports",
    "Recolecciones en mi zona": "dashboard",
    "Mis reportes": "reports",
    "Zonas Activas": "dashboard",
    "Camiones en Ruta": "routes",
    "Alertas Pendientes": "reports",
    "Recolecciones": "routes",
    "Rutas con retraso": "routes",
    "Progreso medio": "dashboard",
    "Índice de cumplimiento": "analytics",
    "Usuarios registrados": "admin",
    "Camiones en mantenimiento": "admin",
  };

  const handleMetricClick = useCallback((label: string) => {
    const targetView = metricViewMap[label];
    if (targetView && targetView !== view) {
      setView(targetView);
    }
  }, [view]);

  return (
    <>
      <div className="metrics-grid">
        {metrics.map(([value, label, icon]) => (
          <div className="metric-card" key={label as string} role="button" tabIndex={0} onClick={() => handleMetricClick(label as string)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMetricClick(label as string); }}>
            <span className="metric-icon" aria-hidden="true">{icon}</span>
            <div className="metric-content">
              <strong className="metric-value">{value}</strong>
              <span className="metric-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-role-row">
        <span className="dashboard-role-badge" aria-label={`Rol activo: ${session.role}`}>
          {session.role}
        </span>
      </div>

      {isConductor && myTruck && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <h2>🚛 Mi camión</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-icon" aria-hidden="true">🚚</span>
              <div className="metric-content">
                <strong className="metric-value">{myTruck.code}</strong>
                <span className="metric-label">Código de camión</span>
              </div>
            </div>
            <Metric value={myTruck.status} label="Estado" />
            <Metric value={myTruck.zone} label="Zona asignada" />
            <Metric value={zoneSummary} label="Crítica" />
          </div>
          {(() => {
            const myRoute = (effectiveData.optimized_routes ?? effectiveData.routes ?? []).find(
              r => String(r.truck ?? "").toLowerCase() === String(myTruck.code ?? "").toLowerCase()
            );
            return myRoute ? (
              <div style={{ marginTop: 12 }}>
                <Item
                  title="Ruta asignada"
                  detail={`Avance ${myRoute.progress}% | ETA ${myRoute.eta} | ${myRoute.delay}`}
                  color={String(myRoute.delay ?? "").toLowerCase().includes("retraso") ? "yellow" : "blue"}
                />
              </div>
            ) : (
              <p style={{ color: "var(--muted)", marginTop: 12, padding: "8px 0" }}>Sin ruta activa asignada a tu camión.</p>
            );
          })()}
          {myZoneCollections.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Item
                title="Última recolección"
                detail={`${myZoneCollections[0].truck} · ${myZoneCollections[0].kg} kg · ${myZoneCollections[0].status}`}
                color="blue"
              />
            </div>
          )}
        </section>
      )}

      <div className="dashboard-sections">
        <section className="panel panel-large">
          <h2>🗺️ Mapa Operativo</h2>
          <Map zones={data.zones} trucks={effectiveData.trucks} routes={effectiveData.optimized_routes ?? effectiveData.routes} prioritizedZones={effectiveData.prioritized_zones ?? []} />
        </section>
        <section className="panel panel-alerts">
          <div className="alerts-header">
            <h2>📋 Tablero de despacho</h2>
            <span className="alert-count">{dispatchBoard.length} asignaciones</span>
          </div>
          <div className="alerts-list">
            {dispatchBoard.map(step => (
              <div className={`alert-item alert-${step.status === "En curso" ? "activo" : step.status === "Programado" ? "pendiente" : "resuelto"}`} key={step.hour}>
                <div className="alert-icon" aria-hidden="true">🚛</div>
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
            <span className="alert-count">{interventionPlan.length}</span>
          </div>
          <div className="alerts-list">
            {interventionPlan.map((step, index) => (
              <div className="alert-item alert-activo" key={`${step.title}-${index}`}>
                <div className="alert-icon">✅</div>
                <div className="alert-content">
                  <h4>{step.title}</h4>
                  <p>{step.detail}</p>
                  <span className="alert-time">Prioridad {step.priority}</span>
                </div>
              </div>
            ))}
            {interventionPlan.length === 0 && (
              <p style={{ color: "var(--muted)", padding: "12px 0" }}>No hay acciones de intervención prioritarias definidas.</p>
            )}
          </div>
        </section>

{isAdmin && (
         <section className="panel panel-alerts">
           <div className="alerts-header">
             <h2>🔧 Estado del sistema</h2>
             <span className="alert-count">{data.users?.length ?? 0} usuarios · {data.zones?.length ?? 0} zonas · {data.trucks?.length ?? 0} camiones</span>
           </div>
           <div className="alerts-list">
             <Item title="Base de datos" detail={`Modo: ${health?.connected ? "Producción (PostgreSQL)" : health ? "Demo (memoria)" : "Desconectado"}`} color="blue" />
             <Item title="Última sincronización" detail={lastSync || new Date().toLocaleString("es-PE")} color="blue" />
             <Item title="Reportes abiertos" detail={`${effectiveData.analytics.open_reports} incidencias pendientes`} color={effectiveData.analytics.open_reports > 2 ? "red" : "blue"} />
             <Item title="Rutas con retraso" detail={`${monitor.performance?.delayed_routes ?? 0} rutas afectadas`} color={(monitor.performance?.delayed_routes ?? 0) > 0 ? "yellow" : "blue"} />
             <Item title="Contenedores críticos" detail={`${(effectiveData.containers ?? []).filter((c: any) => c.fill_level >= 85).length} con llenado ≥ 85%`} color={(effectiveData.containers ?? []).filter((c: any) => c.fill_level >= 85).length > 0 ? "red" : "blue"} />
           </div>
         </section>
       )}
       {alerts.length > 0 && (
         <section className="panel panel-alerts">
           <div className="alerts-header">
             <h2>⚠️ Alertas Activas</h2>
             <span className="alert-count">{alerts.length}</span>
           </div>
           <div className="alerts-list">
             {alerts.map(alert => (
               <div className={`alert-item alert-${alert.status}`} key={`alert-${alert.id}-${alert.title}`}>
                 <div className="alert-icon" aria-hidden="true">{alert.icon}</div>
                 <div className="alert-content">
                   <h4>{alert.title}</h4>
                   <p>{alert.description}</p>
                   <span className="alert-time">{alert.time}</span>
                 </div>
                 <span className={`alert-status alert-status-${alert.status}`} aria-label={`Estado: ${alert.status}`}>
                   {alert.status === "activo" ? "🔴" : alert.status === "pendiente" ? "🟡" : "🟢"}
                 </span>
               </div>
             ))}
             {alerts.length === 0 && (
               <p style={{ color: "var(--muted)", padding: "12px 0", textAlign: "center" }}>
                 No hay alertas activas en este momento.
               </p>
             )}
           </div>
         </section>
       )}
      </div>
    </>
  );
}

function Schedules({ schedules, citizenZone }: { schedules: Schedule[]; citizenZone?: string }) {
  const [search, setSearch] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Todos"]);
  const [sortBy, setSortBy] = useState<"zone" | "day" | "time" | "waste">("zone");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [countdown, setCountdown] = useState<string>("");

  const filtered = useMemo(() => {
    return schedules.filter(s => {
      const matchSearch = String(s.zone ?? "").toLowerCase().includes(String(search ?? "").toLowerCase());
      const matchDay = selectedDays.includes("Todos") || selectedDays.some(d => s.day.toLowerCase().includes(d.toLowerCase()));
      return matchSearch && matchDay;
    });
  }, [schedules, search, selectedDays]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String(a[sortBy] ?? "").toLowerCase();
      const bv = String(b[sortBy] ?? "").toLowerCase();
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir]);

  useEffect(() => {
    const computeCountdown = () => {
      if (!citizenZone) { setCountdown(""); return; }
      const zone = String(citizenZone).toLowerCase();
      const now = new Date();
      const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      const today = dayNames[now.getDay()];
      const matching = schedules.filter(s =>
        String(s.zone ?? "").toLowerCase() === zone && s.day.toLowerCase().includes(today)
      );
      if (matching.length === 0) { setCountdown(""); return; }
      const [hours, minutes] = matching[0].time.split(":").map(Number);
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    computeCountdown();
    const interval = window.setInterval(computeCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [schedules, citizenZone]);

  const days = useMemo(() => ["Todos", ...new Set(schedules.map(s => s.day))], [schedules]);

  const citizenSchedules = useMemo(() => {
    if (!citizenZone) return [];
    const zone = String(citizenZone).toLowerCase();
    return schedules.filter(s => String(s.zone ?? "").toLowerCase() === zone);
  }, [schedules, citizenZone]);

  function handleSort(field: "zone" | "day" | "time" | "waste") {
    if (sortBy === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  const sortIcon = (field: string) => sortBy === field ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <section className="panel">
      {citizenSchedules.length > 0 && (
        <div className="citizen-schedule-banner">
          <span className="citizen-schedule-icon">📅</span>
          <div className="citizen-schedule-content">
            <strong>Recolecciones en tu zona</strong>
            {countdown && <p className="countdown">⏰ Próxima recolección en: {countdown}</p>}
            {citizenSchedules.map(s => (
              <p key={s.id}>{s.day} · {s.time} · {s.waste}</p>
            ))}
          </div>
        </div>
      )}
      <div className="panel-header">
        <h2>Consulta por zona</h2>
        <div className="panel-actions">
          <button className="export-btn" onClick={() => exportToCSV("horarios", sorted)}>
            📥 Exportar CSV
          </button>
          <button className="export-btn" onClick={() => exportToPDF("Horarios", sorted.map(s => `<div class="report-card"><h2>${s.zone}</h2><p><strong>Día:</strong> ${s.day}</p><p><strong>Hora:</strong> ${s.time}</p><p><strong>Tipo:</strong> ${s.waste}</p></div>`).join(""))}>
            📄 Exportar PDF
          </button>
        </div>
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
             className={`filter-btn ${selectedDays.includes(day) ? "active" : ""}`}
             onClick={() => {
               if (day === "Todos") {
                 setSelectedDays(["Todos"]);
               } else {
                 setSelectedDays(prev => {
                   const next = prev.filter(d => d !== "Todos");
                   return next.includes(day) ? next.filter(d => d !== day) : [...next, day];
                 });
               }
             }}
             aria-pressed={selectedDays.includes(day)}
           >
             {day}
           </button>
         ))}
       </div>

      <div className="list" role="list" aria-label="Lista de horarios">
        {sorted.length === 0 ? (
          <p className="empty-state">No hay horarios que coincidan con tu búsqueda</p>
        ) : (
          sorted.map(item => (
            <Item
              key={item.id}
              title={item.zone}
              detail={`${item.day} · ${item.time} · ${item.waste}`}
              color="blue"
              tag={item.waste}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function Reports({ data, session, onCreateReport, onResolveReport }: { data: Bootstrap; session: Session; onCreateReport: (report: Omit<Report, "id" | "status">) => Promise<void>; onResolveReport: (id: number) => Promise<void>; }) {
  const [submitting, setSubmitting] = useState(false);
  const [formZone, setFormZone] = useState(() => String(session.zone ?? "").trim());
  const [formType, setFormType] = useState("");
  const [formDetail, setFormDetail] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [priority, setPriority] = useState("Media");
  const [assignedTruck, setAssignedTruck] = useState<number | "">("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedDetail = formDetail.trim();
    if (!formZone || !formType || !trimmedDetail) {
      setFormError("Completa zona, tipo y detalle para enviar el reporte.");
      return;
    }

setSubmitting(true);
      setFormError("");
      const isDuplicate = safeReports.some(r =>
        String(r.citizen ?? "").toLowerCase() === String(session.name ?? "").toLowerCase() &&
        String(r.zone ?? "").toLowerCase() === String(formZone).toLowerCase() &&
        String(r.type ?? "").toLowerCase() === String(formType).toLowerCase() &&
        !String(r.status ?? "").toLowerCase().includes("resuelto")
      );
      if (isDuplicate) {
        setFormError("Ya existe un reporte similar pendiente o en revisión para esta zona y tipo. Verifica antes de enviar otro.");
        setSubmitting(false);
        return;
      }
      try {
        await onCreateReport({
          citizen: session.name,
          zone: formZone,
          type: formType,
          detail: trimmedDetail,
          priority,
          assigned_truck: assignedTruck !== "" ? assignedTruck : undefined
        } as Omit<Report, "id" | "status">);
      setFormZone(String(session.zone ?? "").trim());
      setFormType("");
      setFormDetail("");
      event.currentTarget.reset();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo enviar el reporte.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }
  const isCitizen = session.role === "ciudadano";
  const isOperator = session.role === "operador";
  const isAdmin = session.role === "admin";
  const canResolve = isOperator || isAdmin;
  const canCreateReport = isCitizen;
  const isForeignZone = isCitizen && formZone && session.zone && String(formZone).trim().toLowerCase() !== String(session.zone).trim().toLowerCase();

  const reportTypes = useMemo(() => {
    const types = new Set<string>();
    const reports = Array.isArray(data?.reports) ? data.reports : [];
    reports.forEach(r => {
      if (r.type) types.add(r.type);
    });
    const schedules = Array.isArray(data?.schedules) ? data.schedules : [];
    schedules.forEach(s => {
      extractWasteTypes(s.waste).forEach(t => types.add(t));
    });
    return ["Acumulacion de basura", "Retraso", "Contenedor lleno", "Otro", ...Array.from(types)];
  }, [data?.reports, data?.schedules]);

  const safeReports = useMemo(() => (Array.isArray(data.reports) ? data.reports : []), [data.reports]);
  const safeZones = useMemo(() => (Array.isArray(data.zones) ? data.zones : []), [data.zones]);
  const safeTrucks = useMemo(() => (Array.isArray(data.trucks) ? data.trucks : []), [data.trucks]);

  const filteredReports = useMemo(() => {
    const roleFilteredReports = isCitizen
      ? safeReports.filter(report => String(report.citizen ?? "").toLowerCase() === String(session.name ?? "").toLowerCase())
      : safeReports;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return roleFilteredReports.filter(report => {
      if (filterStatus !== "Todos") {
        const reportStatus = String(report.status ?? "").toLowerCase().replace(/\s+/g, " ");
        const normalizedFilter = filterStatus.trim().toLowerCase().replace(/\s+/g, " ");
        if (reportStatus !== normalizedFilter) {
          return false;
        }
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [report.type, report.zone, report.citizen, report.detail].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [safeReports, filterStatus, searchQuery, isCitizen, session.name]);

  const exportReportsCSV = useCallback(() => {
    exportToCSV("reportes", filteredReports.length > 0 ? filteredReports : safeReports);
  }, [filteredReports, safeReports]);

  const exportReportsPDF = useCallback(() => {
    const source = filteredReports.length > 0 ? filteredReports : safeReports;
    exportToPDF("Reportes", source.map(report => `<div class="report-card"><h2>${escapeHtml(report.type)}</h2><div class="tag ${statusTone(report.status)}">${escapeHtml(report.status)}</div><p><strong>Zona:</strong> ${escapeHtml(report.zone)}</p><p><strong>Ciudadano:</strong> ${escapeHtml(report.citizen)}</p><p>${escapeHtml(report.detail)}</p></div>`).join(""));
  }, [filteredReports, safeReports]);

  return (
    <div className="two-col">
<section className="panel">
         <h2>Registrar incidencia</h2>
         {canCreateReport ? (
           <form className="form-grid" onSubmit={submit}>
             <label htmlFor="report-zone">Zona</label>
             <select id="report-zone" name="zone" value={formZone} onChange={e => setFormZone(e.target.value)}>
               <option value="">Seleccionar zona</option>
               {safeZones.map(zone => <option key={zone.id} value={zone.name}>{zone.name}</option>)}
             </select>
             {isForeignZone && <p className="hint warning wide" role="status">Estas reportando en una zona diferente a la tuya asignada ({session.zone}).</p>}
             <label htmlFor="report-type">Tipo</label>
             <select id="report-type" name="type" value={formType} onChange={e => setFormType(e.target.value)}>
               <option value="">Seleccionar tipo</option>
               {reportTypes.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
<label className="wide" htmlFor="report-detail">Detalle</label>
              <textarea id="report-detail" name="detail" required minLength={8} maxLength={600} placeholder="Describe el problema encontrado" value={formDetail} onChange={e => setFormDetail(e.target.value)} />
              <label htmlFor="report-priority">Prioridad</label>
              <select id="report-priority" name="priority" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
              <label htmlFor="report-truck">Asignar camión</label>
              <select id="report-truck" name="truck" value={assignedTruck} onChange={e => setAssignedTruck(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Sin asignar</option>
                {safeTrucks.map(t => <option key={t.id} value={t.id}>{`${t.code} - ${t.driver}`}</option>)}
              </select>
              {formError && <p className="hint error wide" role="alert">{formError}</p>}
              <button type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Enviar reporte"}</button>
           </form>
         ) : (
           <p className="hint">Solo los ciudadanos pueden registrar incidencias. Los operadores y administradores pueden resolverlas desde la lista de seguimiento.</p>
         )}
       </section>
      <section className="panel">
        <div className="panel-header">
          <h2>{isCitizen ? "Mis reportes" : "Seguimiento"}</h2>
          <div className="panel-actions">
            <button type="button" className="export-btn" onClick={exportReportsCSV}>
              📥 Exportar reportes CSV
            </button>
            <button type="button" className="export-btn" onClick={exportReportsPDF}>
              📄 Exportar reportes PDF
            </button>
          </div>
        </div>
        {isCitizen && <p className="hint">Como ciudadano, esta vista muestra solo tus reportes.</p>}
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Buscar reporte..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Buscar reportes" />
        </div>
        <div className="filter-bar">
          {["Todos", "Pendiente", "En revision", "Resuelto"].map(status => (
            <button key={status} type="button" className={`filter-btn ${filterStatus === status ? "active" : ""}`} onClick={() => setFilterStatus(status)} aria-pressed={filterStatus === status}>{status}</button>
          ))}
        </div>
<ReportList reports={filteredReports} trucks={safeTrucks} showDriverFilter={!isCitizen} showResolve={canResolve} onResolveReport={onResolveReport} onViewDetail={setSelectedReport} />
       </section>

       {showDetail && selectedReport && (
         <div className="modal-overlay" onClick={() => { setShowDetail(false); setSelectedReport(null); }}>
           <div className="modal" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
               <h2>Detalle del reporte #{selectedReport.id}</h2>
               <button type="button" className="modal-close" onClick={() => { setShowDetail(false); setSelectedReport(null); }}>✕</button>
             </div>
             <div className="modal-body">
               <p><strong>Tipo:</strong> {selectedReport.type ?? "Sin tipo"}</p>
               <p><strong>Zona:</strong> {selectedReport.zone ?? "Sin zona"}</p>
               <p><strong>Ciudadano:</strong> {selectedReport.citizen ?? "Sin ciudadano"}</p>
               <p><strong>Estado:</strong> <span className={`tag ${statusTone(selectedReport.status)}`}>{selectedReport.status ?? "Sin estado"}</span></p>
               <p><strong>Prioridad:</strong> {(selectedReport as any).priority ?? "Media"}</p>
               {(selectedReport as any).assigned_truck && <p><strong>Camión asignado:</strong> {(selectedReport as any).assigned_truck}</p>}
               <p><strong>Detalle:</strong> {selectedReport.detail ?? "Sin detalle"}</p>
               {(selectedReport as any).resolved_at && <p><strong>Resuelto el:</strong> {new Date((selectedReport as any).resolved_at).toLocaleString("es-PE")}</p>}
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }

export function Waste({ data, monitor, session, onCreateReport }: { data: Bootstrap; monitor: Monitor; session?: Session | null; onCreateReport?: (report: Omit<Report, "id" | "status">) => Promise<void>; }) {
  const safeData = data ?? emptyBootstrap;
  const safeSchedules = useMemo(() => (Array.isArray(safeData.schedules) ? safeData.schedules : []), [safeData.schedules]);
  const safeContainers = useMemo(() => (Array.isArray(monitor.containers) ? monitor.containers : Array.isArray(safeData.containers) ? safeData.containers : []), [monitor.containers, safeData.containers]);
  const safeZones = useMemo(() => (Array.isArray(safeData.zones) ? safeData.zones : []), [safeData.zones]);
  const isCitizen = session?.role === "ciudadano";
  const canReportProblem = isCitizen || session?.role === "operador" || session?.role === "admin";
  const citizenZone = session?.zone ?? "";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterWaste, setFilterWaste] = useState("Todos");
  const [filterZone, setFilterZone] = useState("Todos");
  const [reportingProblem, setReportingProblem] = useState(false);
  const [problemZone, setProblemZone] = useState(() => String(session?.zone ?? "").trim());
  const [problemDetail, setProblemDetail] = useState("");
  const [problemSubmitting, setProblemSubmitting] = useState(false);
  const [problemMessage, setProblemMessage] = useState("");

  const wasteTypes = useMemo(() => {
    const types = new Set<string>();
    safeSchedules.forEach(s => {
      extractWasteTypes(s.waste).forEach(t => {
        const trimmed = t.trim();
        if (trimmed) types.add(trimmed);
      });
    });
    return ["Todos", ...Array.from(types).sort()];
  }, [safeSchedules]);

  const zones = useMemo(() => {
    const zoneSet = new Set<string>();
    safeSchedules.forEach(s => zoneSet.add(s.zone));
    return ["Todos", ...Array.from(zoneSet).sort()];
  }, [safeSchedules]);

  const filteredSchedules = useMemo(() => {
    return safeSchedules.filter(s => {
      const matchWaste = filterWaste === "Todos" || s.waste.toLowerCase().includes(filterWaste.toLowerCase());
      const matchZone = filterZone === "Todos" || s.zone.toLowerCase() === filterZone.toLowerCase();
      const matchSearch = searchQuery.trim() === "" || s.zone.toLowerCase().includes(searchQuery.trim().toLowerCase()) || s.waste.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchWaste && matchZone && matchSearch;
    });
  }, [safeSchedules, filterWaste, filterZone, searchQuery]);

  const wasteStats = useMemo(() => {
    const stats: Record<string, { count: number; zones: string[] }> = {};
    safeSchedules.forEach(s => {
      extractWasteTypes(s.waste).forEach(t => {
        if (!stats[t]) stats[t] = { count: 0, zones: [] };
        stats[t].count++;
        if (!stats[t].zones.includes(s.zone)) stats[t].zones.push(s.zone);
      });
    });
    return stats;
  }, [safeSchedules]);

  const containerStats = useMemo(() => {
    const total = safeContainers.length;
    const full = safeContainers.filter(c => String(c.status).toLowerCase() === "lleno").length;
    const avgFill = total > 0 ? Math.round(safeContainers.reduce((sum, c) => sum + (Number(c.fill_level) || 0), 0) / total) : 0;
    return { total, full, avgFill };
  }, [safeContainers]);

  const citizenSchedules = useMemo(() => {
    if (!isCitizen || !citizenZone) return safeSchedules;
    return safeSchedules.filter(s => s.zone.toLowerCase() === citizenZone.toLowerCase());
  }, [isCitizen, citizenZone, safeSchedules]);

  const displaySchedules = isCitizen ? citizenSchedules : filteredSchedules;

  async function submitProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreateReport || !problemZone || !problemDetail.trim()) {
      setProblemMessage("Completa la zona y el detalle del problema.");
      return;
    }
    setProblemSubmitting(true);
    setProblemMessage("");
    try {
      await onCreateReport({
        citizen: session?.name ?? "Operador",
        zone: problemZone,
        type: "Clasificación",
        detail: problemDetail.trim()
      });
      setProblemMessage("Problema de clasificación reportado correctamente.");
      setProblemZone(String(session?.zone ?? "").trim());
      setProblemDetail("");
      setReportingProblem(false);
    } catch (error) {
      setProblemMessage("No se pudo reportar el problema. Intentalo de nuevo.");
    } finally {
      setProblemSubmitting(false);
    }
  }

  const zoneNameById = useMemo(() => {
    const map: Record<number, string> = {};
    (safeData.zones ?? []).forEach(z => { map[z.id] = z.name; });
    return map;
  }, [safeData.zones]);

  function getWasteTag(waste: string): string {
    const lower = waste.toLowerCase();
    if (lower.includes("organico")) return "green";
    if (lower.includes("no reciclable")) return "red";
    if (lower.includes("reciclable")) return "blue";
    if (lower.includes("mixto")) return "yellow";
    return "";
  }

  return (
    <div className="waste-dashboard">
      <div className="metrics-grid">
        <Metric value={`${safeSchedules.length}`} label="Zonas con clasificacion" />
        <Metric value={`${containerStats.total}`} label="Contenedores monitoreados" />
        <Metric value={`${containerStats.full}`} label="Contenedores llenos" />
        <Metric value={`${containerStats.avgFill}%`} label="Llenado promedio" />
        <Metric value={`${Object.keys(wasteStats).length}`} label="Tipos de residuo" />
      </div>

      <div className="dashboard-sections">
        <section className="panel">
          <div className="panel-header">
            <h2>Guia de clasificacion por zona</h2>
          {canReportProblem && (
            <button type="button" className="export-btn" onClick={() => setReportingProblem(true)}>
              Reportar problema de clasificacion
            </button>
          )}
          </div>

          {reportingProblem && (
            <div className="panel" style={{ marginBottom: 16, padding: 16 }}>
              <h3>Reportar problema de clasificacion</h3>
              <form className="form-grid" onSubmit={submitProblem}>
                <label htmlFor="problem-zone">Zona
                  <select id="problem-zone" value={problemZone} onChange={e => setProblemZone(e.target.value)}>
                    <option value="">Seleccionar zona</option>
                    {safeZones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                  </select>
                </label>
                <label htmlFor="problem-detail">Descripcion del problema
                  <textarea id="problem-detail" value={problemDetail} onChange={e => setProblemDetail(e.target.value)} placeholder="Describe el problema de clasificacion encontrado" minLength={8} maxLength={600} />
                </label>
                {problemMessage && <p className={`hint ${problemMessage.includes("correctamente") ? "success" : "error"}`} role="alert">{problemMessage}</p>}
                <div className="form-actions">
                  <button type="submit" disabled={problemSubmitting}>{problemSubmitting ? "Enviando..." : "Enviar reporte"}</button>
                  <button type="button" className="btn-secondary" onClick={() => { setReportingProblem(false); setProblemMessage(""); }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Buscar zona o tipo de residuo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Buscar clasificacion" />
          </div>

           <div className="filter-bar">
             <select value={filterWaste} onChange={e => setFilterWaste(e.target.value)} aria-label="Filtrar por tipo de residuo" className="waste-filter-select">
               {wasteTypes.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
             <select value={filterZone} onChange={e => setFilterZone(e.target.value)} aria-label="Filtrar por zona" className="waste-filter-select">
               {zones.map(z => <option key={z} value={z}>{z}</option>)}
             </select>
           </div>

          {displaySchedules.length === 0 ? (
            <p className="empty-state">No hay horarios de clasificacion que coincidan con los filtros.</p>
          ) : (
            <div className="list">
              {displaySchedules.map(schedule => (
                <article className="item" key={schedule.id}>
                  <div className="item-row">
                    <strong>{schedule.zone}</strong>
                    <span className={`tag ${getWasteTag(schedule.waste)}`}>{schedule.waste}</span>
                  </div>
                  <span>{schedule.day} · {schedule.time}</span>
                  <p>Tipo de residuo: {schedule.waste}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Estadisticas de residuos</h2>
          <div className="list">
            {Object.entries(wasteStats).map(([type, stat]) => (
              <div className="item" key={type}>
                <div className="item-row">
                  <strong>{type}</strong>
                  <span className={`tag ${getWasteTag(type)}`}>{stat.count} zona{stat.count !== 1 ? "s" : ""}</span>
                </div>
                <span>Zonas: {stat.zones.join(", ")}</span>
              </div>
            ))}
            {Object.keys(wasteStats).length === 0 && (
              <p className="empty-state">No hay datos de clasificacion disponibles.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Estado de contenedores</h2>
          <div className="list">
            {safeContainers.length === 0 ? (
              <p className="empty-state">No hay contenedores monitoreados.</p>
            ) : (
              safeContainers.map(container => (
                <article className="item" key={container.id}>
                  <div className="item-row">
                    <strong>{container.name}</strong>
                    <span className={`tag ${String(container.status).toLowerCase() === "lleno" ? "red" : "blue"}`}>{container.status}</span>
                  </div>
                  <span>Zona: {zoneNameById[container.zone_id] ?? `ID: ${container.zone_id}`} · {container.fill_level}% lleno</span>
                  <p>Actualizado: {container.updated_at ? new Date(container.updated_at).toLocaleString("es-PE") : "Sin fecha"}</p>
                </article>
              ))
            )}
          </div>
        </section>

         <section className="panel guia-disposicion">
           <h2>Guía de disposición</h2>
          <div className="list">
            <article className="item">
              <div className="item-row"><strong>🟢 Orgánicos</strong><span className="tag green">Compostaje</span></div>
              <p>Restos de comida, cascaras, hojas y residuos biodegradables. Depositar en contenedor verde.</p>
            </article>
            <article className="item">
              <div className="item-row"><strong>🔵 Reciclables</strong><span className="tag blue">Reciclaje</span></div>
              <p>Papel, cartón, plástico limpio, vidrio y metales separados. Depositar en contenedor azul.</p>
            </article>
            <article className="item">
              <div className="item-row"><strong>🔴 No reciclables</strong><span className="tag red">Disposición final</span></div>
              <p>Papel higiénico, tecnopor contaminado, colillas y residuos sanitarios. Depositar en contenedor gris.</p>
            </article>
          </div>
         </section>
       </div>
     </div>
   );
 }

 function Routes({ data, monitor, session, onCreateCollection }: { data: Bootstrap; monitor: Monitor; session?: Session | null; onCreateCollection?: (payload: { truck_id: number; zone_id: number; kg: number }) => Promise<void>; }) {
  const [alerts, setAlerts] = useState<string[]>([]);
  const [geoError, setGeoError] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const isConductor = session?.role === "conductor";
  const isOperatorOrAdmin = session?.role === "operador" || session?.role === "admin";
  const canRegisterCollection = isConductor || isOperatorOrAdmin || false;
  const trucks = monitor.trucks ?? data.trucks ?? [];
  const routes = monitor.optimized_routes ?? data.routes ?? [];
  const prioritizedZones = monitor.prioritized_zones ?? data.prioritized_zones ?? [];
  const safeZones = Array.isArray(data.zones) ? data.zones : [];
  const safeTrucks = Array.isArray(trucks) ? trucks : [];

  const myTruck = useMemo(() => {
    if (!session) return undefined;
    return safeTrucks.find(t => String(t.driver ?? "").trim().toLowerCase() === String(session.name ?? "").trim().toLowerCase());
  }, [safeTrucks, session?.name, session?.role]);

  const conductorZone = useMemo(() => {
    if (!session) return undefined;
    const zoneLower = String(session.zone ?? "").trim().toLowerCase();
    return safeZones.find(z => String(z.name ?? "").trim().toLowerCase() === zoneLower);
  }, [safeZones, session?.zone, session?.role]);

  const availableTrucks = useMemo(() => {
    if (isConductor && myTruck) return [myTruck];
    return safeTrucks;
  }, [isConductor, myTruck, safeTrucks]);

  const visibleRoutes = useMemo(() => {
    if (isConductor && myTruck) {
      return routes.filter(r => String(r.truck ?? "").toLowerCase() === String(myTruck.code ?? "").toLowerCase());
    }
    return routes;
  }, [routes, isConductor, myTruck]);

  const [kgValue, setKgValue] = useState(0);
  const [selectedTruck, setSelectedTruck] = useState<number | "">(myTruck?.id ?? safeTrucks[0]?.id ?? "");
  const [selectedZone, setSelectedZone] = useState<number | "">(conductorZone?.id ?? safeZones[0]?.id ?? "");
  const [submittingCollection, setSubmittingCollection] = useState(false);

useEffect(() => {
     const fetchAlerts = () => {
       fetch(`${geoBase}/alerts`).then(response => {
         if (!response.ok) throw new Error("Geo service unavailable");
         return response.json();
       }).then(payload => { setAlerts(payload.alerts ?? []); setGeoError(false); }).catch(() => { setAlerts([]); setGeoError(true); });
     };
     fetchAlerts();
     const interval = window.setInterval(fetchAlerts, 30000);
     return () => window.clearInterval(interval);
   }, []);

  useEffect(() => {
    setSelectedTruck(myTruck?.id ?? safeTrucks[0]?.id ?? "");
    setSelectedZone(conductorZone?.id ?? safeZones[0]?.id ?? "");
  }, [myTruck, conductorZone]);

  async function submitCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreateCollection) return;
    setCollectionError("");

    const truckId = Number(selectedTruck);
    const zoneId = Number(selectedZone);
    const kg = Number(kgValue);

    if (!truckId || isNaN(truckId) || truckId <= 0) {
      setCollectionError("Selecciona un camión válido.");
      return;
    }
    if (!zoneId || isNaN(zoneId) || zoneId <= 0) {
      setCollectionError("Selecciona una zona válida.");
      return;
    }
    if (isNaN(kg) || kg < 0) {
      setCollectionError("Ingresa una cantidad válida de kilogramos.");
      return;
    }
    if (kg === 0) {
      setCollectionError("El kg recolectado no puede ser 0.");
      return;
    }

    setSubmittingCollection(true);
    setCollectionMessage("");
    try {
      await onCreateCollection({ truck_id: truckId, zone_id: zoneId, kg: kg });
      setCollectionMessage("Recolección registrada correctamente.");
      setKgValue(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo registrar la recolección. Intentalo de nuevo.";
      setCollectionError(msg);
    } finally {
      setSubmittingCollection(false);
    }
  }

  return (
<>
       <div className="two-col">
         <section className="panel"><h2>Mapa operativo OpenStreetMap</h2><Map zones={data.zones ?? []} trucks={safeTrucks} routes={routes} prioritizedZones={prioritizedZones} /></section>
         <section className="panel">
           <h2>Seguimiento GPS</h2>
           {geoError && <p className="hint error">El servicio de alertas geo no está disponible. Los datos pueden estar desactualizados.</p>}
           {isConductor && myTruck && (
             <p className="hint" style={{ marginBottom: 8 }}>📍 Viendo rutas de tu camión: <strong>{myTruck.code}</strong> ({myTruck.driver})</p>
           )}
           <div className="list">
             {visibleRoutes.map(route => <Item key={route.id} title={`${route.truck} - ${route.zone}`} detail={`Avance ${route.progress}% | ETA ${route.eta} | ${route.delay} | ${(route as any).waypoints?.length ?? 0} puntos`} color={String(route.delay ?? "").toLowerCase().includes("retraso") ? "yellow" : "blue"} />)}
             {isConductor && myTruck && visibleRoutes.length === 0 && (
               <p className="empty-state">No hay rutas activas para tu camión.</p>
             )}
             {alerts.map(alert => <Item key={alert} title="Microservicio TS" detail={alert} color="blue" />)}
           </div>
         </section>
       </div>
        {collectionMessage && <div role="alert" className="app-alert success">{collectionMessage}</div>}
        {collectionError && <div role="alert" className="app-alert error">{collectionError}</div>}
       {canRegisterCollection && (
        <section className="panel" style={{ marginTop: 16 }}>
          <h2>
            {isConductor && myTruck
              ? `Registrar recolección - ${myTruck.code} (${myTruck.driver})`
              : "Registrar recolección"}
          </h2>
          <form className="form-grid" onSubmit={submitCollection}>
            <label>Camión
              <select value={selectedTruck} onChange={event => setSelectedTruck(event.target.value ? Number(event.target.value) : "")}>
                {availableTrucks.map(truck => <option key={truck.id} value={truck.id}>{truck.code} - {truck.driver}</option>)}
              </select>
            </label>
            <label>Zona
              <select value={selectedZone} onChange={event => setSelectedZone(event.target.value ? Number(event.target.value) : "")}>
                {safeZones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
              </select>
            </label>
            <label>Kg recolectados
              <input name="kg" type="number" min={1} value={kgValue} onChange={event => { const val = Number(event.target.value); setKgValue(isNaN(val) ? 0 : val); }} required />
            </label>
            <button type="submit" className="btn-primary" disabled={submittingCollection}>{submittingCollection ? "Registrando..." : "Registrar recolección"}</button>
          </form>
        </section>
       )}
     </>
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
          {(data.optimized_routes ?? []).map(route => <Item key={route.id} title={`Ruta ${route.truck}`} detail={`${route.zone} | ${route.eta} | ${route.delay}`} color={String(route.delay ?? "").toLowerCase().includes("retraso") ? "yellow" : "blue"} />)}
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
  const isCitizen = session?.role === "ciudadano";
  const isOperator = session?.role === "operador";
  const isConductor = session?.role === "conductor";
  const conductorZone = isConductor ? String(session?.zone ?? "").toLowerCase() : null;

  const [dateRange, setDateRange] = useState("30");

  const safeReports = useMemo(() => {
    const reports = Array.isArray(data.reports) ? data.reports : [];
    if (isCitizen && session) {
      return reports.filter(report => String(report.citizen ?? "").toLowerCase() === String(session.name ?? "").toLowerCase());
    }
    if (isConductor && conductorZone) {
      return reports.filter(report => String(report.zone ?? "").toLowerCase() === conductorZone);
    }
    return reports;
  }, [data.reports, isCitizen, isConductor, session?.name, conductorZone]);

  const safeCollections = useMemo(() => {
    const collections = Array.isArray(data.collections) ? data.collections : [];
    if (isCitizen && session) {
      const citizenZone = String(session?.zone ?? "").toLowerCase();
      return collections.filter(col => !citizenZone || String(col.zone ?? "").toLowerCase() === citizenZone);
    }
    if (isConductor && conductorZone) {
      return collections.filter(col => String(col.zone ?? "").toLowerCase() === conductorZone);
    }
    return collections;
  }, [data.collections, isCitizen, isConductor, conductorZone, session?.zone]);

  const wasteBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    const schedules = Array.isArray(data.schedules) ? data.schedules : [];
    schedules.forEach(s => {
      extractWasteTypes(s.waste).forEach(t => {
        breakdown[t] = (breakdown[t] ?? 0) + 1;
      });
    });
    return breakdown;
  }, [data.schedules]);

  const zoneBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    safeCollections.forEach(c => {
      const zone = String(c.zone ?? "Sin zona");
      breakdown[zone] = (breakdown[zone] ?? 0) + 1;
    });
    return breakdown;
  }, [safeCollections]);

  const filteredCollections = useMemo(() => {
    const days = Number(dateRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return safeCollections.filter(c => {
      const cDate = new Date(c.date);
      return cDate >= cutoff;
    });
  }, [safeCollections, dateRange]);

  const myZoneCollections = safeCollections;
  const reportCounts = safeReports.reduce((acc, report) => {
    acc[report.status] = (acc[report.status] ?? 0) + 1;
    return acc;
  }, { Pendiente: 0, "En revision": 0, Resuelto: 0 } as Record<string, number>);
  const collectionCounts = safeCollections.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const analytics = data?.analytics ?? emptyBootstrap.analytics;
  const isAdmin = session?.role === "admin";
  const metricsCSV = isCitizen
    ? [
        { nombre: "Mis reportes pendientes", valor: reportCounts.Pendiente },
        { nombre: "Mis reportes resueltos", valor: reportCounts.Resuelto },
        { nombre: "Recolecciones confirmadas", valor: `${collectionCounts["Confirmada"] ?? 0}/${safeCollections.length}` },
        { nombre: "Total reportes", valor: safeReports.length },
      ]
    : isAdmin
    ? [
        { nombre: "Residuos registrados", valor: `${analytics.total_kg} kg` },
        { nombre: "Cumplimiento de rutas", valor: `${analytics.compliance}%` },
        { nombre: "Reportes abiertos", valor: analytics.open_reports },
        { nombre: "Camiones activos", valor: analytics.active_trucks },
        { nombre: "Rutas con retraso", valor: performance?.delayed_routes ?? 0 },
        { nombre: "Progreso medio", valor: `${performance?.average_progress ?? 0}%` },
        { nombre: "Llenado promedio contenedores", valor: `${performance?.average_container_fill ?? 0}%` },
        { nombre: "Recolecciones confirmadas", valor: `${collectionCounts["Confirmada"] ?? 0}/${safeCollections.length}` },
        { nombre: "Total rutas", valor: `${performance?.total_routes ?? 0}` },
        { nombre: "Índice de cumplimiento", valor: `${performance?.compliance_estimate ?? 0}%` },
        { nombre: "Usuarios registrados", valor: `${data.users?.length ?? 0}` },
        { nombre: "Zonas activas", valor: `${data.zones?.length ?? 0}` },
        { nombre: "Camiones en mantenimiento", valor: `${data.trucks?.filter(t => t.status === "Mantenimiento").length ?? 0}` },
      ]
    : isConductor
    ? [
        { nombre: "Total kg recolectados", valor: `${myZoneCollections.reduce((sum, c) => sum + (Number(c.kg) || 0), 0)} kg` },
        { nombre: "Recolecciones en mi zona", valor: myZoneCollections.length },
        { nombre: "Recolecciones confirmadas", valor: `${collectionCounts["Confirmada"] ?? 0}/${safeCollections.length}` },
        { nombre: "Incidencias en mi zona", valor: safeReports.length },
        { nombre: "Incidencias abiertas", valor: reportCounts.Pendiente + reportCounts["En revision"] },
        { nombre: "Zonas monitoreadas", valor: `${data.zones?.length ?? 0}` },
      ]
    : [
        { nombre: "Residuos registrados", valor: `${analytics.total_kg} kg` },
        { nombre: "Cumplimiento de rutas", valor: `${analytics.compliance}%` },
        { nombre: "Reportes abiertos", valor: analytics.open_reports },
        { nombre: "Camiones activos", valor: analytics.active_trucks },
        { nombre: "Rutas con retraso", valor: performance?.delayed_routes ?? 0 },
        { nombre: "Progreso medio", valor: `${performance?.average_progress ?? 0}%` },
        { nombre: "Llenado promedio contenedores", valor: `${performance?.average_container_fill ?? 0}%` },
        { nombre: "Recolecciones confirmadas", valor: `${collectionCounts["Confirmada"] ?? 0}/${safeCollections.length}` },
      ];

      return (
    <>
      <div className="grid metrics">
        {isCitizen ? (
          <>
            <Metric value={reportCounts.Pendiente} label="Mis reportes pendientes" />
            <Metric value={reportCounts.Resuelto} label="Mis reportes resueltos" />
            <Metric value={`${collectionCounts["Confirmada"] ?? 0}/${safeCollections.length}`} label="Recolectas confirmadas" />
            <Metric value={safeReports.length} label="Total mis reportes" />
          </>
        ) : isOperator ? (
          <>
            <Metric value={`${analytics.total_kg} kg`} label="Residuos registrados" />
            <Metric value={`${analytics.compliance}%`} label="Cumplimiento de rutas" />
            <Metric value={`${analytics.open_reports}`} label="Reportes abiertos" />
            <Metric value={`${analytics.active_trucks}`} label="Camiones activos" />
            <Metric value={`${performance?.delayed_routes ?? 0}`} label="Rutas con retraso" />
            <Metric value={`${performance?.average_progress ?? 0}%`} label="Progreso medio" />
            <Metric value={`${performance?.average_container_fill ?? 0}%`} label="Llenado promedio" />
            <Metric value={`${collectionCounts["Confirmada"] ?? 0}/${safeCollections.length}`} label="Recolectas confirmadas" />
            <Metric value={`${performance?.total_routes ?? 0}`} label="Rutas monitoreadas" />
            <Metric value={`${performance?.compliance_estimate ?? 0}%`} label="Índice de cumplimiento" />
          </>
        ) : isConductor ? (
          <>
            <Metric value={`${myZoneCollections.reduce((sum, c) => sum + (Number(c.kg) || 0), 0)} kg`} label="Kg recolectados en zona" />
            <Metric value={myZoneCollections.length} label="Recolecciones en mi zona" />
            <Metric value={`${collectionCounts["Confirmada"] ?? 0}/${safeCollections.length}`} label="Confirmadas" />
            <Metric value={safeReports.length} label="Incidencias en mi zona" />
            <Metric value={reportCounts.Pendiente + reportCounts["En revision"]} label="Incidencias abiertas" />
            <Metric value={`${analytics.compliance}%`} label="Cumplimiento de rutas" />
            <Metric value={`${performance?.delayed_routes ?? 0}`} label="Rutas con retraso" />
            <Metric value={`${performance?.compliance_estimate ?? 0}%`} label="Índice de cumplimiento" />
          </>
        ) : (
          <>
            <Metric value={`${analytics.total_kg} kg`} label="Residuos registrados" />
            <Metric value={`${analytics.compliance}%`} label="Cumplimiento de rutas" />
            <Metric value={`${analytics.open_reports}`} label="Reportes abiertos" />
            <Metric value={`${analytics.active_trucks}`} label="Camiones activos" />
            <Metric value={`${performance?.delayed_routes ?? 0}`} label="Rutas con retraso" />
            <Metric value={`${performance?.average_progress ?? 0}%`} label="Progreso medio" />
            <Metric value={`${performance?.average_container_fill ?? 0}%`} label="Llenado promedio" />
            <Metric value={`${collectionCounts["Confirmada"] ?? 0}/${safeCollections.length}`} label="Recolectas confirmadas" />
          </>
        )}
      </div>
      <section className="panel">
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
           <h2>{isConductor ? "Historial de recolecciones de mi zona" : "Historial de recolecciones"}</h2>
           <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
             <label htmlFor="date-range" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Últimos</label>
             <select id="date-range" value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ width: "auto", minWidth: 80, padding: "6px 10px", border: "1px solid var(--line)", borderRadius: "8px", background: "var(--panel)", color: "var(--ink)", fontSize: "0.85rem" }}>
               <option value="7">7 días</option>
               <option value="30">30 días</option>
               <option value="90">90 días</option>
               <option value="365">Todo el año</option>
             </select>
           </div>
         </div>
         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
           <section className="panel" style={{ padding: "16px" }}>
             <h3>{isConductor ? "Incidencias en mi zona" : "Resumen de reportes"}</h3>
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
         {Object.keys(wasteBreakdown).length > 0 && (
           <section className="panel" style={{ marginBottom: "24px" }}>
             <h2>Desglose por tipo de residuo</h2>
             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
               {Object.entries(wasteBreakdown).map(([type, count]) => (
                 <div key={type} style={{ padding: "12px", border: "1px solid var(--line)", borderRadius: "8px", textAlign: "center" }}>
                   <strong style={{ fontSize: "1.5rem", color: "var(--eco-primary)" }}>{count}</strong>
                   <span style={{ display: "block", fontSize: "0.82rem", color: "var(--muted)", marginTop: "4px" }}>{type}</span>
                 </div>
               ))}
             </div>
           </section>
         )}
         <div className="list">
           {filteredCollections.map(item => (
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

       {Object.keys(wasteBreakdown).length > 0 && (
         <section className="panel" style={{ marginBottom: "24px" }}>
           <h2>Distribución por tipo de residuo</h2>
           <ResponsiveContainer width="100%" height={300}>
             <BarChart data={Object.entries(wasteBreakdown).map(([name, value]) => ({ name, value }))}>
               <CartesianGrid strokeDasharray="3 3" />
               <XAxis dataKey="name" />
               <YAxis />
               <Tooltip />
               <Bar dataKey="value" fill="#0f8b8d" />
             </BarChart>
           </ResponsiveContainer>
         </section>
       )}

       {filteredCollections.length > 0 && (
         <section className="panel" style={{ marginBottom: "24px" }}>
           <h2>Recolecciones por día</h2>
           <ResponsiveContainer width="100%" height={300}>
             <LineChart data={filteredCollections.map(c => ({
               fecha: c.date,
               kg: Number(c.kg) || 0,
             })).sort((a, b) => a.fecha.localeCompare(b.fecha))}>
               <CartesianGrid strokeDasharray="3 3" />
               <XAxis dataKey="fecha" />
               <YAxis />
               <Tooltip />
               <Legend />
               <Line type="monotone" dataKey="kg" stroke="#0f8b8d" name="Kg recolectados" />
             </LineChart>
           </ResponsiveContainer>
         </section>
       )}

       {Object.keys(wasteBreakdown).length > 0 && (
         <section className="panel" style={{ marginBottom: "24px" }}>
           <h2>Distribución por zona</h2>
           <ResponsiveContainer width="100%" height={300}>
             <PieChart>
               <Pie data={Object.entries(zoneBreakdown).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label />
               <Tooltip />
             </PieChart>
           </ResponsiveContainer>
         </section>
       )}
     </>
   );
 }

function Map({ zones, trucks, routes, prioritizedZones }: { zones: Zone[]; trucks: Truck[]; routes: Route[]; prioritizedZones: Array<{ id: number; name: string; priority_score: number; criticality: string; latitude?: number; longitude?: number }> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const signatureRef = useRef<string>("");
  const signature = useMemo(() => {
    const s = `${zones.length}-${trucks.length}-${routes.length}-${prioritizedZones.length}`;
    return s;
  }, [zones.length, trucks.length, routes.length, prioritizedZones.length]);

  useEffect(() => {
    if (signatureRef.current === signature) return;
    signatureRef.current = signature;
    if (!ref.current || mapRef.current) return;
    mapRef.current = L.map(ref.current).setView([-13.532, -71.967], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    mapRef.current.invalidateSize();
  }, [signature]);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    if (signatureRef.current !== signature) return;

    const layer = layerRef.current;
    layer.clearLayers();
    zones.forEach(zone => L.marker([zone.latitude, zone.longitude]).bindPopup(`${zone.name} - ${zone.criticality}`).addTo(layer));
    prioritizedZones.forEach(zone => {
      const lat = zone.latitude ?? zones.find(item => item.name === zone.name)?.latitude;
      const lon = zone.longitude ?? zones.find(item => item.name === zone.name)?.longitude;
      if (lat !== undefined && lon !== undefined) {
        L.circleMarker([lat, lon], { radius: 12, color: zone.priority_score >= 5 ? "#c94735" : "#f5b942", fillColor: zone.priority_score >= 5 ? "#c94735" : "#f5b942", fillOpacity: 0.9, weight: 3 }).bindPopup(`${zone.name} · Prioridad ${zone.priority_score}`).addTo(layer);
      }
    });
    trucks.forEach(truck => L.circleMarker([truck.latitude, truck.longitude], { radius: 8, color: "#f5b942", fillOpacity: 0.9 }).bindPopup(`${truck.code} - ${truck.status}`).addTo(layer));
    routes.forEach(route => {
       L.circle([route.latitude, route.longitude], { radius: 450, color: String(route.delay ?? "").toLowerCase().includes("retraso") ? "#c94735" : "#0f8b8d" }).bindPopup(`${route.truck}: ${route.eta}`).addTo(layer);
       const waypoints = (route as any).waypoints;
       if (waypoints && waypoints.length > 1) {
         const points = waypoints.map((w: any) => [w.latitude ?? route.latitude, w.longitude ?? route.longitude] as [number, number]);
         L.polyline(points, { color: "#0f8b8d", weight: 3, opacity: 0.7 }).addTo(layer);
       }
     });
    mapRef.current.invalidateSize();
  }, [signature, zones, trucks, routes, prioritizedZones]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);

  return <div className="map" ref={ref} />;
}

export function ReportList({ reports, trucks = [], showDriverFilter = false, showResolve = false, onResolveReport, onViewDetail }: { reports: Report[]; trucks?: Truck[]; showDriverFilter?: boolean; showResolve?: boolean; onResolveReport?: (id: number) => Promise<void>; onViewDetail?: (report: Report) => void; }) {
  const [driverSearch, setDriverSearch] = useState("");
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const safeReports = useMemo(() => (Array.isArray(reports) ? reports : []), [reports]);
  const safeTrucks = useMemo(() => (Array.isArray(trucks) ? trucks : []), [trucks]);

  const driverByZone = useMemo(() => {
    const map: Record<string, string> = {};
    safeTrucks.forEach(truck => {
      const zoneKey = String(truck.zone ?? "").toLowerCase();
      if (!map[zoneKey]) {
        map[zoneKey] = String(truck.driver ?? "");
      }
    });
    return map;
  }, [safeTrucks]);

  const filtered = useMemo(() => {
    const normalizedDriver = driverSearch.toLowerCase().trim();

    return safeReports.filter(report => {
      const zoneKey = String(report.zone ?? "").toLowerCase();
      const reportDriver = driverByZone[zoneKey] ?? "";
      const matchDriver = !normalizedDriver || reportDriver.toLowerCase().includes(normalizedDriver);
      return matchDriver;
    });
  }, [safeReports, driverSearch, driverByZone]);

  async function handleResolve(reportId: number) {
    if (!onResolveReport) return;
    setResolvingId(reportId);
    try {
      await onResolveReport(reportId);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div>
      {showDriverFilter && (
        <div className="search-box driver-search">
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

      {filtered.length === 0 ? (
        <p className="empty-state">No hay reportes que coincidan con tu búsqueda</p>
      ) : (
        <div className="list" role="list" aria-label="Lista de reportes">
{filtered.map(report => {
              const zoneKey = String(report.zone ?? "").toLowerCase();
              const reportDriver = driverByZone[zoneKey] ?? "Sin conductor asignado";
              return (
               <article className="item" key={report.id}>
                 <div className="item-row">
                   <strong>{report.type ?? "Sin tipo"}</strong>
                   <span className={`tag ${statusTone(report.status)}`}>{report.status ?? "Sin estado"}</span>
                   {(report as any).priority && <span className={`tag ${(report as any).priority === "Urgente" || (report as any).priority === "Alta" ? "red" : (report as any).priority === "Media" ? "yellow" : "blue"}`}>{(report as any).priority}</span>}
                 </div>
                 <span>{report.zone ?? "Sin zona"} | {report.citizen ?? "Sin ciudadano"} | {reportDriver}</span>
                 <p>{report.detail ?? "Sin detalle"}</p>
                 {showResolve && (
                   <div className="item-actions">
                     <button
                       type="button"
                       className="report-action-btn"
                       onClick={(e) => { e.stopPropagation(); void handleResolve(report.id); }}
                       disabled={resolvingId === report.id}
                       aria-label={`Resolver reporte ${report.id}`}
                     >
                       {resolvingId === report.id ? "Procesando..." : "Resolver reporte"}
                     </button>
                   </div>
                 )}
                 {onViewDetail && (
                   <div className="item-actions">
                     <button type="button" className="report-action-btn" onClick={() => onViewDetail(report)}>Ver detalle</button>
                   </div>
                 )}
               </article>
             );
          })}
        </div>
      )}
    </div>
  );
}

const rootElement = typeof document !== "undefined" ? document.getElementById("root") : null;
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
