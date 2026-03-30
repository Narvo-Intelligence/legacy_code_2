import type React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePullToRefresh from '../hooks/usePullToRefresh';

describe('usePullToRefresh', () => {
  it('returns disabled pull state when disabled=true', () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(onRefresh, { disabled: true }));

    expect(result.current.pulling).toBe(false);
    expect(result.current.refreshing).toBe(false);

    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientY: 100 } as Touch],
    });
    act(() => {
      result.current.handlers.onTouchStart(touchStart as unknown as React.TouchEvent);
    });
    expect(result.current.pulling).toBe(false);
  });

  it('calls onRefresh when pull exceeds threshold and not disabled', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh(onRefresh, { threshold: 50 }));

    const div = document.createElement('div');
    div.scrollTop = 0;
    (result.current.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = div;

    act(() => {
      result.current.handlers.onTouchStart({
        touches: [{ clientY: 0 }],
        preventDefault: () => {},
      } as unknown as React.TouchEvent);
    });

    act(() => {
      result.current.handlers.onTouchMove({
        touches: [{ clientY: 150 }],
        preventDefault: () => {},
      } as unknown as React.TouchEvent);
    });

    await act(async () => {
      result.current.handlers.onTouchEnd();
    });

    expect(onRefresh).toHaveBeenCalled();
  });
});
