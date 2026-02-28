/* eslint-disable @typescript-eslint/no-explicit-any */
export function shouldSkipDbTests(): boolean {
  return Boolean((globalThis as any).__SKIP_DB_TESTS__ || process.env.SKIP_DB_TESTS === '1');
}
