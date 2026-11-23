import MuiAlert from '@mui/material/Alert';

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const severity = tone === 'error' ? 'error' : tone === 'success' ? 'success' : 'info';
  const role = tone === 'error' ? 'alert' : 'status';

  return (
    <MuiAlert severity={severity} role={role}>
      {children}
    </MuiAlert>
  );
}