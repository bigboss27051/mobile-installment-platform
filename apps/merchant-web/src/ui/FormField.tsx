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
  const message = error ? (
    <p className="mip-field__error" role="alert">
      {error}
    </p>
  ) : helperText ? (
    <p className="mip-field__helper">{helperText}</p>
  ) : null;

  return (
    <div className="mip-field">
      <label className="mip-field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="mip-field__required"> *</span> : null}
      </label>
      {children}
      {message}
    </div>
  );
}