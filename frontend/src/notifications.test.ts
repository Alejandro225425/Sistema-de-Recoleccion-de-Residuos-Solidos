import { describe, it, expect } from "vitest";
import { filterCitizenNotifications } from "./notifications";

const baseNotification = { title: "Aviso general", message: "Algo pasó en Centro Historico", created_at: "Ahora" };

describe("filterCitizenNotifications", () => {
  it("filters out proximity notifications when user opted out", () => {
    const notifications = [
      { ...baseNotification, type: "proximity", title: "Proximidad", message: "Camión cerca de Centro Historico" },
      { ...baseNotification, type: "other", title: "General", message: "Información para Centro Historico" },
    ];
    const session = { id: 1, name: "C", role: "ciudadano", zone: "Centro Historico", proximity_alerts: false } as any;
    const filtered = filterCitizenNotifications(notifications, session);
    expect(filtered.some(n => String(n.type).toLowerCase() === "proximity")).toBe(false);
    expect(filtered.some(n => String(n.type).toLowerCase() === "other")).toBe(true);
  });

  it("keeps proximity notifications when user opted in", () => {
    const notifications = [
      { ...baseNotification, type: "proximity", title: "Proximidad", message: "Camión cerca de Centro Historico" },
    ];
    const session = { id: 1, name: "C", role: "ciudadano", zone: "Centro Historico", proximity_alerts: true } as any;
    const filtered = filterCitizenNotifications(notifications, session);
    expect(filtered.length).toBe(1);
  });
});
