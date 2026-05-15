const DOWNLOAD_ERROR_MESSAGE = '下载失败，请稍后重试。';

export async function downloadUrl(url: string, filename: string): Promise<void> {
  let objectUrl: string | null = null;
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(DOWNLOAD_ERROR_MESSAGE);

    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } catch (error) {
    if (error instanceof Error && error.message === DOWNLOAD_ERROR_MESSAGE) throw error;
    throw new Error(DOWNLOAD_ERROR_MESSAGE);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
