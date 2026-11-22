import type { SelectProps } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import type { ChangeEventHandler, FocusEventHandler, SelectHTMLAttributes } from 'react';

export function Select({
  className,
  id,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  required,
  disabled,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <TextField
      select
      className={className}
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange as unknown as ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>}
      onBlur={onBlur as unknown as FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>}
      required={required}
      disabled={disabled}
      slotProps={{ select: { native: true, ...rest } as Partial<SelectProps> }}
    >
      {children}
    </TextField>
  );
}
