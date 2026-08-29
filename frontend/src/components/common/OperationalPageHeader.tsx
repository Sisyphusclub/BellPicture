import type { ReactNode } from 'react';

interface OperationalPageHeaderProps {
  id: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function OperationalPageHeader({ id, title, meta, actions }: OperationalPageHeaderProps) {
  return (
    <header className="operational-page-header">
      <div className="operational-page-header__title">
        <h1 id={id}>{title}</h1>
        {meta ? (
          <span className="operational-page-header__meta" aria-live="polite">
            {meta}
          </span>
        ) : null}
      </div>
      {actions ? <div className="operational-page-header__actions">{actions}</div> : null}
    </header>
  );
}
