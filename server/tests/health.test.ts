import request from 'supertest';
import { app } from '../src/app';

describe('health', () => {
  it('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.headers['cache-control']).toMatch(/max-age=10/);
  });

  it('GET /health/ready returns 200 when DB connected or 503 when not', async () => {
    const res = await request(app).get('/health/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('dbState');
  });
});
