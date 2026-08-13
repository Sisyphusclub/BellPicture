import { describe, expect, it } from 'vitest';

import { productDateKey } from '../../src/utils/date.js';

describe('productDateKey', () => {
  it('uses the Asia/Shanghai calendar date across UTC boundaries', () => {
    expect(productDateKey(new Date('2026-08-12T16:30:00.000Z'))).toBe('2026-08-13');
  });
});
