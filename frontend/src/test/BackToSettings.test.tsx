import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import BackToSettings from '../components/BackToSettings';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithProviders(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        {ui}
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe('BackToSettings', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('calls navigate(-1) when clicked', async () => {
    renderWithProviders(<BackToSettings />);
    const btn = screen.getByTestId('back-to-settings');
    await userEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
