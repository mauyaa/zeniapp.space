import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import path from 'path';

jest.setTimeout(20_000);

function requestHealth(port: number): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode ?? 0,
            body: JSON.parse(body) as Record<string, unknown>,
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(1_000, () => req.destroy(new Error('health request timed out')));
  });
}

async function waitForHealth(port: number, child: ChildProcess) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server exited before health became available (${child.exitCode})`);
    }
    try {
      return await requestHealth(port);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error('health did not become available while database was unreachable');
}

describe('server startup health', () => {
  it('binds liveness while the initial database connection is unavailable', async () => {
    const port = 41_000 + Math.floor(Math.random() * 1_000);
    const serverDir = path.resolve(__dirname, '..');
    const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', 'src/server.ts'], {
      cwd: serverDir,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(port),
        MONGO_URI: 'mongodb://127.0.0.1:1/zeni_startup_health',
      },
      stdio: 'ignore',
    });

    try {
      const response = await waitForHealth(port, child);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'zeni-api');
    } finally {
      child.kill();
    }
  });
});
