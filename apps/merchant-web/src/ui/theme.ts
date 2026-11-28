import { createTheme } from '@mui/material/styles';

/** MUI `spacing` units: 1 = 8px. Use on Stack inside Section, forms, and action rows. */
export const MIP_STACK = {
  section: 2,
  form: 2,
  actions: 1,
} as const;

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
  fontFamily:
    '"IBM Plex Sans Thai", "Noto Sans Thai", Sarabun, "Leelawadee UI", Thonburi, system-ui, sans-serif',
} as const;

export const mipTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,
      lg: 1200,
      xl: 1536,
    },
  },
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
    fontSize: 15,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontFamily: 'var(--mip-font-heading)',
      fontSize: 'var(--mip-font-size-3xl)',
      fontWeight: 600,
      lineHeight: 'var(--mip-leading-tight)',
      letterSpacing: 'var(--mip-tracking-tight)',
    },
    h2: {
      fontFamily: 'var(--mip-font-heading)',
      fontSize: 'var(--mip-font-size-xl)',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.006em',
    },
    h3: {
      fontFamily: 'var(--mip-font-heading)',
      fontSize: 'var(--mip-font-size-lg)',
      fontWeight: 600,
      lineHeight: 1.45,
    },
    subtitle1: {
      fontSize: 'var(--mip-font-size-lg)',
      fontWeight: 500,
      lineHeight: 'var(--mip-leading-normal)',
    },
    subtitle2: {
      fontSize: 'var(--mip-font-size-md)',
      fontWeight: 600,
      lineHeight: 1.45,
    },
    body1: {
      fontSize: 'var(--mip-font-size-lg)',
      fontWeight: 400,
      lineHeight: 'var(--mip-leading-relaxed)',
    },
    body2: {
      fontSize: 'var(--mip-font-size-md)',
      fontWeight: 400,
      lineHeight: 'var(--mip-leading-normal)',
    },
    button: {
      fontSize: 'var(--mip-font-size-md)',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: 'var(--mip-tracking-wide)',
      textTransform: 'none',
    },
    caption: {
      fontSize: 'var(--mip-font-size-xs)',
      fontWeight: 400,
      lineHeight: 1.45,
      letterSpacing: 'var(--mip-tracking-wide)',
    },
    overline: {
      fontSize: 'var(--mip-font-size-xs)',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0.04em',
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        body: {
          fontFamily: 'var(--mip-font)',
          fontVariantNumeric: 'tabular-nums',
        },
        'button, input, select, textarea': {
          fontFamily: 'inherit',
        },
      },
    },
    MuiButton: {
      defaultProps: { size: 'medium' },
      styleOverrides: {
        root: {
          minHeight: MIP_TOKENS.inputHeight,
          fontFamily: 'inherit',
          fontSize: 'var(--mip-font-size-md)',
          fontWeight: 600,
          lineHeight: 1.5,
          letterSpacing: 'var(--mip-tracking-wide)',
          textTransform: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true, variant: 'outlined' },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          minHeight: MIP_TOKENS.inputHeight,
          fontFamily: 'inherit',
          fontSize: 'var(--mip-input-size)',
          lineHeight: 'var(--mip-leading-normal)',
        },
        input: {
          fontVariantNumeric: 'tabular-nums',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: 'var(--mip-label-size)',
          fontWeight: 500,
          lineHeight: 1.45,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: 'var(--mip-helper-size)',
          fontWeight: 400,
          lineHeight: 1.45,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: 'var(--mip-font-size-md)',
          lineHeight: 'var(--mip-leading-normal)',
          fontVariantNumeric: 'tabular-nums',
        },
        head: {
          fontSize: 'var(--mip-font-size-sm)',
          fontWeight: 600,
          letterSpacing: 'var(--mip-tracking-wide)',
          lineHeight: 1.4,
          color: MIP_TOKENS.textSecondary,
          backgroundColor: MIP_TOKENS.bg,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: 'inherit',
          fontSize: 'var(--mip-font-size-xs)',
          fontWeight: 500,
          lineHeight: 1.45,
          height: 'auto',
        },
        label: {
          lineHeight: 1.45,
          paddingTop: 2,
          paddingBottom: 2,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: 'var(--mip-font-size-xl)',
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: '-0.006em',
        },
      },
    },
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          fontSize: 'var(--mip-font-size-md)',
          lineHeight: 'var(--mip-leading-relaxed)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: 'var(--mip-font-size-xs)',
          fontWeight: 500,
          lineHeight: 1.45,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        message: {
          fontSize: 'var(--mip-font-size-md)',
          lineHeight: 'var(--mip-leading-normal)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 'var(--mip-font-size-md)',
          lineHeight: 'var(--mip-leading-normal)',
        },
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