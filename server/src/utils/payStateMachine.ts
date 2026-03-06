export type PayStatus = 'pending' | 'paid' | 'failed' | 'reversed';

const allowedTransitions: Record<PayStatus, PayStatus[]> = {
  pending: ['paid', 'failed'],
  paid: ['reversed'],
  failed: [],
  reversed: [],
};

export function canTransition(current: PayStatus, next: PayStatus) {
  if (current === next) return true;
  return allowedTransitions[current]?.includes(next);
}

export function assertTransition(current: PayStatus, next: PayStatus) {
  if (!canTransition(current, next)) {
    const error = new Error(`Invalid state transition ${current} -> ${next}`) as Error & {
      status?: number;
      code?: string;
    };
    error.status = 409;
    error.code = 'INVALID_STATE';
    throw error;
  }
}
