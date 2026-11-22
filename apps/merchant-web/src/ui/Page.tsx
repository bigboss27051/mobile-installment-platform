import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { MIP_TOKENS } from './theme';

export type PageProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Page({ title, children, actions }: PageProps) {
  return (
    <Box sx={{ maxWidth: MIP_TOKENS.pageMax, mx: 'auto', width: '100%' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          mb: 3,
          gap: 2,
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {actions ? <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{actions}</Box> : null}
      </Stack>
      {children}
    </Box>
  );
}
