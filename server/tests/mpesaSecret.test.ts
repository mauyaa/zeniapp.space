import { shouldSkipDbTests } from './skipDb';
describe('mpesa secret requirement', () => {
  it('disables callbacks in production when secret is missing', async () => {
    if (shouldSkipDbTests()) return;
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.MPESA_CALLBACK_SECRET;

    process.env.NODE_ENV = 'production';
    delete process.env.MPESA_CALLBACK_SECRET;

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- Jest resetModules requires CJS require
    const mpesa = require('../src/services/mpesa.service') as typeof import('../src/services/mpesa.service');

    expect(mpesa.isMpesaCallbackSecretConfigured()).toBe(false);
    expect(mpesa.verifyCallbackSignature(undefined)).toBe(false);

    await expect(mpesa.initiateStk('invoice', '0712345678', 10)).rejects.toMatchObject({
      status: 503,
      code: 'MPESA_DISABLED',
    });

    process.env.NODE_ENV = originalEnv;
    if (originalSecret !== undefined) {
      process.env.MPESA_CALLBACK_SECRET = originalSecret;
    }
    jest.resetModules();
  });
});
