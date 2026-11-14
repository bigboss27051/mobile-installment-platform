# Merchant Web Enterprise Form UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all Merchant Web pages with a local enterprise design system (`src/ui/`) — dark left sidebar, stacked form+table sections, shared form primitives — without changing API or business logic.

**Architecture:** Add CSS tokens + React UI primitives under `apps/merchant-web/src/ui/`. Rewrite `styles.css` for the shell. Migrate `App.tsx` and `enroll-page.tsx` to compose `Page` / `Section` / `FormField` / etc. Keep `useState` + `apiRequest` flows identical.

**Tech Stack:** Vite, React 18, TypeScript, Vitest + jsdom, plain CSS (no Tailwind/MUI). Fonts: Inter + Sarabun via Google Fonts.

**Spec:** `docs/superpowers/specs/2026-11-14-merchant-web-enterprise-form-ui-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/merchant-web/index.html` | Load Inter + Sarabun |
| `apps/merchant-web/src/ui/tokens.css` | Color, type, spacing, radius CSS variables |
| `apps/merchant-web/src/ui/FormField.tsx` | Label above, helper/error below |
| `apps/merchant-web/src/ui/FormField.spec.tsx` | Required marker + error text |
| `apps/merchant-web/src/ui/Page.tsx` | Max-width 960px + title |
| `apps/merchant-web/src/ui/Page.spec.tsx` | Title render |
| `apps/merchant-web/src/ui/Section.tsx` | Surface card + optional title |
| `apps/merchant-web/src/ui/Input.tsx` | 44px styled input |
| `apps/merchant-web/src/ui/Select.tsx` | 44px styled select |
| `apps/merchant-web/src/ui/TextArea.tsx` | Styled textarea |
| `apps/merchant-web/src/ui/Button.tsx` | primary/secondary/danger/ghost + loading |
| `apps/merchant-web/src/ui/Table.tsx` | Table wrapper + class |
| `apps/merchant-web/src/ui/Alert.tsx` | error/success/info banner |
| `apps/merchant-web/src/ui/EmptyState.tsx` | Empty list copy |
| `apps/merchant-web/src/ui/Spinner.tsx` | Inline loading |
| `apps/merchant-web/src/ui/ui.css` | Component class rules |
| `apps/merchant-web/src/ui/index.ts` | Barrel exports |
| `apps/merchant-web/src/styles.css` | Shell/nav/drawer; imports tokens + ui.css |
| `apps/merchant-web/src/App.tsx` | Shell + all pages using ui/* |
| `apps/merchant-web/src/enroll-page.tsx` | Enrollment UI using ui/* |
| `docs/project-management/DECISION-LOG.md` | Short UI-001…UI-006 note |
| `docs/project-management/CHANGELOG.md` | Entry for Merchant Web UI pass |

**Do not modify:** `api.ts`, backend, Flutter app.

---

### Task 1: Fonts + design tokens

**Files:**
- Modify: `apps/merchant-web/index.html`
- Create: `apps/merchant-web/src/ui/tokens.css`

- [ ] **Step 1: Add Google Fonts to `index.html`**

Replace `<head>` contents with:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MIP Merchant</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</head>
```

- [ ] **Step 2: Create `tokens.css`**

```css
:root {
  --mip-bg: #f8fafc;
  --mip-surface: #ffffff;
  --mip-primary: #1d4ed8;
  --mip-text: #1e293b;
  --mip-text-secondary: #64748b;
  --mip-border: #e2e8f0;
  --mip-error: #dc2626;
  --mip-success: #16a34a;
  --mip-sidebar: #1e293b;
  --mip-radius: 6px;
  --mip-input-height: 44px;
  --mip-page-max: 960px;
  --mip-space-1: 4px;
  --mip-space-2: 8px;
  --mip-space-3: 12px;
  --mip-space-4: 16px;
  --mip-space-5: 24px;
  --mip-font: Inter, Sarabun, system-ui, sans-serif;
  --mip-title-size: 24px;
  --mip-section-size: 18px;
  --mip-label-size: 14px;
  --mip-input-size: 15px;
  --mip-helper-size: 12px;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/merchant-web/index.html apps/merchant-web/src/ui/tokens.css
git commit -m "$(cat <<'EOF'
chore(merchant-web): add Inter/Sarabun fonts and UI tokens

EOF
)"
```

---

### Task 2: FormField (TDD)

**Files:**
- Create: `apps/merchant-web/src/ui/FormField.tsx`
- Create: `apps/merchant-web/src/ui/FormField.spec.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormField } from './FormField';

describe('FormField', () => {
  it('shows a required marker and error text', () => {
    const html = renderToStaticMarkup(
      <FormField label="Phone" htmlFor="phone" required error="Required">
        <input id="phone" />
      </FormField>,
    );
    expect(html).toContain('Phone');
    expect(html).toContain('*');
    expect(html).toContain('Required');
    expect(html).toContain('mip-field__error');
  });

  it('shows helper text when there is no error', () => {
    const html = renderToStaticMarkup(
      <FormField label="Phone" htmlFor="phone" helperText="10 digits">
        <input id="phone" />
      </FormField>,
    );
    expect(html).toContain('10 digits');
    expect(html).toContain('mip-field__helper');
    expect(html).not.toContain('mip-field__error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant-web && npm test -- src/ui/FormField.spec.tsx`

Expected: FAIL (cannot find module `./FormField` or similar)

- [ ] **Step 3: Implement `FormField.tsx`**

```tsx
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
  const message = error ? (
    <p className="mip-field__error" role="alert">
      {error}
    </p>
  ) : helperText ? (
    <p className="mip-field__helper">{helperText}</p>
  ) : null;

  return (
    <div className="mip-field">
      <label className="mip-field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="mip-field__required"> *</span> : null}
      </label>
      {children}
      {message}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/merchant-web && npm test -- src/ui/FormField.spec.tsx`

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src/ui/FormField.tsx apps/merchant-web/src/ui/FormField.spec.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): add FormField with label, required, and error slots

EOF
)"
```

---

### Task 3: Page (TDD)

**Files:**
- Create: `apps/merchant-web/src/ui/Page.tsx`
- Create: `apps/merchant-web/src/ui/Page.spec.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Page } from './Page';

describe('Page', () => {
  it('renders the page title', () => {
    const html = renderToStaticMarkup(
      <Page title="Customers">
        <p>body</p>
      </Page>,
    );
    expect(html).toContain('Customers');
    expect(html).toContain('mip-page__title');
    expect(html).toContain('body');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant-web && npm test -- src/ui/Page.spec.tsx`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement `Page.tsx`**

```tsx
import type { ReactNode } from 'react';

export type PageProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Page({ title, children, actions }: PageProps) {
  return (
    <div className="mip-page">
      <div className="mip-page__header">
        <h1 className="mip-page__title">{title}</h1>
        {actions ? <div className="mip-page__actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/merchant-web && npm test -- src/ui/Page.spec.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src/ui/Page.tsx apps/merchant-web/src/ui/Page.spec.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): add Page container with title slot

EOF
)"
```

---

### Task 4: Remaining UI primitives + CSS + barrel

**Files:**
- Create: `apps/merchant-web/src/ui/Section.tsx`
- Create: `apps/merchant-web/src/ui/Input.tsx`
- Create: `apps/merchant-web/src/ui/Select.tsx`
- Create: `apps/merchant-web/src/ui/TextArea.tsx`
- Create: `apps/merchant-web/src/ui/Button.tsx`
- Create: `apps/merchant-web/src/ui/Table.tsx`
- Create: `apps/merchant-web/src/ui/Alert.tsx`
- Create: `apps/merchant-web/src/ui/EmptyState.tsx`
- Create: `apps/merchant-web/src/ui/Spinner.tsx`
- Create: `apps/merchant-web/src/ui/ui.css`
- Create: `apps/merchant-web/src/ui/index.ts`

- [ ] **Step 1: Create components**

`Section.tsx`:

```tsx
import type { ReactNode } from 'react';

export function Section({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="mip-section">
      {title ? <h2 className="mip-section__title">{title}</h2> : null}
      {children}
    </section>
  );
}
```

`Input.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={['mip-input', props.className].filter(Boolean).join(' ')} />;
}
```

`Select.tsx`:

```tsx
import type { SelectHTMLAttributes } from 'react';

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={['mip-input', props.className].filter(Boolean).join(' ')} />;
}
```

`TextArea.tsx`:

```tsx
import type { TextareaHTMLAttributes } from 'react';

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={['mip-textarea', props.className].filter(Boolean).join(' ')}
    />
  );
}
```

`Button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  variant = 'secondary',
  loading,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...rest}
      className={['mip-btn', `mip-btn--${variant}`, rest.className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
    >
      {loading ? <span className="mip-spinner mip-spinner--btn" aria-hidden /> : null}
      {children}
    </button>
  );
}
```

`Table.tsx`:

```tsx
import type { TableHTMLAttributes } from 'react';

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="mip-table-wrap">
      <table {...props} className={['mip-table', props.className].filter(Boolean).join(' ')} />
    </div>
  );
}
```

`Alert.tsx`:

```tsx
export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  return <div className={`mip-alert mip-alert--${tone}`} role="status">{children}</div>;
}
```

`EmptyState.tsx`:

```tsx
export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="mip-empty">{children}</p>;
}
```

`Spinner.tsx`:

```tsx
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="mip-spinner-row" role="status" aria-live="polite">
      <span className="mip-spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create `ui.css`**

```css
.mip-page {
  max-width: var(--mip-page-max);
}
.mip-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mip-space-4);
  margin-bottom: var(--mip-space-5);
}
.mip-page__title {
  margin: 0;
  font-size: var(--mip-title-size);
  font-weight: 600;
  color: var(--mip-text);
}
.mip-section {
  background: var(--mip-surface);
  border: 1px solid var(--mip-border);
  border-radius: var(--mip-radius);
  padding: var(--mip-space-4);
  margin-bottom: var(--mip-space-5);
}
.mip-section__title {
  margin: 0 0 var(--mip-space-4);
  font-size: var(--mip-section-size);
  font-weight: 600;
  color: var(--mip-text);
}
.mip-field {
  display: flex;
  flex-direction: column;
  gap: var(--mip-space-1);
}
.mip-field__label {
  font-size: var(--mip-label-size);
  color: var(--mip-text);
  font-weight: 500;
}
.mip-field__required {
  color: var(--mip-error);
}
.mip-field__helper {
  margin: 0;
  font-size: var(--mip-helper-size);
  color: var(--mip-text-secondary);
}
.mip-field__error {
  margin: 0;
  font-size: var(--mip-helper-size);
  color: var(--mip-error);
}
.mip-input,
.mip-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: var(--mip-input-height);
  padding: 0 12px;
  border: 1px solid var(--mip-border);
  border-radius: var(--mip-radius);
  font-size: var(--mip-input-size);
  font-family: inherit;
  color: var(--mip-text);
  background: var(--mip-surface);
}
.mip-textarea {
  min-height: 88px;
  padding: 10px 12px;
  resize: vertical;
}
.mip-input:focus,
.mip-textarea:focus,
.mip-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--mip-primary) 40%, white);
  outline-offset: 1px;
}
.mip-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--mip-space-4);
}
@media (min-width: 768px) {
  .mip-form-grid--2 {
    grid-template-columns: 1fr 1fr;
  }
}
.mip-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mip-space-2);
  margin-top: var(--mip-space-4);
}
.mip-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--mip-space-2);
  min-height: var(--mip-input-height);
  padding: 0 16px;
  border-radius: var(--mip-radius);
  border: 1px solid transparent;
  font-size: var(--mip-label-size);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.mip-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.mip-btn--primary {
  background: var(--mip-primary);
  color: #fff;
}
.mip-btn--secondary {
  background: var(--mip-surface);
  color: var(--mip-text);
  border-color: var(--mip-border);
}
.mip-btn--danger {
  background: var(--mip-error);
  color: #fff;
}
.mip-btn--ghost {
  background: transparent;
  color: var(--mip-text);
  border-color: transparent;
}
.mip-table-wrap {
  overflow-x: auto;
}
.mip-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--mip-surface);
}
.mip-table th,
.mip-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--mip-border);
  font-size: 14px;
  color: var(--mip-text);
}
.mip-table th {
  background: var(--mip-bg);
  font-weight: 600;
}
.mip-alert {
  padding: var(--mip-space-3) var(--mip-space-4);
  border-radius: var(--mip-radius);
  margin-bottom: var(--mip-space-4);
  font-size: 14px;
  border: 1px solid var(--mip-border);
}
.mip-alert--error {
  color: var(--mip-error);
  background: #fef2f2;
  border-color: #fecaca;
}
.mip-alert--success {
  color: var(--mip-success);
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.mip-alert--info {
  color: var(--mip-text);
  background: var(--mip-bg);
}
.mip-empty {
  margin: 0;
  color: var(--mip-text-secondary);
  font-size: 14px;
}
.mip-spinner-row {
  display: flex;
  align-items: center;
  gap: var(--mip-space-2);
  color: var(--mip-text-secondary);
  font-size: 14px;
}
.mip-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--mip-border);
  border-top-color: var(--mip-primary);
  border-radius: 50%;
  display: inline-block;
}
.mip-spinner--btn {
  width: 14px;
  height: 14px;
}
```

- [ ] **Step 3: Create `index.ts` barrel**

```ts
export { Alert } from './Alert';
export { Button } from './Button';
export { EmptyState } from './EmptyState';
export { FormField } from './FormField';
export { Input } from './Input';
export { Page } from './Page';
export { Section } from './Section';
export { Select } from './Select';
export { Spinner } from './Spinner';
export { Table } from './Table';
export { TextArea } from './TextArea';
```

- [ ] **Step 4: Run UI unit tests**

Run: `cd apps/merchant-web && npm test -- src/ui`

Expected: FormField + Page tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src/ui
git commit -m "$(cat <<'EOF'
feat(merchant-web): add remaining enterprise UI primitives and styles

EOF
)"
```

---

### Task 5: Shell CSS + App chrome (sidebar + mobile drawer)

**Files:**
- Modify: `apps/merchant-web/src/styles.css` (full rewrite of shell)
- Modify: `apps/merchant-web/src/App.tsx` (shell only first: nav active state + drawer; keep page bodies temporarily)

- [ ] **Step 1: Rewrite `styles.css` shell**

```css
@import './ui/tokens.css';
@import './ui/ui.css';

:root {
  font-family: var(--mip-font);
  color: var(--mip-text);
  background: var(--mip-bg);
}

body {
  margin: 0;
}

.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

.app-shell.nav-open {
  /* mobile drawer open handled via .app-sidebar */
}

.app-sidebar {
  background: var(--mip-sidebar);
  color: #fff;
  padding: var(--mip-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--mip-space-2);
}

.app-sidebar__brand {
  font-weight: 700;
  margin-bottom: var(--mip-space-3);
}

.app-sidebar button,
.app-sidebar a {
  display: block;
  width: 100%;
  margin: 0;
  background: transparent;
  color: #fff;
  border: 0;
  text-align: left;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: var(--mip-radius);
  font-family: inherit;
  font-size: 14px;
}

.app-sidebar button.active {
  background: var(--mip-primary);
  font-weight: 600;
}

.app-main {
  padding: var(--mip-space-5);
  background: var(--mip-bg);
  min-width: 0;
}

.app-topbar {
  display: none;
  align-items: center;
  gap: var(--mip-space-3);
  margin-bottom: var(--mip-space-4);
}

.app-backdrop {
  display: none;
}

.lang-switch {
  display: flex;
  gap: var(--mip-space-2);
  margin: var(--mip-space-3) 0;
}

.lang-switch button {
  width: auto;
  padding: 4px 10px;
  border: 1px solid rgb(255 255 255 / 35%);
  border-radius: var(--mip-radius);
  font-size: 12px;
}

.lang-switch button.active {
  background: var(--mip-primary);
  border-color: var(--mip-primary);
}

.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--mip-space-5);
  background: var(--mip-bg);
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--mip-surface);
  border: 1px solid var(--mip-border);
  border-radius: var(--mip-radius);
  padding: var(--mip-space-5);
}

.login-card .lang-switch button {
  color: var(--mip-text);
  border-color: var(--mip-border);
}

.login-card .lang-switch button.active {
  color: #fff;
  background: var(--mip-primary);
  border-color: var(--mip-primary);
}

.login-card h1 {
  margin: 0 0 var(--mip-space-4);
  font-size: var(--mip-title-size);
}

.chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--mip-radius);
  font-size: 12px;
}
.chip-idle {
  background: #e2e8f0;
  color: var(--mip-text);
}
.chip-warn {
  background: #fef3c7;
  color: #92400e;
}
.chip-ok {
  background: #dcfce7;
  color: #166534;
}
.chip-bad {
  background: #fee2e2;
  color: var(--mip-error);
}

.check-row {
  display: flex;
  gap: var(--mip-space-2);
  align-items: flex-start;
  font-size: 14px;
}
.check-row input {
  margin-top: 3px;
}

@media (max-width: 767px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .app-topbar {
    display: flex;
  }
  .app-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: 220px;
    z-index: 20;
    transform: translateX(-100%);
    transition: transform 0.15s ease;
  }
  .app-shell.nav-open .app-sidebar {
    transform: translateX(0);
  }
  .app-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgb(15 23 42 / 40%);
    z-index: 15;
    border: 0;
  }
}
```

- [ ] **Step 2: Update App shell markup**

In `App.tsx`:
- Import `{ Button }` is not needed for nav — keep native sidebar buttons with classes.
- Add `const [navOpen, setNavOpen] = useState(false)`.
- Wrap authenticated UI:

```tsx
<div className={`app-shell${navOpen ? ' nav-open' : ''}`}>
  {navOpen ? (
    <button
      type="button"
      className="app-backdrop"
      aria-label="Close menu"
      onClick={() => setNavOpen(false)}
    />
  ) : null}
  <nav className="app-sidebar" aria-label="Main">
    <div className="app-sidebar__brand">{t('nav.brand')}</div>
    <LanguageSwitch />
    {PAGES.map((item) => (
      <button
        key={item}
        type="button"
        className={page === item ? 'active' : undefined}
        onClick={() => {
          setPage(item);
          setNavOpen(false);
        }}
      >
        {t(`nav.${item}`)}
      </button>
    ))}
    <button
      type="button"
      onClick={() => {
        setAccessToken(null);
        setToken(null);
      }}
    >
      {t('nav.logout')}
    </button>
  </nav>
  <div className="app-main">
    <div className="app-topbar">
      <Button type="button" variant="secondary" onClick={() => setNavOpen(true)}>
        Menu
      </Button>
    </div>
    {error ? <Alert tone="error">{error}</Alert> : null}
    {/* existing page switches */}
  </div>
</div>
```

Import `Alert` and `Button` from `./ui`.

- [ ] **Step 3: Manual smoke — `npm run dev` in `apps/merchant-web`, confirm sidebar + active state + mobile menu**

- [ ] **Step 4: Commit**

```bash
git add apps/merchant-web/src/styles.css apps/merchant-web/src/App.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): apply enterprise shell with dark sidebar and mobile drawer

EOF
)"
```

---

### Task 6: Migrate Login + Products + Inventory

**Files:**
- Modify: `apps/merchant-web/src/App.tsx`

- [ ] **Step 1: Migrate `LoginForm`**

Replace login JSX with labeled fields (preserve `login` / `onLoggedIn` logic):

```tsx
return (
  <div className="login-screen">
    <div className="login-card">
      <LanguageSwitch />
      <h1>{t('login.title')}</h1>
      <form
        className="mip-form-grid"
        onSubmit={onSubmit}
      >
        <FormField label={t('login.email')} htmlFor="login-email" required>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </FormField>
        <FormField label={t('login.password')} htmlFor="login-password" required>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </FormField>
        <div className="mip-form-actions">
          <Button type="submit" variant="primary">
            {t('login.submit')}
          </Button>
        </div>
      </form>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  </div>
);
```

- [ ] **Step 2: Add i18n keys to `i18n.ts`**

```ts
'products.empty': { en: 'No products yet.', th: 'ยังไม่มีสินค้า' },
'inventory.empty': { en: 'No IMEI units yet.', th: 'ยังไม่มี IMEI' },
'customers.empty': { en: 'No customers yet.', th: 'ยังไม่มีลูกค้า' },
'applications.empty': { en: 'No applications yet.', th: 'ยังไม่มีใบสมัคร' },
'contracts.empty': { en: 'No contracts yet.', th: 'ยังไม่มีสัญญา' },
'products.new': { en: 'New product', th: 'เพิ่มสินค้า' },
'inventory.new': { en: 'Receive IMEI', th: 'รับเครื่องเข้าสต็อก' },
'customers.new': { en: 'New customer', th: 'เพิ่มลูกค้า' },
'applications.new': { en: 'New application', th: 'สร้างใบสมัคร' },
'contracts.new': { en: 'Create contract', th: 'สร้างสัญญา' },
'contracts.list': { en: 'Contracts', th: 'สัญญา' },
'nav.menu': { en: 'Menu', th: 'เมนู' },
'customers.nationalIdHelper': {
  en: '13-digit national ID. Stored masked in lists.',
  th: 'เลขบัตร 13 หลัก แสดงแบบปกปิดในรายการ',
},
```

Update `i18n.spec.ts` only if it asserts key completeness; otherwise leave.

- [ ] **Step 3: Migrate `ProductsPage`**

Add `loading` boolean around `refresh`. After successful create, clear `name`/`brand`. Structure:

```tsx
return (
  <Page title={t('products.title')}>
    <Section title={t('products.new')}>
      <form
        className="mip-form-grid mip-form-grid--2"
        onSubmit={async (event) => {
          event.preventDefault();
          await apiRequest('/api/v1/products', {
            method: 'POST',
            body: JSON.stringify({ name, brand }),
          });
          setName('');
          setBrand('');
          await refresh();
        }}
      >
        <FormField label={t('products.name')} htmlFor="product-name" required>
          <Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label={t('products.brand')} htmlFor="product-brand" required>
          <Input id="product-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </FormField>
        <div className="mip-form-actions" style={{ gridColumn: '1 / -1' }}>
          <Button type="submit" variant="primary">
            {t('products.create')}
          </Button>
        </div>
      </form>
    </Section>
    <Section title={t('products.title')}>
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState>{t('products.empty')}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>{t('products.colName')}</th>
              <th>{t('products.colBrand')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.brand}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Section>
  </Page>
);
```

**Inventory page:** same stacked pattern; section title `t('inventory.new')`; fields `variantId` + `imei` in `mip-form-grid--2`; keep `branchId` state logic unchanged (still not shown in UI). List uses `t('inventory.empty')` + existing columns.

- [ ] **Step 4: Run tests**

Run: `cd apps/merchant-web && npm test`

Expected: existing + UI tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/merchant-web/src/App.tsx apps/merchant-web/src/i18n.ts
git commit -m "$(cat <<'EOF'
feat(merchant-web): restyle login, products, and inventory with shared form UI

EOF
)"
```

---

### Task 7: Migrate Customers + Applications

**Files:**
- Modify: `apps/merchant-web/src/App.tsx`
- Modify: `apps/merchant-web/src/i18n.ts` (empty/new keys if not added in Task 6)

- [ ] **Step 1: Customers page**

```tsx
<Page title={t('customers.title')}>
  <Section title={t('customers.new')}>
    <form className="mip-form-grid mip-form-grid--2" onSubmit={/* existing; clear fields on success */}>
      <FormField label={t('customers.fullName')} htmlFor="customer-name" required>
        <Input id="customer-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </FormField>
      <FormField label={t('customers.phone')} htmlFor="customer-phone" required>
        <Input id="customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>
      <div style={{ gridColumn: '1 / -1' }}>
        <FormField
          label={t('customers.nationalId')}
          htmlFor="customer-nid"
          required
          helperText={t('customers.nationalIdHelper')}
        >
          <Input id="customer-nid" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
        </FormField>
      </div>
      <div className="mip-form-actions" style={{ gridColumn: '1 / -1' }}>
        <Button type="submit" variant="primary">{t('customers.create')}</Button>
      </div>
    </form>
  </Section>
  <Section title={t('customers.title')}>
    {loading ? <Spinner /> : rows.length === 0 ? <EmptyState>{t('customers.empty')}</EmptyState> : (
      <Table>{/* existing columns: name, phone, nationalIdMasked */}</Table>
    )}
  </Section>
</Page>
```

- [ ] **Step 2: Applications page**

- Create section: `customerId`, `imeiUnitId` full width; `principal` + `downPayment` in 2-col grid; keep `planId` state (auto from first plan) — show as `FormField` + `Input` read-only or hidden; if currently not shown, keep hidden.
- List: Table with Submit = `Button variant="secondary"`, Approve = `Button variant="primary"`.
- Loading / empty states.

Preserve POST body fields exactly.

- [ ] **Step 3: Run `npm test` in `apps/merchant-web` — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add apps/merchant-web/src/App.tsx apps/merchant-web/src/i18n.ts
git commit -m "$(cat <<'EOF'
feat(merchant-web): restyle customers and applications pages

EOF
)"
```

---

### Task 8: Migrate Contracts

**Files:**
- Modify: `apps/merchant-web/src/App.tsx`

- [ ] **Step 1: Contracts create + list**

```tsx
<Page title={t('contracts.title')}>
  <Section title={t('contracts.new')}>
    <form className="mip-form-grid" onSubmit={/* existing */}>
      <FormField label={t('contracts.applicationId')} htmlFor="contract-app" required>
        <Input id="contract-app" value={applicationId} onChange={(e) => setApplicationId(e.target.value)} />
      </FormField>
      <div className="mip-form-actions">
        <Button type="submit" variant="primary">{t('contracts.create')}</Button>
      </div>
    </form>
  </Section>
  <Section title={t('contracts.list')}>
    {/* Spinner / EmptyState / Table with Open secondary + Activate primary */}
  </Section>
  {selected ? (
    <Section title={t('contracts.detailTitle', { id: selected.id })}>
      <p>{t('contracts.status', { status: selected.status })}</p>
      <Table>{/* schedule */}</Table>
      <form className="mip-form-grid" onSubmit={/* existing intent; keep Idempotency-Key */}>
        <FormField label={t('contracts.amount')} htmlFor="pay-amount" required>
          <Input id="pay-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <div className="mip-form-actions">
          <Button type="submit" variant="primary">{t('contracts.createIntent')}</Button>
        </div>
      </form>
      {qr ? <pre className="mip-pre">{JSON.stringify(qr, null, 2)}</pre> : null}
    </Section>
  ) : null}
</Page>
```

Add to `ui.css` / `styles.css`:

```css
.mip-pre {
  white-space: pre-wrap;
  background: var(--mip-text);
  color: #f8fafc;
  padding: var(--mip-space-3);
  border-radius: var(--mip-radius);
  font-size: 12px;
  overflow-x: auto;
}
```

- [ ] **Step 2: Run tests + typecheck**

Run:

```bash
cd apps/merchant-web && npm test && npm run typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/merchant-web/src/App.tsx apps/merchant-web/src/ui/ui.css apps/merchant-web/src/i18n.ts
git commit -m "$(cat <<'EOF'
feat(merchant-web): restyle contracts and payment intent UI

EOF
)"
```

---

### Task 9: Migrate Enroll page

**Files:**
- Modify: `apps/merchant-web/src/enroll-page.tsx`

- [ ] **Step 1: Wrap enroll UI in `Page` + `Section`s**

- Import `Page`, `Section`, `FormField`, `Input`, `Select`, `Button`, `Alert`, `Spinner` from `./ui`.
- Outer: `<Page title={t('enroll.title')}>` (use existing enroll title key — if named differently, use the current `<h1>` string key).
- Create-session form fields → `FormField` + `Input`/`Select`; consent/check rows keep `check-row` class.
- Actions → `Button` variants.
- Status chip classes remain (`chip chip-ok` etc.).
- QR `<pre>` → `className="mip-pre"`.
- Do **not** change `apiRequest` paths, idempotency, consent gates, or QR payload handling.

- [ ] **Step 2: Run enroll-status + full test suite**

Run: `cd apps/merchant-web && npm test`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/merchant-web/src/enroll-page.tsx
git commit -m "$(cat <<'EOF'
feat(merchant-web): restyle device enrollment page with shared UI

EOF
)"
```

---

### Task 10: Docs + verification evidence

**Files:**
- Modify: `docs/project-management/DECISION-LOG.md`
- Modify: `docs/project-management/CHANGELOG.md` (if present; else skip)

- [ ] **Step 1: Append decision note**

Add entries UI-001…UI-006 summarizing the brainstorm decisions (local `src/ui/`, dark sidebar, stacked pages, no RHF/Zod this pass).

- [ ] **Step 2: Manual UI inspection checklist**

Run: `cd apps/merchant-web && npm run dev`

Walk:
1. Login labels + primary button  
2. Each nav page: form above table, 44px inputs, section titles  
3. TH/EN font switch  
4. Narrow viewport: Menu opens drawer  
5. Contracts detail + enroll still call APIs  

- [ ] **Step 3: Final automated verification**

Run:

```bash
cd apps/merchant-web && npm test && npm run typecheck
```

Expected: all PASS

- [ ] **Step 4: Commit docs**

```bash
git add docs/project-management/DECISION-LOG.md docs/project-management/CHANGELOG.md docs/superpowers/specs/2026-11-14-merchant-web-enterprise-form-ui-design.md docs/superpowers/plans/2026-11-14-merchant-web-enterprise-form-ui.md
git commit -m "$(cat <<'EOF'
docs: record Merchant Web enterprise form UI decisions and plan

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Tokens + Inter/Sarabun | 1 |
| FormField / Page tests | 2–3 |
| Full primitive set | 4 |
| Dark left sidebar + mobile drawer | 5 |
| Login + module pages stacked | 6–8 |
| Enroll restyle, logic preserved | 9 |
| Loading/empty/error/success presentation | 6–9 |
| API unchanged | All (constraint) |
| DECISION-LOG | 10 |
| Manual Vite inspection | 10 |

**Placeholder scan:** None intentional. Empty-state i18n keys are listed explicitly in Task 6.

**Type consistency:** `FormField` props `label/htmlFor/required/helperText/error/children`; `Button` variants `primary|secondary|danger|ghost`; `Alert` tones `error|success|info`; CSS prefix `mip-` throughout.
