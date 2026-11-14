import type { SelectHTMLAttributes } from 'react';

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={['mip-input', props.className].filter(Boolean).join(' ')} />;
}