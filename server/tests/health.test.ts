import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { env } from '../src/config/env';
import { buildContentSecurityPolicy } from '../src/config/securityHeaders';

describe('health', () => {
  it('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.headers['cache-control']).toMatch(/max-age=10/);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('GET /ready returns the JSON readiness contract', async () => {
    const res = await request(app).get('/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('service', 'zeni-api');
    expect(res.body).toHaveProperty('dbState');
  });

  it('GET /health/ready returns 200 when DB connected or 503 when not', async () => {
    const res = await request(app).get('/health/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('dbState');
  });

  it('returns 503 for API routes when DB is not ready', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');

    Object.defineProperty(mongoose.connection, 'readyState', {
      configurable: true,
      get: () => 0,
    });

    try {
      const res = await request(app).get('/api/listings');
      expect(res.status).toBe(503);
      expect(res.body).toHaveProperty('code', 'SERVICE_UNAVAILABLE');
      expect(res.headers['retry-after']).toBe('3');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(mongoose.connection, 'readyState', originalDescriptor);
      } else {
        delete (mongoose.connection as unknown as Record<string, unknown>).readyState;
      }
    }
  });

  it('uses an explicit production CSP connection allowlist', () => {
    const policy = buildContentSecurityPolicy('production');
    const connectSrc = policy.directives.connectSrc;
    expect(connectSrc).not.toContain('*');
    expect(connectSrc).not.toContain('http:');
    expect(connectSrc).not.toContain('https:');
    expect(policy.directives.imgSrc).toContain('https://res.cloudinary.com');
  });

  it('filters broad or insecure operator-provided CSP sources in production', () => {
    const originalConnect = env.cspConnectSrc;
    const originalImages = env.cspImgSrc;
    env.cspConnectSrc =
      '*,http:,https:,http://unsafe.test,ws://unsafe.test,https://api.zeni.test,wss://socket.zeni.test';
    env.cspImgSrc = '*,https:,http://unsafe.test,https://cdn.zeni.test';
    try {
      const policy = buildContentSecurityPolicy('production');
      expect(policy.directives.connectSrc).toEqual(
        expect.arrayContaining(['https://api.zeni.test', 'wss://socket.zeni.test'])
      );
      expect(policy.directives.connectSrc).not.toEqual(
        expect.arrayContaining(['*', 'http:', 'https:', 'http://unsafe.test', 'ws://unsafe.test'])
      );
      expect(policy.directives.imgSrc).toContain('https://cdn.zeni.test');
      expect(policy.directives.imgSrc).not.toEqual(
        expect.arrayContaining(['*', 'https:', 'http://unsafe.test'])
      );
    } finally {
      env.cspConnectSrc = originalConnect;
      env.cspImgSrc = originalImages;
    }
  });
});
