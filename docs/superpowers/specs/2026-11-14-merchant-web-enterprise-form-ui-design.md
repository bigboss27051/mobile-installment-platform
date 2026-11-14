# Merchant Web Enterprise Form UI Design

**Date:** 2026-11-14  
**Status:** Approved — ready for implementation plan  
**Parent:** Merchant Web (R1f critical paths) presentation layer  
**Depends on:** Existing Merchant Web Vite/React app and `/api/v1` client (`api.ts`)

## Decisions (brainstorm)

| ID | Decision |
|----|----------|
| UI-001 | Scope = **full Merchant Web redesign** (login + products, inventory, customers, applications, contracts, enroll) |
| UI-002 | App shell = **left sidebar** navigation |
| UI-003 | Form stack = **shared UI components only**; keep existing `useState` submit pattern (no React Hook Form + Zod in this pass) |
| UI-004 | Sidebar visual = **dark** (`#1E293B`) with primary active state |
| UI-005 | Create + list pages = **stacked sections** (form card, then table card) |
| UI-006 | Implementation approach = **local design system** under `apps/merchant-web/src/ui/` (not a monorepo `@mip/ui` package yet) |

## Goal

Make Merchant Web look and behave like a professional enterprise / banking admin: consistent layout, typography, form anatomy, spacing, and states — without changing backend behavior or business API integrations.

## Non-Goals

- Backend, Prisma, or `/api/v1` behavior changes  
- React Hook Form + Zod (deferred; frontend standards remain the target later)  
- New routes, features, or fake production data  
- Shared monorepo UI package extraction  
- Decorative motion, heavy shadows, or gradient chrome  
- Claiming Device Owner / live payments work  

## Design direction

**Clean Enterprise UI / Professional Business Form**

- Professional, trustworthy, minimal, symmetrical, readable  
- Usability and consistency over visual effects  
- Controlled max-width content; 12-column grid where useful  
- 1-column for complex/ID fields; 2-column for related pairs  
- Labels always above inputs; required marker; validation/helper below field  

## Color system

| Token | Value | Use |
|-------|-------|-----|
| Background | `#F8FAFC` | App content area |
| Surface | `#FFFFFF` | Sections, cards, inputs |
| Primary | `#1D4ED8` | Primary buttons, active nav, focus |
| Text | `#1E293B` | Body / headings; also dark sidebar base |
| Secondary text | `#64748B` | Helpers, muted labels |
| Border | `#E2E8F0` | Inputs, dividers, section borders |
| Error | `#DC2626` | Field errors, error alerts, required asterisk |
| Success | `#16A34A` | Success alerts / chips |

Avoid excessive shadows. Section elevation = 1px border (optional very light shadow only if needed for focus separation).

## Typography

- **English:** Inter  
- **Thai:** Sarabun  
- Load via Google Fonts (or equivalent) in `index.html` / CSS `@import`  
- Hierarchy: page title **24px**; section title **18px**; label **14px**; input **14–16px**; helper **12–13px**  
- Font stack on `:root` prefers Inter + Sarabun for bilingual UI  

## Layout

### Shell

- CSS grid: fixed dark left sidebar (~220px) + main content  
- Sidebar: brand, language switch, nav buttons for all pages, logout  
- Active nav: primary blue background, clear selected state  
- Mobile (<768px): sidebar becomes an off-canvas drawer opened by a header menu button (keyboard accessible, focus trap not required in this pass); content remains single-column stacked  

### Page

- `Page` component: horizontal padding, max-width **960px**, page title (`h1` 24px)  
- Stacked `Section` surfaces: white, 6px radius, 1px `#E2E8F0` border, consistent internal padding **16px** (24px on desktop if space allows)  
- Vertical rhythm: **16px** between nested blocks, **24px** between major sections  

### Forms

- Input height **44px**; border radius **6px**  
- `FormField` wraps control: label (+ required `*`) above; helper or error below (one message slot)  
- Related fields (e.g. name/brand, principal/down payment) in 2-column grid; full-width for IDs, reasons, checklists  
- Primary action button size consistent with 44px height  

## Component architecture

```
apps/merchant-web/src/
  ui/
    tokens.css
    Page.tsx
    Section.tsx
    FormField.tsx
    Input.tsx
    Select.tsx
    TextArea.tsx
    Button.tsx
    Table.tsx
    Alert.tsx
    EmptyState.tsx
    Spinner.tsx
    index.ts
  styles.css          # shell / nav; imports tokens
  App.tsx             # pages compose ui/*; API logic unchanged
  enroll-page.tsx
```

### Component contracts

| Component | Responsibility |
|-----------|----------------|
| `Page` | Max-width container + page title + optional toolbar slot |
| `Section` | Surface card + optional section title |
| `FormField` | Label, required, `htmlFor`, helperText, error, children |
| `Input` / `Select` / `TextArea` | Styled native controls; forward refs/props; 44px where applicable |
| `Button` | Variants: `primary`, `secondary`, `danger`, `ghost`; optional `loading` |
| `Table` | Consistent header/row padding; works with existing row actions |
| `Alert` | `error` / `success` / `info` page or section banners |
| `EmptyState` | Short empty-list copy (+ optional action) |
| `Spinner` | Inline loading indicator (no decorative animation) |

Components stay **uncontrolled-friendly** so existing `value` / `onChange` / `onSubmit` patterns continue to work.

## Page map

| Page | Structure | Notes |
|------|-----------|-------|
| Login | Centered surface card | Labeled fields; primary submit; error `Alert` |
| Products | Page → create Section → list Section | Name + brand 2-col |
| Inventory | Same stack | Variant / IMEI fields; receive action |
| Customers | Same stack | Name + phone 2-col; national ID full width + helper |
| Applications | Same stack | IDs/money fields; row actions submit/approve as secondary/primary buttons |
| Contracts | Same stack + detail Section | Schedule table; payment amount FormField; QR/pre result in surface |
| Enroll | Stacked sections | Preserve enrollment session/QR/checklist behavior; restyle only |

## States

| State | Presentation |
|-------|----------------|
| Loading | `Spinner` in Page/Section while fetching |
| Empty | `EmptyState` inside list Section |
| Error | Page-level `Alert` for API failures. Field-level `FormField.error` only for simple empty-required checks on submit (native/`useState`), not Zod schemas |
| Success | Refresh list + clear create form; optional brief success `Alert` (e.g. enroll session created) |

## Data flow

Unchanged:

1. Staff login → `login()` → access token  
2. Page mount → `apiRequest` list endpoints → setState  
3. Form submit → existing POST/PUT bodies → refresh  
4. Payment intents keep `Idempotency-Key`  
5. i18n (`t`, `apiError`) remains the copy source  

No new endpoints. No secret material in UI. Enrollment QR rules unchanged (no passwords/private keys in QR).

## Accessibility

- Visible focus rings (primary-tinted)  
- Labels associated via `htmlFor` / `id`  
- Keyboard-usable nav and buttons  
- Error text, not color alone  
- Sufficient contrast on dark sidebar and primary buttons  

## Testing

- Keep existing Vitest: `api.spec.ts`, `i18n.spec.ts`, `enroll-status.spec.ts`  
- Add light UI unit tests: `FormField` required marker + error text; `Page` title render  
- Manual verification: `pnpm`/`npm` Vite dev — login and every nav page; TH/EN switch; narrow viewport sidebar behavior; alignment/spacing check against this spec  

## Out of scope details (explicit)

- Searchable async dropdowns and date pickers: provide styled `Select` / native `date` input primitives only where a current field needs them; do not invent new picker libraries without a field requirement  
- No money math or float changes in the UI layer  
- No Super Admin scaffolding  

## Success criteria

1. Every Merchant Web page uses shared `ui` primitives and the token palette  
2. Forms show labels above fields; required and errors are consistent  
3. Stacked create → list layout on module pages; dark left sidebar shell  
4. Loading / empty / error / success states are present on list/form surfaces  
5. Existing API integrations and Vitest suites still pass  
6. Visual result reads as enterprise admin, not a generic AI dashboard  

## Implementation note

After this spec is approved, create an implementation plan via the writing-plans skill and execute in small increments: tokens → primitives → shell → page-by-page migration → tests → manual UI inspection.
