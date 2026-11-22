import { createTheme } from '@mui/material/styles';

export const MIP_TOKENS = {
  primary: '#1d4ed8',
  text: '#1e293b',
  textSecondary: '#64748b',
  bg: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  error: '#dc2626',
  success: '#16a34a',
  sidebar: '#1e293b',
  radius: 6,
  inputHeight: 44,
  pageMax: 1200,
  formMax: 720,
  loginMax: 420,
  fontFamily: 'Inter, Sarabun, system-ui, sans-serif',
} as const;

export const mipTheme = createTheme({
  palette: {
    primary: { main: MIP_TOKENS.primary },
    error: { main: MIP_TOKENS.error },
    success: { main: MIP_TOKENS.success },
    text: {
      primary: MIP_TOKENS.text,
      secondary: MIP_TOKENS.textSecondary,
    },
    background: {
      default: MIP_TOKENS.bg,
      paper: MIP_TOKENS.surface,
    },
    divider: MIP_TOKENS.border,
  },
  shape: { borderRadius: MIP_TOKENS.radius },
  typography: {
    fontFamily: MIP_TOKENS.fontFamily,
    h1: { fontSize: 24, fontWeight: 600 },
    h2: { fontSize: 18, fontWeight: 600 },
    body1: { fontSize: 15 },
    body2: { fontSize: 14 },
    caption: { fontSize: 12 },
  },
  components: {
    MuiButton: {
      defaultProps: { size: 'medium' },
      styleOverrides: {
        root: {
          minHeight: MIP_TOKENS.inputHeight,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true, variant: 'outlined' },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { minHeight: MIP_TOKENS.inputHeight },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: 14 },
        head: { fontWeight: 600, backgroundColor: MIP_TOKENS.bg },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${MIP_TOKENS.border}`,
        },
      },
    },
  },
});