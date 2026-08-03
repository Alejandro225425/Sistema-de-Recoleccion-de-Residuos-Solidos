import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard, Reports } from './main';
import type { Bootstrap, Session } from './types';

const baseData: Bootstrap = {
  zones: [{ id: 1, name: 'Centro Historico', latitude: -13.53, longitude: -71.97, criticality: 'Media' }],
  schedules: [],
  trucks: [],
  routes: [],
  reports: [
    { id: 1, citizen: 'Ana', zone: 'Centro Historico', type: 'Acumulacion de basura', detail: 'Bache en la plaza', status: 'Pendiente' },
    { id: 2, citizen: 'Luis', zone: 'Centro Historico', type: 'Contenedor lleno', detail: 'Fuga de agua', status: 'Pendiente' },
  ],
  collections: [],
  analytics: {
    zones: 1,
    active_trucks: 0,
    open_reports: 2,
    confirmed_collections: 0,
    total_kg: 0,
    compliance: 0,
  },
};

describe('Reports view', () => {
  it('muestra solo los reportes del ciudadano autenticado', () => {
    const citizenSession: Session = { id: 10, name: 'Ana', email: 'ana@example.com', role: 'ciudadano', zone: 'Centro Historico' };

    render(<Reports data={baseData} session={citizenSession} onCreateReport={vi.fn()} onResolveReport={vi.fn()} />);

    expect(screen.getByText('Bache en la plaza')).toBeInTheDocument();
    expect(screen.queryByText('Fuga de agua')).not.toBeInTheDocument();
  });

  it('permite resolver un reporte desde la vista de operador', async () => {
    const user = userEvent.setup();
    const onResolveReport = vi.fn().mockResolvedValue(undefined);
    const operatorSession: Session = { id: 20, name: 'Operador', email: 'op@example.com', role: 'operador', zone: 'Centro Historico' };

    render(<Reports data={baseData} session={operatorSession} onCreateReport={vi.fn()} onResolveReport={onResolveReport} />);

    await user.click(screen.getAllByRole('button', { name: /resolver reporte/i })[0]);

    expect(onResolveReport).toHaveBeenCalledWith(1);
  });

  it('muestra un resumen personalizado para ciudadanos en el dashboard', () => {
    const citizenSession: Session = { id: 10, name: 'Ana', email: 'ana@example.com', role: 'ciudadano', zone: 'Centro Historico' };

    render(<Dashboard data={baseData} monitor={{}} session={citizenSession} />);

    expect(screen.getByText(/mis reportes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/recolecciones pendientes/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/tablero de despacho/i)).not.toBeInTheDocument();
    expect(screen.getByText(/bache en la plaza/i)).toBeInTheDocument();
  });
});
