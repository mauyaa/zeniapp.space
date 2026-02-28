import { useEffect, useRef, useCallback, useState } from 'react';

const DEFAULT_IDLE_MINUTES = 30;
const WARN_BEFORE_MINUTES = 2;

/**
 * Session inactivity: warn then optionally log out after idle time.
 * Call from a component that has access to logout (e.g. a provider or layout).
 */
export function useSessionTimeout(
  logout: () => void,
  options?: { idleMinutes?: number; warnBeforeMinutes?: number; enabled?: boolean }
) {
  const idleMinutes = options?.idleMinutes ?? DEFAULT_IDLE_MINUTES;
  const warnBeforeMinutes = options?.warnBeforeMinutes ?? WARN_BEFORE_MINUTES;
  const enabled = options?.enabled ?? true;

  const [showWarn, setShowWarn] = useState(false);
  const lastActivity = useRef(Date.now());
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (warnTimer.current) {
      clearTimeout(warnTimer.current);
      warnTimer.current = null;
    }
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = null;
    }
    setShowWarn(false);
  }, []);

  const scheduleLogout = useCallback(() => {
    clearTimers();
    const idleMs = idleMinutes * 60 * 1000;
    const warnMs = (idleMinutes - warnBeforeMinutes) * 60 * 1000;

    warnTimer.current = setTimeout(() => setShowWarn(true), warnMs);
    logoutTimer.current = setTimeout(() => {
      setShowWarn(false);
      logout();
    }, idleMs);
  }, [idleMinutes, warnBeforeMinutes, logout, clearTimers]);

  const onActivity = useCallback(() => {
    if (!enabled) return;
    lastActivity.current = Date.now();
    clearTimers();
    scheduleLogout();
  }, [enabled, clearTimers, scheduleLogout]);

  useEffect(() => {
    if (!enabled) return;
    scheduleLogout();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, onActivity));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearTimers();
    };
  }, [enabled, onActivity, scheduleLogout, clearTimers]);

  const stayLoggedIn = useCallback(() => {
    lastActivity.current = Date.now();
    clearTimers();
    scheduleLogout();
  }, [clearTimers, scheduleLogout]);

  return { showWarn, stayLoggedIn };
}
