import type { ButtonHTMLAttributes, ReactNode } from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

function mapVariant(variant: Variant): {
  muiVariant: 'contained' | 'outlined' | 'text';
  color: 'primary' | 'error' | 'inherit';
} {
  switch (variant) {
    case 'primary':
      return { muiVariant: 'contained', color: 'primary' };
    case 'secondary':
      return { muiVariant: 'outlined', color: 'inherit' };
    case 'danger':
      return { muiVariant: 'contained', color: 'error' };
    case 'ghost':
      return { muiVariant: 'text', color: 'inherit' };
  }
}

export function Button({
  variant: mipVariant = 'secondary',
  loading,
  children,
  disabled,
  className,
  type,
  onClick,
  autoFocus,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}) {
  const { muiVariant, color } = mapVariant(mipVariant);

  return (
    <MuiButton
      type={type}
      variant={muiVariant}
      color={color}
      disabled={disabled || loading}
      className={className}
      onClick={onClick}
      autoFocus={autoFocus}
      startIcon={
        loading ? <CircularProgress size={16} color="inherit" aria-hidden /> : undefined
      }
      {...rest}
    >
      {children}
    </MuiButton>
  );
}