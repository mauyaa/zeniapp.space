/**
 * Route prefetching - preloads lazy route chunks on hover/focus so navigation feels instant.
 *
 * How it works:
 * 1. Maps URL path prefixes to dynamic import() calls (same ones used by React.lazy)
 * 2. On hover or focus of a NavLink, triggers the import so the chunk is cached
 * 3. By the time the user clicks, the JS is already downloaded
 *
 * Chunks are only fetched once (browsers cache the module), so repeated hovers are free.
 */

type Loader = () => Promise<unknown>;

const routeModules: Record<string, Loader> = {
  // User portal
  '/app/explore': () => import('../pages/user/Explore'),
  '/app/inventory': () => import('../pages/user/Inventory'),
  '/app/saved': () => import('../pages/user/Saved'),
  '/app/viewings': () => import('../pages/user/Viewings'),
  '/app/messages': () => import('../pages/messages/Layout'),
  '/app/profile': () => import('../pages/user/Profile'),
  // Agent portal
  '/agent/dashboard': () => import('../pages/agent/Dashboard'),
  '/agent/listings': () => import('../pages/agent/Listings'),
  '/agent/leads': () => import('../pages/agent/Leads'),
  '/agent/analytics': () => import('../pages/agent/Analytics'),
  '/agent/verification': () => import('../pages/agent/Verification'),
  '/agent/settings': () => import('../pages/agent/Settings'),
  '/agent/viewings': () => import('../pages/agent/Viewings'),
  '/agent/messages': () => import('../pages/messages/Layout'),
  // Admin portal
  '/admin/overview': () => import('../pages/admin/Overview'),
  '/admin/verification': () => import('../pages/admin/AdminVerificationPage'),
  '/admin/reports': () => import('../pages/admin/Reports'),
  '/admin/users': () => import('../pages/admin/Users'),
  '/admin/listings': () => import('../pages/admin/Listings'),
  '/admin/audit': () => import('../pages/admin/Audit'),
  '/admin/network-access': () => import('../pages/admin/NetworkAccess'),
  '/admin/settings': () => import('../pages/admin/Settings'),
  '/admin/messages': () => import('../pages/messages/Layout'),
};

const prefetched = new Set<string>();

/**
 * Prefetch the JS chunk for a route path.
 * Safe to call multiple times - only fetches once.
 */
export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;

  // Find the best matching route (exact match first, then prefix)
  const loader =
    routeModules[path] ??
    Object.entries(routeModules).find(([prefix]) => path.startsWith(prefix))?.[1];

  if (loader) {
    prefetched.add(path);
    // Use requestIdleCallback when available so prefetch does not compete with user interactions.
    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
        () => loader().catch(() => undefined)
      );
    } else {
      // Fallback: slight delay to avoid contention.
      setTimeout(() => loader().catch(() => undefined), 100);
    }
  }
}

/**
 * Returns event handlers to attach to navigation links for prefetching on hover/focus.
 */
export function prefetchHandlers(to: string) {
  return {
    onMouseEnter: () => prefetchRoute(to),
    onFocus: () => prefetchRoute(to),
    // Touch devices: prefetch on touch start for faster tap response.
    onTouchStart: () => prefetchRoute(to),
  };
}
