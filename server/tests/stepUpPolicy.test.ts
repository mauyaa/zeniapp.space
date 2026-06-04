import { env } from '../src/config/env';
import {
  shouldAcceptLooseAdminStepUp,
  shouldAcceptLoosePayStepUp,
} from '../src/utils/stepUpPolicy';

describe('stepUpPolicy', () => {
  const savedNodeEnv = env.nodeEnv;

  afterEach(() => {
    (env as { nodeEnv: string }).nodeEnv = savedNodeEnv;
  });

  it('rejects loose admin step-up in production', () => {
    (env as { nodeEnv: string }).nodeEnv = 'production';
    expect(shouldAcceptLooseAdminStepUp('123456', '')).toBe(false);
  });

  it('rejects loose admin step-up in staging', () => {
    (env as { nodeEnv: string }).nodeEnv = 'staging';
    expect(shouldAcceptLooseAdminStepUp('123456', '')).toBe(false);
  });

  it('allows local development only when no static code is configured', () => {
    (env as { nodeEnv: string }).nodeEnv = 'development';
    expect(shouldAcceptLooseAdminStepUp('999999', '')).toBe(true);
    expect(shouldAcceptLooseAdminStepUp('999999', 'configured')).toBe(false);
  });

  it('test env is strict when static code is configured', () => {
    (env as { nodeEnv: string }).nodeEnv = 'test';
    expect(shouldAcceptLooseAdminStepUp('wrong', 'configured')).toBe(false);
  });

  it('test env allows loose when no static code is configured', () => {
    (env as { nodeEnv: string }).nodeEnv = 'test';
    expect(shouldAcceptLooseAdminStepUp('anything', '')).toBe(true);
  });

  it('pay policy also rejects loose staging step-up', () => {
    (env as { nodeEnv: string }).nodeEnv = 'staging';
    expect(shouldAcceptLoosePayStepUp('424242', '')).toBe(false);
  });
});
