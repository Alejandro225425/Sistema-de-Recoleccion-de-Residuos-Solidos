import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Admin from './Admin';
import type { Bootstrap, Session } from '../types';
import * as api from '../api';

vi.mock('../api', () => ({
  request: vi.fn(),
}));

const confirmSpy = vi.spyOn(window, 'confirm');

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
  beforeEach(() => {
    vi.clearAllMocks();
    confirmSpy.mockReturnValue(true);
  });

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

  it('muestra checkboxes de selección en la lista de mantenimiento', () => {
    const dataWithMaintenance: Bootstrap = {
      ...baseData,
      trucks: [{ id: 1, code: 'C-01', driver: 'Test', status: 'En ruta', zone: 'Centro', zone_id: 1, latitude: 0, longitude: 0 }],
      maintenance: [
        { id: 1, truck_id: 1, description: 'Frenos', status: 'Pendiente', created_at: '2026-01-01' },
        { id: 2, truck_id: 1, description: 'Aceite', status: 'Completado', created_at: '2026-01-02' },
      ],
    };

    render(
      <Admin
        data={dataWithMaintenance}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const maintenanceCheckboxes = checkboxes.filter(cb => cb.getAttribute('aria-label')?.includes('Seleccionar mantenimiento'));
    expect(maintenanceCheckboxes.length).toBe(2);
  });

  it('muestra la barra de acción masiva al seleccionar elementos de mantenimiento', async () => {
    const user = userEvent.setup();
    const dataWithMaintenance: Bootstrap = {
      ...baseData,
      trucks: [{ id: 1, code: 'C-01', driver: 'Test', status: 'En ruta', zone: 'Centro', zone_id: 1, latitude: 0, longitude: 0 }],
      maintenance: [
        { id: 1, truck_id: 1, description: 'Frenos', status: 'Pendiente', created_at: '2026-01-01' },
        { id: 2, truck_id: 1, description: 'Aceite', status: 'Completado', created_at: '2026-01-02' },
      ],
    };

    render(
      <Admin
        data={dataWithMaintenance}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    expect(screen.queryByText(/seleccionado/s)).not.toBeInTheDocument();

    const checkbox = screen.getByLabelText('Seleccionar mantenimiento #1');
    await user.click(checkbox);

    expect(screen.getByText(/1 seleccionado/)).toBeInTheDocument();
    expect(screen.getByText('Eliminar seleccionados')).toBeInTheDocument();
  });

  it('llama a la API de bulk-action al eliminar elementos seleccionados', async () => {
    const user = userEvent.setup();
    vi.mocked(api.request).mockResolvedValue({ deleted: [1, 2], count: 2, resource: 'maintenance' });
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    const dataWithMaintenance: Bootstrap = {
      ...baseData,
      trucks: [{ id: 1, code: 'C-01', driver: 'Test', status: 'En ruta', zone: 'Centro', zone_id: 1, latitude: 0, longitude: 0 }],
      maintenance: [
        { id: 1, truck_id: 1, description: 'Frenos', status: 'Pendiente', created_at: '2026-01-01' },
        { id: 2, truck_id: 1, description: 'Aceite', status: 'Pendiente', created_at: '2026-01-02' },
      ],
    };

    render(
      <Admin
        data={dataWithMaintenance}
        session={adminSession}
        onOperationUpdate={noop}
        onRefresh={onRefresh}
      />
    );

    const checkbox1 = screen.getByLabelText('Seleccionar mantenimiento #1');
    const checkbox2 = screen.getByLabelText('Seleccionar mantenimiento #2');
    await user.click(checkbox1);
    await user.click(checkbox2);

    expect(screen.getByText(/2 seleccionado/)).toBeInTheDocument();

    await user.click(screen.getByText('Eliminar seleccionados'));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('2'));
    expect(api.request).toHaveBeenCalledWith('/admin/bulk-action', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ resource: 'maintenance', action: 'delete', ids: [1, 2] }),
    }));
  });

  it('cancela la eliminación masiva si el usuario cancela el confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(api.request).mockResolvedValue({ deleted: [], count: 0, resource: 'maintenance' });

    const dataWithMaintenance: Bootstrap = {
      ...baseData,
      trucks: [{ id: 1, code: 'C-01', driver: 'Test', status: 'En ruta', zone: 'Centro', zone_id: 1, latitude: 0, longitude: 0 }],
      maintenance: [
        { id: 1, truck_id: 1, description: 'Frenos', status: 'Pendiente', created_at: '2026-01-01' },
      ],
    };

    render(
      <Admin
        data={dataWithMaintenance}
        session={adminSession}
        onOperationUpdate={noop}
      />
    );

    const checkbox = screen.getByLabelText('Seleccionar mantenimiento #1');
    await user.click(checkbox);

    confirmSpy.mockReturnValue(false);

    await user.click(screen.getByText('Eliminar seleccionados'));

    expect(api.request).not.toHaveBeenCalled();
    expect(screen.getByText(/1 seleccionado/)).toBeInTheDocument();

    confirmSpy.mockReturnValue(true);
  });
});


