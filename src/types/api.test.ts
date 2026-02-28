import { describe, it, expect } from 'vitest';
import { ApiError } from './api';

describe('ApiError', () => {
  it('creates error with message and status', () => {
    const err = new ApiError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('ApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('includes optional code', () => {
    const err = new ApiError('Conflict', 409, 'CONFLICT');
    expect(err.code).toBe('CONFLICT');
  });
});
