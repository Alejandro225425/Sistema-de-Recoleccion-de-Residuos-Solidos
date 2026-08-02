import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
      Icon: {
        Default: {
          prototype: {},
          mergeOptions: () => {},
        },
      },
      divIcon: () => ({}),
    },
  };
});

import { ReportList } from "./main";
import Admin from "./components/Admin";
import type { Report } from "./types";

describe("ReportList", () => {
  it("renders reports even when optional fields are missing", () => {
    const reports = [
      {
        id: 1,
        citizen: "Ana Quispe",
        zone: undefined as unknown as string,
        type: "Acumulación de basura",
        detail: undefined as unknown as string,
        status: "Pendiente" as const,
      },
    ] as Report[];

    render(<ReportList reports={reports} trucks={[]} />);

    expect(screen.getByText(/Acumulación de basura/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin conductor asignado/i)).toBeInTheDocument();
  });

  it("renders the admin panel without crashing when zone or truck data is incomplete", () => {
    const data = {
      zones: [{ id: 1, name: "Centro Histórico", latitude: -13.52, longitude: -71.98, criticality: "Alta" }],
      schedules: [],
      trucks: [{ id: 1, code: "C-01", driver: undefined as unknown as string, status: "En ruta", zone: undefined as unknown as string, latitude: -13.52, longitude: -71.98 }],
      routes: [],
      reports: [],
      collections: [],
      analytics: { zones: 1, active_trucks: 1, open_reports: 0, confirmed_collections: 0, total_kg: 0, compliance: 100 },
      maintenance: [],
      users: [],
      notifications: [],
      containers: [],
      prioritized_zones: [],
      optimized_routes: [],
      truck_assignments: [],
      intervention_plan: [],
      performance: undefined,
    } as any;

    render(<Admin data={data} session={{ id: 1, name: "Admin", email: "admin@example.com", role: "admin", zone: "Centro Histórico" }} onResolveReport={async () => {}} onOperationUpdate={async () => {}} />);

    expect(screen.getByText(/Gestión de usuarios/i)).toBeInTheDocument();
    expect(screen.getByText(/Gestión de zonas/i)).toBeInTheDocument();
  });
});
