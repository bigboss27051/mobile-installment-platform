import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  variant = 'secondary',
  loading,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...rest}
      className={['mip-btn', `mip-btn--${variant}`, rest.className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
    >
      {loading ? <span className="mip-spinner mip-spinner--btn" aria-hidden /> : null}
      {children}
    </button>
  );
}