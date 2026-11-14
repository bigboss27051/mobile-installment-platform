import type { InputHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={['mip-input', props.className].filter(Boolean).join(' ')} />;
}