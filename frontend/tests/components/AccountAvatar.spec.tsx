import { fireEvent, render } from '@testing-library/react';
import { expect, it } from 'vitest';

import { AccountAvatar } from '@/components/common/AccountAvatar';

it('shows the account image and falls back to the account initial when it fails', () => {
  const { container, rerender } = render(
    <AccountAvatar image="https://images.example/blur.png" name="Blur" />,
  );

  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', 'https://images.example/blur.png');
  expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');

  fireEvent.error(image!);
  expect(container.querySelector('img')).not.toBeInTheDocument();
  expect(container.querySelector('.user-avatar__fallback')).toHaveTextContent('B');

  rerender(<AccountAvatar image="https://images.example/new.png" name="Blur" />);
  expect(container.querySelector('img')).toHaveAttribute('src', 'https://images.example/new.png');
});

it('uses a neutral fallback for an empty account name', () => {
  const { container } = render(<AccountAvatar image={null} name=" " />);

  expect(container.querySelector('.user-avatar__fallback')).toHaveTextContent('N');
});
