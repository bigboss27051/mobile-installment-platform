import TextField from '@mui/material/TextField';
import type { InputHTMLAttributes } from 'react';

export function Input({
  className,
  id,
  name,
  type,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  required,
  disabled,
  readOnly,
  autoComplete,
  min,
  max,
  step,
  inputMode,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TextField
      className={className}
      id={id}
      name={name}
      type={type}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      slotProps={{ htmlInput: { readOnly, min, max, step, inputMode, ...rest } }}
    />
  );
}
