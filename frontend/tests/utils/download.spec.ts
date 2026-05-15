import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadUrl } from '@/utils/download';

describe('downloadUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('downloads fetched image bytes through a blob object URL', async () => {
    const imageBlob = new Blob(['image-bytes'], { type: 'image/png' });
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(imageBlob)));
    const createObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(() => 'blob:download-url');
    const revokeObjectURL = vi.fn<(url: string) => void>();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    await downloadUrl('http://localhost:3000/api/outputs/generated.png', 'generated.png');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/outputs/generated.png', {
      credentials: 'include',
    });
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download-url');
    expect(document.querySelector('a[download="generated.png"]')).toBeNull();
  });

  it('throws a Chinese error instead of navigating when the image fetch fails', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response('', { status: 404 })));
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadUrl('/missing.png', 'missing.png')).rejects.toThrow(
      '下载失败，请稍后重试。',
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
