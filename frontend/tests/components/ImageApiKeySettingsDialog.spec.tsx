import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

const imageApiKey = vi.hoisted(
  (): {
    status: {
      configured: boolean;
      keySuffix?: string;
    } | null;
    isLoading: boolean;
    isMutating: boolean;
    error: Error | null;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  } => ({
    status: { configured: true, keySuffix: '4321' },
    isLoading: false,
    isMutating: false,
    error: null,
    save: vi.fn(),
    remove: vi.fn(),
  }),
);

vi.mock('@/hooks/useImageApiKey', () => ({
  useImageApiKey: () => ({
    ...imageApiKey,
    refresh: vi.fn(),
  }),
}));

import { ImageApiKeySettingsDialog } from '@/components/settings/ImageApiKeySettingsDialog';

beforeEach(() => {
  vi.clearAllMocks();
  imageApiKey.status = { configured: true, keySuffix: '4321' };
  imageApiKey.isLoading = false;
  imageApiKey.isMutating = false;
  imageApiKey.error = null;
  imageApiKey.save.mockResolvedValue({ configured: true, keySuffix: '9876' });
  imageApiKey.remove.mockResolvedValue({ configured: false });
});

it('shows only the saved suffix and validates a replacement without retaining it in the field', async () => {
  const user = userEvent.setup();
  render(<ImageApiKeySettingsDialog open onClose={vi.fn()} />);

  expect(screen.getByText('已连接 · 尾号 4321')).toBeInTheDocument();
  expect(screen.queryByDisplayValue(/4321/u)).not.toBeInTheDocument();
  const input = screen.getByLabelText('sub2api Key');
  await user.type(input, 'sk-replacement-9876');
  await user.click(screen.getByRole('button', { name: '验证并替换' }));

  await waitFor(() => expect(imageApiKey.save).toHaveBeenCalledWith('sk-replacement-9876'));
  expect(input).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('已验证并保存。');
});

it('removes the configured key through an explicit action', async () => {
  const user = userEvent.setup();
  render(<ImageApiKeySettingsDialog open onClose={vi.fn()} />);

  await user.click(screen.getByRole('button', { name: '移除 Key' }));

  await waitFor(() => expect(imageApiKey.remove).toHaveBeenCalledOnce());
  expect(screen.getByRole('status')).toHaveTextContent('已移除，将使用平台额度。');
});

it('renders a localized validation error without exposing a raw provider response', () => {
  imageApiKey.error = new Error('这个 API Key 未通过 sub2api 鉴权。');
  render(<ImageApiKeySettingsDialog open onClose={vi.fn()} />);

  expect(screen.getByText('这个 API Key 未通过 sub2api 鉴权。')).toBeInTheDocument();
});

it('saves the 2K/4K key as a separate group', async () => {
  const user = userEvent.setup();
  render(<ImageApiKeySettingsDialog open onClose={vi.fn()} />);

  await user.type(screen.getByLabelText('2K/4K 分组 Key'), 'sk-high-res-4444');
  const highResForm = screen.getByLabelText('2K/4K 分组 Key').closest('form');
  await user.click(highResForm!.querySelector<HTMLButtonElement>('button[type="submit"]')!);

  await waitFor(() =>
    expect(imageApiKey.save).toHaveBeenCalledWith('sk-high-res-4444', 'high-res'),
  );
});
