import Box from '@mui/material/Box';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import type { ReactNode } from 'react';

export type FormFieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  helperText?: string;
  error?: string | null;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  required,
  helperText,
  error,
  children,
}: FormFieldProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <InputLabel
        htmlFor={htmlFor}
        required={required}
        sx={{
          position: 'static',
          transform: 'none',
          fontSize: 14,
          fontWeight: 500,
          color: 'text.primary',
          mb: 0,
        }}
      >
        {label}
      </InputLabel>
      {children}
      {error ? (
        <FormHelperText error component="p" role="alert" sx={{ m: 0 }}>
          {error}
        </FormHelperText>
      ) : helperText ? (
        <FormHelperText component="p" sx={{ m: 0 }}>
          {helperText}
        </FormHelperText>
      ) : null}
    </Box>
  );
}
