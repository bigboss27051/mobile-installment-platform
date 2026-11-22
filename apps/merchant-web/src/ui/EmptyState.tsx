import Typography from '@mui/material/Typography';

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Typography component="p" variant="body2" color="text.secondary">
      {children}
    </Typography>
  );
}