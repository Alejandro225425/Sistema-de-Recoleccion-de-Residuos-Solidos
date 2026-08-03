import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Admin from './Admin';
import type { Bootstrap, Session } from '../types';

const baseData: Bootstrap = {
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

const adminSession: Session = { id: 1, name: 'Admin', email: 'admin@ecocusco.pe', role: 'admin', zone: 'Centro Historico' };

const noop = vi.fn().mockResolvedValue(undefined);

describe('Admin dashboard', () => {
  it('aplica estilos de tema seguros para que el contenido sea visible', () => {
    render(
      <Admin
        data={baseData}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    expect(screen.getByTestId('admin-shell')).toHaveClass('admin-grid', 'admin-shell');
  });

  it('renderiza 6 paneles de administración visibles', () => {
    render(
      <Admin
        data={baseData}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    const panels = screen.getAllByRole('heading', { level: 2 });
    expect(panels.length).toBeGreaterThanOrEqual(6);
  });

  it('muestra un estado vacío cuando no hay zonas que coincidan con el filtro', async () => {
    const user = userEvent.setup();

    render(
      <Admin
        data={baseData}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    const filter = screen.getByLabelText(/filtrar zonas/i);
    await user.type(filter, 'no-existe');

    expect(screen.getByText(/no se encontraron zonas/i)).toBeInTheDocument();
  });

  it('muestra estados vacíos cuando los datos son undefined o null', () => {
    const unsafeData = {
      zones: undefined,
      schedules: null,
      trucks: undefined,
      routes: null,
      reports: undefined,
      collections: null,
      analytics: null,
    } as unknown as Bootstrap;

    render(
      <Admin
        data={unsafeData}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    expect(screen.getByTestId('admin-shell')).toBeInTheDocument();
  });
  it('ignora elementos null dentro de las listas administrativas', () => {
    const unsafeData = {
      ...baseData,
      zones: [null, baseData.zones[0]],
      schedules: [null],
      trucks: [null],
      routes: [null],
      users: [null],
      containers: [null],
      maintenance: [null],
    } as unknown as Bootstrap;

    render(
      <Admin
        data={unsafeData}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    expect(screen.getByTestId('admin-shell')).toBeInTheDocument();
    expect(screen.getAllByText('Centro Historico').length).toBeGreaterThan(0);
  });

  it('muestra la opción predeterminada cuando no hay rutas ni contenedores disponibles', () => {
    const emptyData = {
      ...baseData,
      routes: [],
      containers: [],
    } as unknown as Bootstrap;

render(
      <Admin
        data={baseData}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    expect(screen.getByLabelText(/Objetivo/i)).toHaveValue("");
    expect(screen.getByText(/Selecciona una ruta|Selecciona un contenedor/i)).toBeInTheDocument();
  });
});


