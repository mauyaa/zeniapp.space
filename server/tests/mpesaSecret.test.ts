import { shouldSkipDbTests } from './skipDb';
describe('mpesa secret requirement', () => {
  it('throws in production when callback secret is missing', () => {
    if (shouldSkipDbTests()) return;
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.MPESA_CALLBACK_SECRET;

    process.env.NODE_ENV = 'production';
    delete process.env.MPESA_CALLBACK_SECRET;

    expect(() => {
      jest.resetModules();
      require('../src/services/mpesa.service');
    }).toThrow('MPESA_CALLBACK_SECRET is required in production');

    process.env.NODE_ENV = originalEnv;
    if (originalSecret !== undefined) {
      process.env.MPESA_CALLBACK_SECRET = originalSecret;
    }
    jest.resetModules();
  });
});

