import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { App } from "./main";

vi.mock("leaflet", () => {
  const mockMap = () => ({
    setView: () => mockMap(),
    addLayer: () => mockMap(),
    remove: () => mockMap(),
    invalidateSize: () => mockMap(),
  });
  return {
    default: {
      map: mockMap,
      tileLayer: () => ({ addTo: () => mockMap() }),
      layerGroup: () => ({ addTo: () => ({ remove: () => mockMap(), clearLayers: () => mockMap() }) }),
      marker: () => ({ bindPopup: () => ({ addTo: () => mockMap() }) }),
      circleMarker: () => ({ bindPopup: () => ({ addTo: () => mockMap() }) }),
      circle: () => ({ bindPopup: () => ({ addTo: () => mockMap() }) }),
      icon: () => ({}),
      Icon: { Default: { prototype: {}, mergeOptions: () => {} } },
      divIcon: () => ({}),
    },
  };
});

declare global {
  interface Window {
    matchMedia: (query: string) => MediaQueryList;
  }
}

const sessionData = {
  id: 1,
  name: "Administrador EcoCusco",
  email: "admin@ecocusco.pe",
  role: "admin",
  zone: "Centro Historico",
};

const token = "fake-jwt-token";

const mockBootstrap = {
  zones: [
    { id: 1, name: "Centro Historico", latitude: -13.532, longitude: -71.967, criticality: "Alta" },
  ],
  schedules: [],
  trucks: [
    { id: 1, code: "C-01", driver: "Juan", status: "Activo", zone: "Centro Historico", latitude: -13.532, longitude: -71.967 },
  ],
  routes: [
    { id: 1, truck: "C-01", zone: "Centro Historico", progress: 50, eta: "10:00", delay: "Normal", latitude: -13.532, longitude: -71.967 },
  ],
  reports: [],
  collections: [],
  analytics: { zones: 1, active_trucks: 1, open_reports: 0, confirmed_collections: 5, total_kg: 100, compliance: 80 },
  users: [],
  containers: [],
  maintenance: [],
  notifications: [],
  prioritized_zones: [],
  optimized_routes: [],
  truck_assignments: [],
  intervention_plan: [],
  performance: {
    total_routes: 1,
    delayed_routes: 0,
    low_progress_routes: 0,
    average_progress: 50,
    open_reports: 0,
    average_container_fill: 50,
    compliance_estimate: 80,
  },
};

function createMonitor(alerts: string[]) {
  return {
    alerts,
    performance: {
      total_routes: 1,
      delayed_routes: 0,
      low_progress_routes: 0,
      average_progress: 50,
      open_reports: 0,
      average_container_fill: 50,
      compliance_estimate: 80,
    },
  };
}

const mockFetch = vi.fn();

function setupFetch(bootstrap: any = mockBootstrap, monitor: any = createMonitor([])) {
  mockFetch.mockImplementation((input: RequestInfo) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.includes("/api/bootstrap")) {
      return Promise.resolve({ ok: true, headers: { get: () => "application/json" }, json: () => Promise.resolve(bootstrap) });
    }
    if (url.includes("/api/operations/monitor")) {
      return Promise.resolve({ ok: true, headers: { get: () => "application/json" }, json: () => Promise.resolve(monitor) });
    }
    return Promise.resolve({ ok: true, headers: { get: () => "application/json" }, json: () => Promise.resolve({}) });
  });
}

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  }
  globalThis.fetch = mockFetch as any;
});

beforeEach(() => {
  localStorage.clear();
  cleanup();
  localStorage.setItem("sir-token", token);
  localStorage.setItem("sir-session", JSON.stringify(sessionData));
});

afterEach(() => {
  mockFetch.mockReset();
});

describe("Dashboard", () => {
  it("renders metrics grid and role badge when data loads", async () => {
    setupFetch();

    render(<App />);

    await screen.findByRole("heading", { name: /Panel Principal/i });
    await waitFor(() => {
      expect(screen.getByText("Zonas Activas")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/Rol activo: admin/)).toBeInTheDocument();
    });
  });

  it("shows empty state for Alertas Activas when there are no alerts", async () => {
    setupFetch(mockBootstrap, createMonitor([]));

    render(<App />);

    await screen.findByRole("heading", { name: /Panel Principal/i });

    await waitFor(() => {
      expect(screen.getByText("No hay alertas activas en este momento.")).toBeInTheDocument();
    });
  });

  it("shows active alerts when monitor returns alert strings", async () => {
    setupFetch(mockBootstrap, createMonitor(["Retraso en ruta C-04"]));

    render(<App />);

    await screen.findByRole("heading", { name: /Panel Principal/i });

    await waitFor(() => {
      expect(screen.getAllByText(/Retraso en ruta C-04/)[0]).toBeInTheDocument();
    });
  });

  it("renders dispatch board with correct hour format (08:00, 09:00, 10:00)", async () => {
    setupFetch();

    render(<App />);

    await screen.findByRole("heading", { name: /Panel Principal/i });

    await waitFor(() => {
      expect(screen.getByText("08:00 · Centro Historico")).toBeInTheDocument();
    });
    expect(screen.getByText("09:00 · Wanchaq")).toBeInTheDocument();
    expect(screen.getByText("10:00 · Santiago")).toBeInTheDocument();
  });

  it("does not render the removed 'Cargar mas' button", async () => {
    setupFetch();

    render(<App />);

    await screen.findByRole("heading", { name: /Panel Principal/i });

    await waitFor(() => {
      expect(screen.queryByText(/Cargar más notificaciones/)).not.toBeInTheDocument();
    });
  });

  it("renders the dispatch label with assignment count instead of 'Operativo'", async () => {
    setupFetch();

    render(<App />);

    await screen.findByRole("heading", { name: /Panel Principal/i });

    await waitFor(() => {
      expect(screen.getByText(/asignaciones/)).toBeInTheDocument();
    });
    expect(screen.queryByText("Operativo")).not.toBeInTheDocument();
  });

  it("shows map fallback when zones list is empty", async () => {
    const bootstrapNoZones = { ...mockBootstrap, zones: [] };
    setupFetch(bootstrapNoZones, createMonitor([]));

    render(<App />);

    await screen.findByRole("heading", { name: /Panel Principal/i });

    await waitFor(() => {
      expect(screen.getByText("No hay zonas operativas.")).toBeInTheDocument();
    });
  });
});
