import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';

import { LandingAccountActions } from '@/components/landing/LandingAccountActions';

const onCheckIn = vi.fn(() =>
  Promise.resolve({
    checkedInToday: true,
    claimed: true,
    dailyCheckInReward: 5,
    remaining: 15,
    total: 15,
  }),
);

function renderActions({
  accountImage = null,
  isAuthenticated,
  onLogin = vi.fn(),
  onOpenImageApiKeySettings = vi.fn(),
}: {
  accountImage?: string | null;
  isAuthenticated: boolean;
  onLogin?: () => void;
  onOpenImageApiKeySettings?: () => void;
}) {
  render(
    <MemoryRouter>
      <LandingAccountActions
        accountImage={accountImage}
        accountName="Blur"
        checkedInToday={false}
        creditsRemaining={10}
        dailyCheckInReward={5}
        isAuthenticated={isAuthenticated}
        imageApiKeyConfigured={true}
        imageApiKeySuffix="4321"
        onCheckIn={onCheckIn}
        onLogin={onLogin}
        onLogout={vi.fn(() => Promise.resolve())}
        onOpenImageApiKeySettings={onOpenImageApiKeySettings}
        onNotify={vi.fn()}
      />
    </MemoryRouter>,
  );
}

it('opens authentication directly from an explicit login button', async () => {
  const user = userEvent.setup();
  const onLogin = vi.fn();
  renderActions({ isAuthenticated: false, onLogin });

  const login = screen.getByRole('button', { name: '登录' });
  expect(login).not.toHaveAttribute('aria-haspopup');
  expect(screen.queryByRole('button', { name: /账户：/ })).not.toBeInTheDocument();

  await user.click(login);
  expect(onLogin).toHaveBeenCalledOnce();
});

it('opens personal image API Key settings from the profile menu', async () => {
  const user = userEvent.setup();
  const onOpenImageApiKeySettings = vi.fn();
  renderActions({ isAuthenticated: true, onOpenImageApiKeySettings });

  await user.click(screen.getByRole('button', { name: '账户：Blur' }));
  const menu = screen.getByRole('menu');
  expect(within(menu).getByText('尾号 4321')).toBeInTheDocument();
  await user.click(within(menu).getByRole('button', { name: /生图 API Key/ }));

  expect(onOpenImageApiKeySettings).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
});

it('uses the profile image for the authenticated account trigger and menu', async () => {
  const user = userEvent.setup();
  renderActions({
    accountImage: 'https://images.example/google-profile.png',
    isAuthenticated: true,
  });

  const trigger = screen.getByRole('button', { name: '账户：Blur' });
  expect(trigger.querySelector('img')).toHaveAttribute(
    'src',
    'https://images.example/google-profile.png',
  );

  await user.click(trigger);
  const menu = screen.getByRole('menu');
  expect(within(menu).getByText('Blur')).toBeInTheDocument();
  expect(within(menu).getByRole('button', { name: '退出登录' })).toBeInTheDocument();
  expect(menu.querySelector('img')).toHaveAttribute(
    'src',
    'https://images.example/google-profile.png',
  );
});
