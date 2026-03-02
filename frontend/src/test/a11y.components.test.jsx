/**
 * Accessibility tests using axe-core via jest-axe.
 * Run with: npm test -- a11y.components
 * Failures print full violation details (rule id, impact, nodes, help, WCAG).
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import React from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import NarvoLogo from '../components/NarvoLogo';
import { ThemeToggle } from '../components/ThemeToggle';

describe('A11y: components', () => {
  it('NarvoLogo has no axe violations', async () => {
    const { container } = render(<NarvoLogo alt="Narvo" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ThemeToggle has no axe violations', async () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle showLabel />
      </ThemeProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
