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
});
