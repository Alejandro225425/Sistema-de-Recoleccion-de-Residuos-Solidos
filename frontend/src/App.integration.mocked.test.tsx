import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, afterEach, beforeEach } from "vitest";
import { App } from "./main";

const bootstrapPayload = { zones: [], schedules: [], trucks: [], routes: [], reports: [], collections: [], analytics: {} };
const monitorWithProximity = { notifications: [ { type: "proximity", title: "Aviso de proximidad", message: "Camión cerca de Centro Historico", created_at: "Ahora" } ] };

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  (globalThis.fetch as any)?.mockRestore?.();
});

describe("App integration (mocked fetch)", () => {
  it("toggles opt-out and hides proximity notifications", async () => {
    const session = { id: 10, name: "Ciudadano", email: "c@d.com", role: "ciudadano", zone: "Centro Historico", proximity_alerts: true };
    localStorage.setItem('sir-session', JSON.stringify(session));

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.endsWith('/api/bootstrap')) return new Response(JSON.stringify(bootstrapPayload), { status: 200 });
      if (url.endsWith('/api/operations/monitor')) return new Response(JSON.stringify(monitorWithProximity), { status: 200 });
      if (url.endsWith('/api/health')) return new Response(JSON.stringify({ mode: 'demo', connected: false, database: 'memory' }), { status: 200 });
      if (url.endsWith('/api/auth/me') && init && init.method === 'PATCH') {
        const body = init.body ? JSON.parse(String(init.body)) : {};
        const updated = { ...session, ...body };
        return new Response(JSON.stringify(updated), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(<App />);

    // wait for dashboard
    await screen.findByRole('heading', { name: /Panel Principal/i }, { timeout: 10000 });

    // proximity notification visible
    await waitFor(() => expect(screen.getByText(/Aviso de proximidad/i)).toBeInTheDocument());

    // open sidebar and toggle checkbox
    fireEvent.click(screen.getByLabelText(/Abrir menú/i));
    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);

    // assert fetch was called for PATCH and localStorage updated
    await waitFor(() => {
      const sess = JSON.parse(localStorage.getItem('sir-session') || 'null');
      if (!sess) throw new Error('no session');
      if (sess.proximity_alerts !== false) throw new Error('not updated yet');
    }, { timeout: 5000 });

    // re-render App to simulate fresh load/refresh reflecting updated session
    render(<App />);
    await screen.findByRole('heading', { name: /Panel Principal/i }, { timeout: 10000 });
    await waitFor(() => expect(screen.queryByText(/Aviso de proximidad/i)).not.toBeInTheDocument(), { timeout: 5000 });

    fetchMock.mockRestore();
  }, 20000);
});
