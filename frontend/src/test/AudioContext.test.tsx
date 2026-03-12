/**
 * AudioContext tests (#13) — verify queue management and state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AudioProvider, useAudio } from '../contexts/AudioContext';

// Mock dependencies
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('../lib/api', () => ({
  get: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
  post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));

vi.mock('../lib/audioCache', () => ({
  getCachedAudio: vi.fn(() => Promise.resolve(null)),
  cacheAudio: vi.fn(() => Promise.resolve(true)),
  downloadAndCacheAudio: vi.fn(() => Promise.resolve(true)),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AudioProvider>{children}</AudioProvider>
);

describe('AudioContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides default values', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.queue).toEqual([]);
    expect(result.current.autoPlay).toBe(true);
    expect(result.current.volume).toBeCloseTo(0.8);
    expect(result.current.broadcastLanguage).toBe('en');
    expect(result.current.voiceModel).toBe('emma');
  });

  it('addToQueue adds tracks', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    act(() => {
      result.current.addToQueue({ id: 'track-1', title: 'Test Track' });
    });
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].id).toBe('track-1');
  });

  it('addToQueue prevents duplicates', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    act(() => {
      result.current.addToQueue({ id: 'track-1', title: 'Test Track' });
      result.current.addToQueue({ id: 'track-1', title: 'Test Track' });
    });
    expect(result.current.queue).toHaveLength(1);
  });

  it('removeFromQueue removes by id', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    act(() => {
      result.current.addToQueue({ id: 'track-1', title: 'A' });
      result.current.addToQueue({ id: 'track-2', title: 'B' });
    });
    act(() => {
      result.current.removeFromQueue('track-1');
    });
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].id).toBe('track-2');
  });

  it('clearQueue empties the queue', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    act(() => {
      result.current.addToQueue({ id: 'track-1', title: 'A' });
      result.current.addToQueue({ id: 'track-2', title: 'B' });
    });
    act(() => {
      result.current.clearQueue();
    });
    expect(result.current.queue).toEqual([]);
  });

  it('setVolume updates volume', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    act(() => {
      result.current.setVolume(0.5);
    });
    expect(result.current.volume).toBeCloseTo(0.5);
  });

  it('toggleMute toggles muted state', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    const wasMuted = result.current.isMuted;
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(!wasMuted);
  });

  it('setAutoPlay toggles auto-play', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    act(() => {
      result.current.setAutoPlay(false);
    });
    expect(result.current.autoPlay).toBe(false);
  });

  it('setBroadcastLanguage updates language', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    act(() => {
      result.current.setBroadcastLanguage('yo');
    });
    expect(result.current.broadcastLanguage).toBe('yo');
  });

  it('setPlaybackRate updates rate', () => {
    const { result } = renderHook(() => useAudio(), { wrapper });
    act(() => {
      result.current.setPlaybackRate(1.5);
    });
    expect(result.current.playbackRate).toBeCloseTo(1.5);
  });
});
