/**
 * AudioPlayerBar tests (#13) — ensure controls render and toggle play.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AudioPlayerBar from '../components/AudioPlayerBar';

const togglePlay = vi.fn();

vi.mock('../contexts/AudioContext', () => ({
  useAudio: () => ({
    currentTrack: { id: 'track-1', title: 'Test Story', source: 'Test Source', category: 'General' },
    isPlaying: false,
    isLoading: false,
    isTransitioning: false,
    currentTime: 0,
    duration: 120,
    togglePlay,
    seek: vi.fn(),
    playNext: vi.fn(),
    playPrev: vi.fn(),
    queue: [{ id: 'track-1', title: 'Test Story', source: 'Test Source' }],
    queueIndex: 0,
    removeFromQueue: vi.fn(),
    clearQueue: vi.fn(),
    playFromQueue: vi.fn(),
    reorderQueue: vi.fn(),
    volume: 0.6,
    isMuted: false,
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    autoPlay: true,
    setAutoPlay: vi.fn(),
    playbackRate: 1,
    setPlaybackRate: vi.fn(),
    stopTrack: vi.fn(),
  }),
}));

describe('AudioPlayerBar', () => {
  it('renders the play button and toggles play', () => {
    render(<AudioPlayerBar />);
    const playButton = screen.getByTestId('player-play-pause');
    fireEvent.click(playButton);
    expect(togglePlay).toHaveBeenCalled();
  });
});
