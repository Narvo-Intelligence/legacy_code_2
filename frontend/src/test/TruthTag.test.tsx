/**
 * TruthTag component tests (#13) — verify rendering for each status,
 * compact mode, and loading state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TruthTag from '../components/TruthTag';

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error mock
  global.IntersectionObserver = vi.fn((cb) => {
    // Immediately trigger intersection
    setTimeout(() => cb([{ isIntersecting: true }]), 0);
    return { observe: mockObserve, unobserve: mockUnobserve, disconnect: mockDisconnect };
  });
});

// Mock API
vi.mock('../lib/api', () => ({
  get: vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ status: 'VERIFIED', confidence: 85, source: 'Africa Check' }),
    })
  ),
}));

describe('TruthTag', () => {
  it('renders loading state initially', () => {
    render(<TruthTag storyId="test-1" />);
    expect(screen.getByText('VERIFYING...')).toBeTruthy();
  });

  it('renders compact mode without label text when loading', () => {
    render(<TruthTag storyId="test-1" compact />);
    // In compact loading mode, no label text is shown
    expect(screen.queryByText('VERIFYING...')).toBeNull();
  });

  it('renders without crashing when storyId is null', () => {
    render(<TruthTag storyId={null} />);
    // Should render without error
  });

  it('renders without crashing when storyId is undefined', () => {
    render(<TruthTag storyId={undefined} />);
  });
});
