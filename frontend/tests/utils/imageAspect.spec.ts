import { afterEach, describe, expect, it, vi } from 'vitest';

import { closestAspectRatio, resolveAspectChoice } from '@/utils/imageAspect';

describe('imageAspect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [1024, 1024, '1:1'],
    [750, 1000, '3:4'],
    [1200, 900, '4:3'],
    [1920, 1080, '16:9'],
    [1080, 1920, '9:16'],
    [800, 1200, '2:3'],
    [1500, 1000, '3:2'],
  ] as const)('maps %sx%s to %s', (width, height, expected) => {
    expect(closestAspectRatio(width, height)).toBe(expected);
  });

  it('falls back to 1:1 without a readable reference image', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unreadable')));

    await expect(resolveAspectChoice('auto', new File(['invalid'], 'invalid.png'))).resolves.toBe(
      '1:1',
    );
    await expect(resolveAspectChoice('auto')).resolves.toBe('1:1');
  });

  it('keeps an explicit aspect ratio without inspecting the reference', async () => {
    const createBitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', createBitmap);

    await expect(resolveAspectChoice('3:2', new File(['image'], 'image.png'))).resolves.toBe('3:2');
    expect(createBitmap).not.toHaveBeenCalled();
  });
});
