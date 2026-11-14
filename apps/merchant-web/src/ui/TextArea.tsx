import type { TextareaHTMLAttributes } from 'react';

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={['mip-textarea', props.className].filter(Boolean).join(' ')}
    />
  );
}