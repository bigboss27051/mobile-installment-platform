# Merchant Web MUI Adapter UI Design

**Date:** 2026-11-22  
**Status:** Approved — ready for implementation plan  
**Parent:** Merchant Web presentation layer (`apps/merchant-web`)  
**Supersedes (visual implementation path):** [2026-11-14-merchant-web-enterprise-form-ui-design.md](./2026-11-14-merchant-web-enterprise-form-ui-design.md) for *how* UI is built (CSS kit → MUI adapters). Brand tokens, shell structure, and form anatomy from that spec remain the target look.  
**Depends on:** Existing Vite/React Merchant Web, `./ui` public API, `/api/v1` client (`api.ts`)

## Decisions (brainstorm)

| ID | Decision |
|----|----------|
| UI-MUI-001 | Stack = **Material UI** (`@mui/material` + Emotion) in `apps/merchant-web` only |
| UI-MUI-002 | Scope = **full Merchant Web** (login, shell, all nav pages including devices, enroll, LINE) |
| UI-MUI-003 | Density = **compact enterprise**; map existing MIP slate/blue tokens into MUI theme |
| UI-MUI-004 | Approach = **adapter kit**: keep `./ui` exports/props; reimplement with MUI under the hood |
| UI-MUI-005 | Logic freeze = no API, auth, RBAC, validations, calculations, or handler behavior changes |
| UI-MUI-006 | No hybrid of custom CSS kit + ad-hoc MUI on pages (adapters are the single presentation surface) |

## Goal

Modernize Merchant Web to a production-ready, balanced, responsive UI using Material UI, while preserving all existing application behavior and the enterprise look defined by current MIP tokens.

## Non-Goals

- Backend, Prisma, or `/api/v1` contract changes  
- React Hook Form + Zod / TanStack Query rewrite in this pass  
- New routes, features, mock/static replacement of live data  
- Competing UI frameworks alongside MUI  
- Decorative motion, heavy gradients, or “everything is a card” chrome  
- Claiming Device Owner / live payments work  

## Architecture

```
main.tsx
  └─ ThemeProvider (compact MIP theme) + CssBaseline
       └─ I18nProvider
            └─ App (shell: Drawer + main)
                 └─ pages / panels
                      └─ import from ./ui (adapters → MUI)
```

- Add dependencies only to `@mip/merchant-web`: `@mui/material`, `@emotion/react`, `@emotion/styled` (and `@mui/icons-material` only if an existing icon/control needs it).  
- Introduce `src/theme.ts` (or `src/ui/theme.ts`) with `createTheme`.  
- Reimplement components under `src/ui/*` to call MUI; preserve exported names and prop contracts used by pages/tests.  
- Refactor app shell markup in `App.tsx` / `styles.css` to MUI `Drawer` / `Box` / `AppBar` (or equivalent) **without** changing page state machine, logout confirm flow, or API calls.  
- Retire redundant rules in `ui/ui.css` and shell CSS once adapters cover them; leave minimal CSS only where cheaper than theme overrides.

## Theme (compact enterprise)

Map existing CSS tokens into MUI:

| Role | Value |
|------|-------|
| primary.main | `#1d4ed8` |
| text.primary | `#1e293b` |
| text.secondary | `#64748b` |
| background.default | `#f8fafc` |
| background.paper | `#ffffff` |
| error.main | `#dc2626` |
| success.main | `#16a34a` |
| divider / border | `#e2e8f0` |
| custom sidebar | `#1e293b` |
| shape.borderRadius | `6` |
| typography.fontFamily | Inter, Sarabun, system-ui, sans-serif |

Density:

- Default control size `small` for TextField / Select / Button where it matches current 44px touch target as closely as practical (prefer min height ~40–44px via theme overrides rather than oversized comfortable density).  
- Dense tables.  
- Spacing scale remains 8px-based; page/section rhythm stays aligned with prior enterprise form spec (field gap 16px, section gap 32px).

## Shell & responsive

### Desktop

- Permanent left drawer ~220px, dark sidebar, primary active nav item.  
- Brand, language switch, nav for: products, inventory, customers, applications, contracts, devices, enroll, line; logout.  
- Main column padded; content max-width ~1200px via `Page`.

### Mobile (below MUI `md`, ~768px)

- Temporary drawer; top bar with menu control.  
- Preserve existing `navOpen` / backdrop close behavior (may wire to MUI Drawer `open` / `onClose`).  
- Forms full-width; action rows wrap/stack; tables scroll horizontally — do not remove columns or actions.

### Width caps

- Page ~1200px · form grids ~720px · login ~420px (unchanged intent).

## Component adapter map

| Existing `./ui` export | MUI building blocks | Contract notes |
|------------------------|---------------------|----------------|
| `Button` | `Button` (+ spinner affordance) | Keep `variant`: primary / secondary / danger / ghost; `loading` disables |
| `Input` | `TextField` | Same HTML input props surface used today |
| `TextArea` | `TextField` multiline | Same |
| `Select` | `TextField` select or `Select`+`MenuItem` | Preserve options API used by callers |
| `FormField` | `FormControl` + label + helper/error | required marker + error text |
| `Page` | `Box`/`Container` + header `Stack` | `title`, `actions`, `children` |
| `Section` | `Paper` or bordered `Box` | title + children |
| `Table` | `TableContainer` + dense `Table` | Same column/row composition API |
| `Alert` | `Alert` | severity mapping preserved |
| `ConfirmDialog` | `Dialog` | open/confirm/cancel handlers unchanged |
| `Spinner` | `CircularProgress` | |
| `EmptyState` | `Stack` + `Typography` | same copy slots |

Pages and panels (login, products, inventory, customers, applications, contracts, devices + status/command panels, enroll, LINE settings/link) change **layout/`sx` only** where needed for alignment/spacing; event handlers and data wiring stay.

## Error handling & states

- Keep existing loading / empty / error rendering paths; only restyle via adapters.  
- Do not invent new empty states that hide real API failures.  
- Focus rings / disabled / loading must remain keyboard-usable.

## Testing & validation

- Existing `*.spec.tsx` should keep passing against stable `./ui` APIs; update selectors only if forced by MUI DOM (prefer `getByRole` / accessible queries).  
- Run `pnpm --filter @mip/merchant-web typecheck` and `test`.  
- Manual smoke: login, navigate all pages, open logout confirm, one create/list interaction per major area — confirm network payloads unchanged.

## Risks

| Risk | Mitigation |
|------|------------|
| Accidental logic edits in large `App.tsx` | Prefer shell extraction only for presentation; avoid touching `runAction` / fetch bodies |
| Test snapshots/CSS class selectors break | Prefer role/label queries; update specs when class names disappear |
| Density vs 44px touch target | Theme override min heights; verify mobile tap targets |
| Bundle size | MUI only in merchant-web; no icon pack dump unless needed |

## Success criteria

- Merchant Web uses MUI theme + adapters end-to-end for full page set.  
- Spacing, alignment, and responsive behavior look consistent and more professional than pre-migration CSS.  
- No intentional business logic, API, or auth changes.  
- Typecheck and unit tests pass.
