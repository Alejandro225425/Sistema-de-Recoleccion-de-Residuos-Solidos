import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { extractWasteTypes, Waste } from "./main";
import type { Bootstrap, Session } from "./types";

const makeSchedule = (id: number, zone: string, waste: string) =>
  ({ id, zone_id: 1, zone, day: "Lunes", time: "06:00 - 08:00", waste });

const baseData: Bootstrap = {
  zones: [{ id: 1, name: "Centro Historico", latitude: -13.53, longitude: -71.97, criticality: "Media" }],
  schedules: [
    makeSchedule(1, "Centro Historico", "Organico y reciclable"),
    makeSchedule(2, "Wanchaq", "No reciclable y reciclable"),
    makeSchedule(3, "San Sebastian", "Organico"),
    makeSchedule(4, "San Jeronimo", "Mixto segregado"),
    makeSchedule(5, "Santiago", "Reciclable"),
  ],
  trucks: [],
  routes: [],
  reports: [],
  collections: [],
  analytics: { zones: 5, active_trucks: 0, open_reports: 0, confirmed_collections: 0, total_kg: 0, compliance: 0 },
};

const adminSession: Session = { id: 1, name: "Admin", email: "admin@ecocusco.pe", role: "admin", zone: "Centro Historico" };

describe("extractWasteTypes", () => {
  it("mantiene 'No reciclable' como un solo tipo (no separa 'No')", () => {
    const result = extractWasteTypes("No reciclable y reciclable");
    expect(result).toEqual(["No reciclable", "Reciclable"]);
  });

  it("no produce 'No' como tipo independiente", () => {
    const allTypes: string[] = [];
    baseData.schedules.forEach(s => allTypes.push(...extractWasteTypes(s.waste)));
    const unique = new Set(allTypes);
    expect(unique.has("No")).toBe(false);
  });

  it("maneja 'No Orgánicos' como un solo tipo", () => {
    const result = extractWasteTypes("No Orgánicos y reciclable");
    expect(result).toEqual(["No Orgánicos", "Reciclable"]);
  });

  it("separa tipos unidos por 'y', 'e', comas y '&'", () => {
    expect(extractWasteTypes("Organico y reciclable")).toEqual(["Organico", "Reciclable"]);
    expect(extractWasteTypes("Organico e reciclable")).toEqual(["Organico", "Reciclable"]);
    expect(extractWasteTypes("Organico, reciclable")).toEqual(["Organico", "Reciclable"]);
    expect(extractWasteTypes("Organico & reciclable")).toEqual(["Organico", "Reciclable"]);
  });

  it("mantiene 'Mixto segregado' como un solo tipo", () => {
    expect(extractWasteTypes("Mixto segregado")).toEqual(["Mixto segregado"]);
  });

  it("normaliza el casing para evitar duplicados", () => {
    const result = extractWasteTypes("Organico y reciclable");
    expect(result).toContain("Reciclable");
    expect(result).not.toContain("reciclable");
  });

  it("retorna arreglo vacío para entrada vacía", () => {
    expect(extractWasteTypes("")).toEqual([]);
    expect(extractWasteTypes("   ")).toEqual([]);
  });
});

describe("Waste dashboard", () => {
  it("no muestra 'No' como tipo de residuo", () => {
    render(<Waste data={baseData} monitor={{}} session={adminSession} />);

    expect(screen.queryAllByText("No").length).toBe(0);
  });

  it("muestra 'No reciclable' como un tipo con tag rojo", () => {
    render(<Waste data={baseData} monitor={{}} session={adminSession} />);

    const typeElements = screen.getAllByText("No reciclable");
    expect(typeElements.length).toBeGreaterThan(0);

    const statsPanel = screen.getByText("Estadisticas de residuos").closest(".panel");
    const redTags = statsPanel?.querySelectorAll(".tag.red");
    expect(redTags?.length).toBeGreaterThan(0);
  });

  it("no renderiza la sección 'Mapa de puntos de clasificación'", () => {
    render(<Waste data={baseData} monitor={{}} session={adminSession} />);

    expect(screen.queryByText("Mapa de puntos de clasificacion")).not.toBeInTheDocument();
    expect(screen.queryByText("Mapa de puntos de clasificación")).not.toBeInTheDocument();
  });

  it("muestra la sección 'Guía de disposición' con los tres tipos de residuo", () => {
    render(<Waste data={baseData} monitor={{}} session={adminSession} />);

    expect(screen.getByText(/guía de disposición/i)).toBeInTheDocument();
    expect(screen.getByText("🟢 Orgánicos")).toBeInTheDocument();
    expect(screen.getByText("🔵 Reciclables")).toBeInTheDocument();
    expect(screen.getByText("🔴 No reciclables")).toBeInTheDocument();
  });

  it("muestra métrica correcta de tipos de residuo (4, no 6)", () => {
    render(<Waste data={baseData} monitor={{}} session={adminSession} />);

    const tipoResiduoCard = screen.getByText("Tipos de residuo").closest(".metric");
    const value = tipoResiduoCard?.querySelector(".metric-value");
    expect(value).toHaveTextContent("4");
  });

  it("filtra horarios por tipo de residuo correctamente", () => {
    render(<Waste data={baseData} monitor={{}} session={adminSession} />);

    const select = screen.getByLabelText("Filtrar por tipo de residuo");
    const options = Array.from(select.querySelectorAll("option")).map(o => o.textContent);
    expect(options).toContain("No reciclable");
    expect(options).not.toContain("No");
  });
});
