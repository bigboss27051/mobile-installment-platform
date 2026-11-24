import TableContainer from '@mui/material/TableContainer';
import MuiTable from '@mui/material/Table';
import type { TableHTMLAttributes } from 'react';
import { MIP_TOKENS } from './theme';

export function Table({ className, children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <MuiTable
        size="small"
        className={className}
        {...rest}
        sx={{
          width: '100%',
          '& th, & td': {
            textAlign: 'left',
            padding: '8px 12px',
            borderBottom: `1px solid ${MIP_TOKENS.border}`,
            fontVariantNumeric: 'tabular-nums',
          },
          '& td': {
            fontSize: 'var(--mip-font-size-md)',
            fontWeight: 'var(--mip-weight-regular)',
            lineHeight: 'var(--mip-leading-normal)',
            color: MIP_TOKENS.text,
          },
          '& th': {
            backgroundColor: MIP_TOKENS.bg,
            fontSize: 'var(--mip-font-size-sm)',
            fontWeight: 'var(--mip-weight-semibold)',
            lineHeight: 1.4,
            letterSpacing: 'var(--mip-tracking-wide)',
            color: MIP_TOKENS.textSecondary,
          },
        }}
      >
        {children}
      </MuiTable>
    </TableContainer>
  );
}