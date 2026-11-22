# Merchant Web MUI Adapter UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Merchant Web presentation to Material UI via thin `./ui` adapters and a compact MIP theme, covering the full app shell and all pages without changing business logic or API behavior.

**Architecture:** Install MUI in `apps/merchant-web`. Add `createTheme` + `ThemeProvider`. Reimplement `src/ui/*` components with MUI while keeping the same export names and prop contracts. Refactor shell/login layout to MUI Drawer/Box. Retire redundant CSS; keep only layout utilities that pages still reference (`mip-form-grid`, chips, etc.) until those call sites are switched to `Stack`/`Grid`/`sx`.

**Tech Stack:** React 18, Vite, TypeScript, Vitest, `@mui/material`, `@emotion/react`, `@emotion/styled`

**Spec:** `docs/superpowers/specs/2026-11-22-merchant-web-mui-adapter-ui-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/merchant-web/package.json` | Add MUI + Emotion deps |
| `apps/merchant-web/src/ui/theme.ts` | `createTheme` + exported MIP token constants |
| `apps/merchant-web/src/ui/theme.spec.ts` | Lock palette, radius, max widths, spacing |
| `apps/merchant-web/src/main.tsx` | Wrap with `ThemeProvider` + `CssBaseline` |
| `apps/merchant-web/src/ui/Button.tsx` | MUI Button adapter |
| `apps/merchant-web/src/ui/Input.tsx` | MUI TextField adapter |
| `apps/merchant-web/src/ui/TextArea.tsx` | Multiline TextField adapter |
| `apps/merchant-web/src/ui/Select.tsx` | Native-select TextField adapter (`<option>` children) |
| `apps/merchant-web/src/ui/FormField.tsx` | FormControl + label + helper/error |
| `apps/merchant-web/src/ui/FormField.spec.tsx` | Assert required/error without CSS class names |
| `apps/merchant-web/src/ui/Page.tsx` | Container + header Stack |
| `apps/merchant-web/src/ui/Page.spec.tsx` | Title via accessible heading |
| `apps/merchant-web/src/ui/Section.tsx` | Paper section |
| `apps/merchant-web/src/ui/Table.tsx` | TableContainer + dense Table |
| `apps/merchant-web/src/ui/Alert.tsx` | MUI Alert |
| `apps/merchant-web/src/ui/ConfirmDialog.tsx` | MUI Dialog |
| `apps/merchant-web/src/ui/Spinner.tsx` | CircularProgress row |
| `apps/merchant-web/src/ui/EmptyState.tsx` | MUI Typography |
| `apps/merchant-web/src/ui/tokens.css` | Keep width/spacing CSS vars for leftover utilities |
| `apps/merchant-web/src/ui/ui.css` | Slim leftovers: form-grid, chips, toast, muted, pre |
| `apps/merchant-web/src/styles.css` | Minimal global + remove old shell CSS after App shell migrate |
| `apps/merchant-web/src/App.tsx` | Shell Drawer presentation only; login Paper |
| `apps/merchant-web/src/devices-page.tsx` | Spacing/`sx` polish only if needed |
| `apps/merchant-web/src/enroll-page.tsx` | Spacing/`sx` polish only if needed |
| `apps/merchant-web/src/device-status-panel.tsx` | Spacing polish only |
| `apps/merchant-web/src/device-command-panel.tsx` | Spacing polish only |
| `apps/merchant-web/src/line-settings-page.tsx` | Spacing polish only |
| `apps/merchant-web/src/line-link-panel.tsx` | Spacing polish only |
| `apps/merchant-web/src/kyc-panel.tsx` | Spacing polish only |
| `docs/project-management/DECISION-LOG.md` | UI-MUI-001…006 |
| `docs/project-management/CHANGELOG.md` | Merchant Web MUI entry |

**Do not modify:** `api.ts` request/response logic, backend, Flutter, Android DPC, handler bodies / payload shapes in pages.

---

### Task 1: Install MUI and add theme

**Files:**
- Modify: `apps/merchant-web/package.json`
- Create: `apps/merchant-web/src/ui/theme.ts`
- Create: `apps/merchant-web/src/ui/theme.spec.ts`
- Modify: `apps/merchant-web/src/main.tsx`
- Modify: `apps/merchant-web/src/ui/tokens.spec.ts` (re-export assertions via theme or keep CSS sync)

- [ ] **Step 1: Install dependencies from repo root**

```bash
pnpm --filter @mip/merchant-web add @mui/material @emotion/react @emotion/styled
```

Expected: `apps/merchant-web/package.json` lists those three dependencies.

- [ ] **Step 2: Write failing theme test**

Create `apps/merchant-web/src/ui/theme.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mipTheme, MIP_TOKENS } from './theme';

describe('mipTheme', () => {
  it('maps compact enterprise palette and shape', () => {
    expect(MIP_TOKENS.primary).toBe('#1d4ed8');
    expect(MIP_TOKENS.text).toBe('#1e293b');
    expect(MIP_TOKENS.bg).toBe('#f8fafc');
    expect(MIP_TOKENS.sidebar).toBe('#1e293b');
    expect(MIP_TOKENS.radius).toBe(6);
    expect(MIP_TOKENS.pageMax).toBe(1200);
    expect(MIP_TOKENS.formMax).toBe(720);
    expect(MIP_TOKENS.loginMax).toBe(420);
    expect(MIP_TOKENS.inputHeight).toBe(44);
    expect(mipTheme.palette.primary.main).toBe('#1d4ed8');
    expect(mipTheme.shape.borderRadius).toBe(6);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter @mip/merchant-web exec vitest run src/ui/theme.spec.ts
```

Expected: FAIL (cannot resolve `./theme` or missing exports).

- [ ] **Step 4: Implement `theme.ts`**

Create `apps/merchant-web/src/ui/theme.ts`:

```ts
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
```

- [ ] **Step 5: Wire ThemeProvider in `main.tsx`**

Replace `apps/merchant-web/src/main.tsx` with:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { App } from './App';
import { I18nProvider } from './i18n-context';
import { mipTheme } from './ui/theme';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={mipTheme}>
      <CssBaseline />
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Run theme test**

```bash
pnpm --filter @mip/merchant-web exec vitest run src/ui/theme.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant-web/package.json apps/merchant-web/pnpm-lock.yaml pnpm-lock.yaml \
  apps/merchant-web/src/ui/theme.ts apps/merchant-web/src/ui/theme.spec.ts \
  apps/merchant-web/src/main.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): add MUI theme and ThemeProvider

EOF
)"
```

(If lockfile path differs in this monorepo, stage the actual lockfile pnpm updated.)

---

### Task 2: Adapter — Button, Alert, Spinner, EmptyState

**Files:**
- Modify: `apps/merchant-web/src/ui/Button.tsx`
- Modify: `apps/merchant-web/src/ui/Alert.tsx`
- Modify: `apps/merchant-web/src/ui/Spinner.tsx`
- Modify: `apps/merchant-web/src/ui/EmptyState.tsx`
- Create: `apps/merchant-web/src/ui/Button.spec.tsx`

- [ ] **Step 1: Write failing Button test**

Create `apps/merchant-web/src/ui/Button.spec.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import { Button } from './Button';
import { mipTheme } from './theme';

function wrap(node: React.ReactNode) {
  return renderToStaticMarkup(<ThemeProvider theme={mipTheme}>{node}</ThemeProvider>);
}

describe('Button', () => {
  it('renders children and disables when loading', () => {
    const html = wrap(
      <Button type="button" variant="primary" loading>
        Save
      </Button>,
    );
    expect(html).toContain('Save');
    expect(html).toContain('disabled');
  });
});
```

- [ ] **Step 2: Run test to verify it fails or still passes on old Button**

```bash
pnpm --filter @mip/merchant-web exec vitest run src/ui/Button.spec.tsx
```

If it already PASSes on CSS Button, proceed to rewrite implementation; test must still PASS after MUI adapter.

- [ ] **Step 3: Implement MUI Button adapter**

Replace `apps/merchant-web/src/ui/Button.tsx`:

```tsx
import CircularProgress from '@mui/material/CircularProgress';
import MuiButton from '@mui/material/Button';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const map: Record<
  Variant,
  { color: 'primary' | 'error' | 'inherit'; variant: 'contained' | 'outlined' | 'text' }
> = {
  primary: { color: 'primary', variant: 'contained' },
  secondary: { color: 'inherit', variant: 'outlined' },
  danger: { color: 'error', variant: 'contained' },
  ghost: { color: 'inherit', variant: 'text' },
};

export function Button({
  variant = 'secondary',
  loading,
  children,
  disabled,
  type = 'button',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}) {
  const mapped = map[variant];
  return (
    <MuiButton
      {...rest}
      type={type}
      className={className}
      color={mapped.color}
      variant={mapped.variant}
      disabled={disabled || loading}
      startIcon={
        loading ? <CircularProgress color="inherit" size={14} aria-hidden /> : undefined
      }
    >
      {children}
    </MuiButton>
  );
}
```

- [ ] **Step 4: Implement Alert / Spinner / EmptyState**

Replace `Alert.tsx`:

```tsx
import MuiAlert from '@mui/material/Alert';
import type { ReactNode } from 'react';

const severityMap = {
  error: 'error',
  success: 'success',
  info: 'info',
} as const;

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  return (
    <MuiAlert
      severity={severityMap[tone]}
      role={tone === 'error' ? 'alert' : 'status'}
      sx={{ mb: 2 }}
    >
      {children}
    </MuiAlert>
  );
}
```

Replace `Spinner.tsx`:

```tsx
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}
    >
      <CircularProgress size={16} aria-hidden />
      <Typography variant="body2" component="span">
        {label}
      </Typography>
    </Box>
  );
}
```

Replace `EmptyState.tsx`:

```tsx
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" component="p" sx={{ m: 0 }}>
      {children}
    </Typography>
  );
}
```

- [ ] **Step 5: Run Button test + merchant-web tests subset**

```bash
pnpm --filter @mip/merchant-web exec vitest run src/ui/Button.spec.tsx src/ui/FormField.spec.tsx src/ui/Page.spec.tsx
```

Expected: Button PASS; FormField/Page may still PASS on old implementations.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant-web/src/ui/Button.tsx apps/merchant-web/src/ui/Button.spec.tsx \
  apps/merchant-web/src/ui/Alert.tsx apps/merchant-web/src/ui/Spinner.tsx \
  apps/merchant-web/src/ui/EmptyState.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): adapt Button Alert Spinner EmptyState to MUI

EOF
)"
```

---

### Task 3: Adapter — Form controls (Input, TextArea, Select, FormField)

**Files:**
- Modify: `apps/merchant-web/src/ui/Input.tsx`
- Modify: `apps/merchant-web/src/ui/TextArea.tsx`
- Modify: `apps/merchant-web/src/ui/Select.tsx`
- Modify: `apps/merchant-web/src/ui/FormField.tsx`
- Modify: `apps/merchant-web/src/ui/FormField.spec.tsx`

- [ ] **Step 1: Update FormField tests to drop CSS class assertions**

Replace `FormField.spec.tsx` expectations so they assert accessible content:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import { FormField } from './FormField';
import { mipTheme } from './theme';

function wrap(node: React.ReactNode) {
  return renderToStaticMarkup(<ThemeProvider theme={mipTheme}>{node}</ThemeProvider>);
}

describe('FormField', () => {
  it('shows a required marker and error text', () => {
    const html = wrap(
      <FormField label="Phone" htmlFor="phone" required error="Required">
        <input id="phone" />
      </FormField>,
    );
    expect(html).toContain('Phone');
    expect(html).toContain('*');
    expect(html).toContain('Required');
    expect(html).toContain('role="alert"');
  });

  it('shows helper text when there is no error', () => {
    const html = wrap(
      <FormField label="Phone" htmlFor="phone" helperText="10 digits">
        <input id="phone" />
      </FormField>,
    );
    expect(html).toContain('10 digits');
    expect(html).not.toContain('role="alert"');
  });
});
```

- [ ] **Step 2: Run FormField test (may fail on missing Theme if already OK)**

```bash
pnpm --filter @mip/merchant-web exec vitest run src/ui/FormField.spec.tsx
```

- [ ] **Step 3: Implement FormField with MUI**

```tsx
import Box from '@mui/material/Box';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import type { ReactNode } from 'react';

export type FormFieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  helperText?: string;
  error?: string | null;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  required,
  helperText,
  error,
  children,
}: FormFieldProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <InputLabel
        htmlFor={htmlFor}
        required={required}
        sx={{
          position: 'static',
          transform: 'none',
          fontSize: 14,
          fontWeight: 500,
          color: 'text.primary',
          mb: 0,
        }}
      >
        {label}
      </InputLabel>
      {children}
      {error ? (
        <FormHelperText error component="p" role="alert" sx={{ m: 0 }}>
          {error}
        </FormHelperText>
      ) : helperText ? (
        <FormHelperText component="p" sx={{ m: 0 }}>
          {helperText}
        </FormHelperText>
      ) : null}
    </Box>
  );
}
```

- [ ] **Step 4: Implement Input / TextArea / Select**

`Input.tsx` — preserve native-like props used by pages:

```tsx
import TextField from '@mui/material/TextField';
import type { InputHTMLAttributes } from 'react';

export function Input({
  className,
  id,
  name,
  type,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  required,
  disabled,
  readOnly,
  autoComplete,
  min,
  max,
  step,
  inputMode,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TextField
      className={className}
      id={id}
      name={name}
      type={type}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      inputProps={{ readOnly, min, max, step, inputMode, ...rest }}
    />
  );
}
```

`TextArea.tsx`:

```tsx
import TextField from '@mui/material/TextField';
import type { TextareaHTMLAttributes } from 'react';

export function TextArea({
  className,
  id,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  required,
  disabled,
  readOnly,
  rows = 3,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <TextField
      className={className}
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      multiline
      minRows={typeof rows === 'number' ? rows : 3}
      inputProps={{ readOnly, ...rest }}
    />
  );
}
```

`Select.tsx` — **must keep `<option>` children working**:

```tsx
import TextField from '@mui/material/TextField';
import type { SelectHTMLAttributes } from 'react';

export function Select({
  className,
  id,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  required,
  disabled,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <TextField
      select
      className={className}
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange as React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>}
      onBlur={onBlur as React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>}
      required={required}
      disabled={disabled}
      SelectProps={{ native: true, ...rest }}
    >
      {children}
    </TextField>
  );
}
```

- [ ] **Step 5: Run FormField + full merchant-web unit tests**

```bash
pnpm --filter @mip/merchant-web test
```

Expected: PASS (fix any page specs that queried removed CSS classes).

- [ ] **Step 6: Commit**

```bash
git add apps/merchant-web/src/ui/Input.tsx apps/merchant-web/src/ui/TextArea.tsx \
  apps/merchant-web/src/ui/Select.tsx apps/merchant-web/src/ui/FormField.tsx \
  apps/merchant-web/src/ui/FormField.spec.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): adapt form controls to MUI TextField

EOF
)"
```

---

### Task 4: Adapter — Page, Section, Table, ConfirmDialog

**Files:**
- Modify: `apps/merchant-web/src/ui/Page.tsx`
- Modify: `apps/merchant-web/src/ui/Page.spec.tsx`
- Modify: `apps/merchant-web/src/ui/Section.tsx`
- Modify: `apps/merchant-web/src/ui/Table.tsx`
- Modify: `apps/merchant-web/src/ui/ConfirmDialog.tsx`

- [ ] **Step 1: Update Page.spec to use heading, not CSS classes**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material';
import { Page } from './Page';
import { mipTheme } from './theme';

describe('Page', () => {
  it('renders the page title', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={mipTheme}>
        <Page title="Customers">
          <p>body</p>
        </Page>
      </ThemeProvider>,
    );
    expect(html).toContain('Customers');
    expect(html).toContain('body');
    expect(html).toMatch(/<h1[^>]*>Customers<\/h1>/);
  });
});
```

- [ ] **Step 2: Implement Page / Section / Table**

`Page.tsx`:

```tsx
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
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 3 }}
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
```

`Section.tsx`:

```tsx
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
```

`Table.tsx`:

```tsx
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
```

- [ ] **Step 3: Implement ConfirmDialog with MUI Dialog**

Keep props: `title`, `body`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`.

```tsx
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Button } from './Button';

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open
      onClose={onCancel}
      aria-labelledby="mip-dialog-title"
      aria-describedby="mip-dialog-body"
      role="alertdialog"
    >
      <DialogTitle id="mip-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="mip-dialog-body">{body}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" variant="secondary" autoFocus onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @mip/merchant-web test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src/ui/Page.tsx apps/merchant-web/src/ui/Page.spec.tsx \
  apps/merchant-web/src/ui/Section.tsx apps/merchant-web/src/ui/Table.tsx \
  apps/merchant-web/src/ui/ConfirmDialog.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): adapt Page Section Table ConfirmDialog to MUI

EOF
)"
```

---

### Task 5: App shell + login presentation (logic frozen)

**Files:**
- Modify: `apps/merchant-web/src/App.tsx` (shell + `LoginForm` JSX only)
- Modify: `apps/merchant-web/src/styles.css` (remove obsolete shell rules; keep utilities imported from ui.css)

**Hard rule:** Do not change `runAction`, `apiRequest` calls, payload objects, auth token handling, page state unions, or event handler behavior. Only replace shell/login markup/classes with MUI layout.

- [ ] **Step 1: Extract shell presentation pattern**

In `App` authenticated return, replace the `div.app-shell` structure with MUI layout equivalents:

- `Box` display flex, minHeight 100vh
- Permanent `Drawer` (`variant="permanent"`) from `md` up; `variant="temporary"` below `md` bound to existing `navOpen` / `setNavOpen`
- Keep the same `PAGES.map` buttons and `onClick` that set page + clear error + close nav
- Keep `LanguageSwitch`, logout → `setLogoutOpen(true)`, `ConfirmDialog` usage unchanged
- Main: `Box` component="main" with responsive padding `p: { xs: 2, md: 3 }`
- Mobile top bar: show menu `Button`/`IconButton` only below `md` (if adding `@mui/icons-material`, install it; otherwise use a text “Menu” `Button` to avoid new dependency)

Drawer width = 220. Paper/background `#1e293b` via `sx`. Active nav: `bgcolor: 'primary.main'`.

Login screen: replace `.login-screen` / `.login-card` with centered `Box` + `Paper` `maxWidth={MIP_TOKENS.loginMax}` — keep the same form fields, `onSubmit`, and token handling.

- [ ] **Step 2: Keep form grid utilities working**

Until Task 6, leave `className="mip-form-grid"` etc. in page bodies. Ensure `styles.css` still imports `./ui/ui.css` and `./ui/tokens.css`.

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @mip/merchant-web typecheck
```

Expected: exit 0.

- [ ] **Step 4: Run all merchant-web tests**

```bash
pnpm --filter @mip/merchant-web test
```

Expected: PASS. Fix `App.spec.tsx` only if it asserted removed CSS class names — do not change behavioral assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src/App.tsx apps/merchant-web/src/styles.css apps/merchant-web/src/App.spec.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): migrate shell and login layout to MUI Drawer

EOF
)"
```

---

### Task 6: Page layout utilities → Stack/Grid (presentation only)

**Files:**
- Modify as needed: `App.tsx` page sections, `enroll-page.tsx`, `devices-page.tsx`, `device-status-panel.tsx`, `device-command-panel.tsx`, `line-settings-page.tsx`, `line-link-panel.tsx`, `kyc-panel.tsx`
- Modify: `apps/merchant-web/src/ui/ui.css` (delete rules replaced by Stack)
- Modify: `apps/merchant-web/src/styles.css` (delete dead shell CSS)

- [ ] **Step 1: Replace repeated layout classNames without touching handlers**

Mapping:

| Old class | Replacement |
|-----------|-------------|
| `mip-form-grid` | `Stack spacing={2} sx={{ maxWidth: MIP_TOKENS.formMax }}` |
| `mip-form-grid mip-form-grid--2` | `Box display=grid` with `gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }` + `gap: 2` + `maxWidth: MIP_TOKENS.formMax` |
| `mip-form-grid__span` | `sx={{ gridColumn: '1 / -1' }}` |
| `mip-form-actions` | `Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}` |
| `mip-inline-actions` | `Stack direction="row" flexWrap="wrap" spacing={1}` |
| `mip-muted` | `Typography variant="body2" color="text.secondary"` |
| `mip-toast` | `Box` fixed positioning with same z-index behavior |

Do **not** change `onSubmit`, `onClick`, state setters, or API payloads while editing JSX wrappers.

- [ ] **Step 2: Keep chips / check-row / mip-pre if still class-based**

Either leave those few rules in a slim `ui.css` or convert chips to MUI `Chip` with the same labels/colors. Prefer MUI `Chip` when the element is only presentational.

- [ ] **Step 3: Delete obsolete CSS**

Remove from `ui.css`: `.mip-btn*`, `.mip-input`, `.mip-field*`, `.mip-section*`, `.mip-page*`, `.mip-table*`, `.mip-alert*`, `.mip-dialog*`, `.mip-spinner*`, `.mip-empty` once unused.

Remove from `styles.css`: `.app-shell`, `.app-sidebar*`, `.app-main`, `.app-topbar`, `.app-backdrop`, `.login-screen`, `.login-card` once unused.

Keep `tokens.css` variables in sync with `MIP_TOKENS` for any remaining CSS.

- [ ] **Step 4: Run typecheck + tests**

```bash
pnpm --filter @mip/merchant-web typecheck
pnpm --filter @mip/merchant-web test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src
git commit -m "$(cat <<'EOF'
refactor(merchant-web): replace layout CSS utilities with MUI Stack/Grid

EOF
)"
```

---

### Task 7: Docs + final verification

**Files:**
- Modify: `docs/project-management/DECISION-LOG.md`
- Modify: `docs/project-management/CHANGELOG.md`

- [ ] **Step 1: Append decision log entries UI-MUI-001…006** summarizing brainstorm decisions (MUI stack, full scope, compact density, adapter approach, logic freeze, no hybrid).

- [ ] **Step 2: Changelog entry** — Merchant Web migrated to MUI adapters; presentation-only; no API changes.

- [ ] **Step 3: Final verification**

```bash
pnpm --filter @mip/merchant-web typecheck
pnpm --filter @mip/merchant-web test
pnpm --filter @mip/merchant-web build
```

Expected: all exit 0.

Manual smoke (dev server): login, open each nav page, logout confirm, one form submit — confirm network payloads unchanged in browser Network tab.

- [ ] **Step 4: Commit docs**

```bash
git add docs/project-management/DECISION-LOG.md docs/project-management/CHANGELOG.md \
  docs/superpowers/specs/2026-11-22-merchant-web-mui-adapter-ui-design.md \
  docs/superpowers/plans/2026-11-22-merchant-web-mui-adapter-ui.md
git commit -m "$(cat <<'EOF'
docs: record Merchant Web MUI adapter UI decisions

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Install MUI + Emotion in merchant-web only | Task 1 |
| ThemeProvider + CssBaseline + compact MIP theme | Task 1 |
| Adapter kit keeps `./ui` exports | Tasks 2–4 |
| Button / Alert / Spinner / EmptyState | Task 2 |
| Input / TextArea / Select / FormField | Task 3 |
| Page / Section / Table / ConfirmDialog | Task 4 |
| Shell Drawer desktop + mobile navOpen | Task 5 |
| Login width ~420 | Task 5 |
| Full page set spacing/layout polish | Task 6 |
| Retire redundant CSS | Task 6 |
| Logic/API freeze | Tasks 5–6 hard rules |
| Tests + typecheck + build | Tasks 1–7 |
| Decision log | Task 7 |

## Placeholder / consistency self-review

- No TBD/TODO steps; Select uses `native: true` so existing `<option>` children keep working.
- `MIP_TOKENS` names are consistent across theme, Page max width, and form max width.
- Tests updated away from `mip-*` class coupling where adapters remove those classes.
