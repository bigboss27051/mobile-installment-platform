import TextField from '@mui/material/TextField';
import type { TextareaHTMLAttributes } from 'react';

export function TextArea({
  className,
  id,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  required,
  disabled,
  readOnly,
  rows = 3,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <TextField
      className={className}
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      multiline
      minRows={typeof rows === 'number' ? rows : 3}
      slotProps={{ htmlInput: { readOnly, ...rest } }}
    />
  );
}
