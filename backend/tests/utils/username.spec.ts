import { describe, expect, it } from 'vitest';

import { internalEmailForUsername } from '../../src/utils/username.js';

describe('internalEmailForUsername', () => {
  it('uses the Nebulens internal identity domain', () => {
    expect(internalEmailForUsername('creator')).toBe('creator@users.nebulens.local');
  });
});
