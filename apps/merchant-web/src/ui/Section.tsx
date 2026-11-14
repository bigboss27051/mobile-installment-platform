import type { ReactNode } from 'react';

export function Section({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="mip-section">
      {title ? <h2 className="mip-section__title">{title}</h2> : null}
      {children}
    </section>
  );
}