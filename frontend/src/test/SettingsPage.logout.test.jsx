import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import SettingsPage from '../pages/SettingsPage';

const mockSignOut = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test', email: 'test@test.com' }, signOut: mockSignOut }),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: () => {} }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ saveSettings: vi.fn(), loading: false }),
}));

vi.mock('../components/BreakingNews', () => ({
  NotificationToggle: () => null,
}));

vi.mock('../components/features/DailyDigest', () => ({ default: () => null }));
vi.mock('../components/TourGuideModal', () => ({ openTourGuide: () => {}, resetTourGuide: () => {} }));
vi.mock('../components/HapticAlerts', () => ({ useHapticAlert: () => ({ showAlert: () => {} }) }));

function renderWithProviders() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <I18nextProvider i18n={i18n}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe('SettingsPage logout', () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue(undefined);
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it('redirects to / after logout', async () => {
    renderWithProviders();
    const logoutBtn = screen.getByTestId('logout-btn');
    await userEvent.click(logoutBtn);
    await vi.waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
