import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Admin from './Admin';
import type { Bootstrap, Session } from '../types';

describe('Admin dashboard', () => {
  it('aplica estilos de tema seguros para que el contenido sea visible', () => {
    const session: Session = { id: 1, name: 'Admin', email: 'admin@ecocusco.pe', role: 'admin', zone: 'Centro Historico' };
    const data: Bootstrap = {
      zones: [{ id: 1, name: 'Centro Historico', latitude: 0, longitude: 0, criticality: 'Media' }],
      schedules: [],
      trucks: [],
      routes: [],
      reports: [],
      collections: [],
      analytics: {
        zones: 1,
        active_trucks: 0,
        open_reports: 0,
        confirmed_collections: 0,
        total_kg: 0,
        compliance: 0,
      },
    };

    render(
      <Admin
        data={data}
        session={session}
        onResolveReport={vi.fn().mockResolvedValue(undefined)}
        onOperationUpdate={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByTestId('admin-shell')).toHaveStyle({
      backgroundColor: 'var(--bg, #f0f5f2)',
      color: 'var(--ink, #1d2730)',
    });
  });

  it('muestra un estado vacío cuando no hay zonas que coincidan con el filtro', async () => {
    const user = userEvent.setup();
    const session: Session = { id: 1, name: 'Admin', email: 'admin@ecocusco.pe', role: 'admin', zone: 'Centro Historico' };
    const data: Bootstrap = {
      zones: [{ id: 1, name: 'Centro Historico', latitude: 0, longitude: 0, criticality: 'Media' }],
      schedules: [],
      trucks: [],
      routes: [],
      reports: [],
      collections: [],
      analytics: {
        zones: 1,
        active_trucks: 0,
        open_reports: 0,
        confirmed_collections: 0,
        total_kg: 0,
        compliance: 0,
      },
    };

    render(
      <Admin
        data={data}
        session={session}
        onResolveReport={vi.fn().mockResolvedValue(undefined)}
        onOperationUpdate={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const filter = screen.getByLabelText(/filtrar zonas/i);
    await user.type(filter, 'no-existe');

    expect(screen.getByText(/no se encontraron zonas/i)).toBeInTheDocument();
  });
});
