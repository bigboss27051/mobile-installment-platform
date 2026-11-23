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
            fontSize: 14,
            color: MIP_TOKENS.text,
          },
          '& th': {
            backgroundColor: MIP_TOKENS.bg,
            fontWeight: 600,
          },
        }}
      >
        {children}
      </MuiTable>
    </TableContainer>
  );
}