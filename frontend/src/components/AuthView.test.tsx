import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthView } from './AuthView';

describe('AuthView accessibility', () => {
  it('allows toggling password visibility with Enter from the keyboard', () => {
    render(<AuthView zones={[]} onLogin={vi.fn()} message="" />);

    const passwordInput = screen.getByLabelText(/Contraseña/i, { selector: 'input' });
    const toggleButton = screen.getByRole('button', { name: /Mostrar contraseña/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.keyDown(toggleButton, { key: 'Enter' });

    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
