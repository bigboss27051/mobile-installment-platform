import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export function Section({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <Paper component="section" sx={{ p: 2, mb: 4 }}>
      {title ? (
        <Typography variant="h2" component="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
      ) : null}
      <Box>{children}</Box>
    </Paper>
  );
}
