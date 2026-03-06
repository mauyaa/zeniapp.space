import { Counter } from 'prom-client';
import { registry } from '../middlewares/metrics';

type MetricKey = string;

const counters: Record<MetricKey, number> = {};
const promCounter = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Rate limit hits by bucket',
  labelNames: ['bucket'],
  registers: [registry],
});

export function recordRateLimit(key: MetricKey) {
  counters[key] = (counters[key] || 0) + 1;
  promCounter.inc({ bucket: key });
}

export function getRateLimitMetrics() {
  return { ...counters };
}
