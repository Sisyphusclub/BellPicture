import { Image } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { getAppNavigation } from '@/config/navigation';

describe('app navigation', () => {
  it('uses a single-frame image icon for image generation', () => {
    expect(getAppNavigation().find((item) => item.to === '/generate')).toMatchObject({
      label: '生图',
      icon: Image,
    });
  });
});
