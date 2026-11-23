import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <Box
      component="div"
      role="status"
      aria-live="polite"
      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
    >
      <CircularProgress size={20} aria-hidden />
      <Typography component="span" variant="body2">
        {label}
      </Typography>
    </Box>
  );
}