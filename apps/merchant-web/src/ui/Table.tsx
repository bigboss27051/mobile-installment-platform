import type { TableHTMLAttributes } from 'react';

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="mip-table-wrap">
      <table {...props} className={['mip-table', props.className].filter(Boolean).join(' ')} />
    </div>
  );
}