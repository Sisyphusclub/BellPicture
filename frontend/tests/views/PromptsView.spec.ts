import { describe, expect, it } from 'vitest';

import { router } from '@/router';

describe('removed prompts route', () => {
  it('does not register the standalone prompts product page', () => {
    const routePaths = router.getRoutes().map((route) => route.path);

    expect(routePaths).not.toContain('/prompts');
  });
});
