import TableContainer from '@mui/material/TableContainer';
import MuiTable from '@mui/material/Table';
import type { TableHTMLAttributes } from 'react';

export function Table({ className, children, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <MuiTable size="small" className={className} {...rest}>
        {children}
      </MuiTable>
    </TableContainer>
  );
}
