import type { ReactNode } from 'react';

export type PageProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Page({ title, children, actions }: PageProps) {
  return (
    <div className="mip-page">
      <div className="mip-page__header">
        <h1 className="mip-page__title">{title}</h1>
        {actions ? <div className="mip-page__actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}