import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    // Update value
    rerender({ value: 'ab' });
    expect(result.current).toBe('a'); // Still old value

    // Fast-forward partially
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('a'); // Still old value

    // Fast-forward past delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('ab'); // Now updated
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'abc' }); // Reset timer
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a'); // Timer was reset, so still old

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc'); // Now updated to latest
  });
});
