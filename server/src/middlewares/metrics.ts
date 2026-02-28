import { collectDefaultMetrics, Counter, Histogram, Registry, Gauge } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'HTTP requests total',
  labelNames: ['method', 'path', 'status'],
  registers: [registry]
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in ms',
  labelNames: ['method', 'path', 'status'],
  buckets: [50, 100, 200, 500, 1000, 2000],
  registers: [registry]
});

// Generic gauges for external modules to update
export const customGauges: Record<string, Gauge<string>> = {};
export const customCounters: Record<string, Counter<string>> = {};

export function getOrCreateGauge(name: string, help: string, labelNames: string[] = []) {
  if (customGauges[name]) return customGauges[name];
  const gauge = new Gauge({ name, help, labelNames, registers: [registry] });
  customGauges[name] = gauge;
  return gauge;
}

export function getOrCreateCounter(name: string, help: string, labelNames: string[] = []) {
  if (customCounters[name]) return customCounters[name];
  const counter = new Counter({ name, help, labelNames, registers: [registry] });
  customCounters[name] = counter;
  return counter;
}

const sanitizePath = (path: string) =>
  path
    // replace Mongo IDs / UUID-like tokens
    .replace(/[a-f0-9]{24}/gi, ':id')
    // replace long numeric ids
    .replace(/\b\d{6,}\b/g, ':id')
    // collapse duplicate slashes
    .replace(/\/+/g, '/');

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const rawPath = req.route?.path || req.path || req.originalUrl || 'unknown';
    const labels = { method: req.method, path: sanitizePath(rawPath), status: res.statusCode.toString() };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });
  next();
}

export function metricsHandler(_req: Request, res: Response) {
  res.setHeader('Content-Type', registry.contentType);
  res.end(registry.metrics());
}
