import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Dashboard } from "./main";

const emptyData = { zones: [], schedules: [], trucks: [], routes: [], reports: [], collections: [], analytics: {} } as any;

const monitorWithProximity = {
  notifications: [
    { type: "proximity", title: "Aviso de proximidad", message: "Camión cerca de Centro Historico", created_at: "Ahora" },
  ],
} as any;

const sessionWithOptIn = { id: 1, name: "Ciudadano", email: "c@d.com", role: "ciudadano", zone: "Centro Historico", proximity_alerts: true } as any;
const sessionWithOptOut = { ...sessionWithOptIn, proximity_alerts: false } as any;

describe("Dashboard integration - proximity opt-out", () => {
  it("shows proximity notification when user has opt-in enabled", async () => {
    render(<Dashboard data={emptyData} monitor={monitorWithProximity} session={sessionWithOptIn} onConfirmCollection={async () => {}} health={null} lastSync="" view="dashboard" setView={() => {}} />);
    expect(await screen.findByText(/Aviso de proximidad/i)).toBeInTheDocument();
  });

  it("hides proximity notification when user opted out", async () => {
    render(<Dashboard data={emptyData} monitor={monitorWithProximity} session={sessionWithOptOut} onConfirmCollection={async () => {}} health={null} lastSync="" view="dashboard" setView={() => {}} />);
    const node = screen.queryByText(/Aviso de proximidad/i);
    expect(node).toBeNull();
  });
});
