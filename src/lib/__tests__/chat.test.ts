import { describe, it, expect } from 'vitest';
import { formatSummary } from '../chat';

describe('formatSummary', () => {
  it('builds summary from answers', () => {
    const result = formatSummary({
      budget: '2M',
      moveIn: 'March',
      viewing: 'in-person',
      mustHaves: 'parking'
    });
    expect(result).toContain('budget 2M');
    expect(result).toContain('move-in March');
    expect(result).toContain('prefers in-person viewing');
    expect(result).toContain('needs parking');
    expect(result).toContain('Interested in listing');
  });

  it('omits missing fields', () => {
    const result = formatSummary({ budget: '1M' });
    expect(result).toContain('budget 1M');
    expect(result).not.toContain('move-in');
    expect(result).not.toContain('mustHaves');
  });

  it('handles empty answers', () => {
    const result = formatSummary({});
    expect(result).toBe('Interested in listing: .');
  });
});
