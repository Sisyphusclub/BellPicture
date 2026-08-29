import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';

import { OperationalPageHeader } from '@/components/common/OperationalPageHeader';
import { Button } from '@/components/ui/button';

it('renders a shared title row with quantity metadata and optional actions', () => {
  render(
    <OperationalPageHeader
      id="operational-title"
      title="运营页面"
      meta="12 项"
      actions={<Button type="button">新增</Button>}
    />,
  );

  const title = screen.getByRole('heading', { level: 1, name: '运营页面' });
  const header = title.closest('header');

  expect(header).toHaveClass('operational-page-header');
  expect(within(header!).getByText('12 项')).toHaveClass('operational-page-header__meta');
  expect(within(header!).getByRole('button', { name: '新增' })).toBeInTheDocument();
});
