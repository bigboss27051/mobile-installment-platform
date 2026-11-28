# Shop Setup Checklist Design

**Date:** 2026-11-25  
**Status:** Approved design, not implemented  
**Decision:** D-075 (proposed; record in `docs/project-management/DECISION-LOG.md` when implementation starts)  
**Depends on:** Merchant Web enroll, `GET /api/v1/devices/enrollment/dpc-config-status`, `devices.enroll`

## Goal

A Merchant Web page, **ตั้งค่าร้าน**, where staff with `devices.enroll` record one Android shop checklist per tenant. Android enrollment session create and Android QR issue stay blocked until that checklist is complete. Live DPC configuration remains a separate gate.

## Non-goals

- Storing a Google email or password
- Clearing FRP, disabling Play Protect, or factory reset from the product
- Replacing the per-session FRP checkboxes on the enroll page
- Skipping the live DPC check because the shop attested DPC earlier
- Applying this checklist to iOS enrollment
- A browser-only flag
- Showing any UUID in the page (D-074)

## Decisions

| ID | Decision |
|----|----------|
| SS-001 | One row per tenant. All four booleans true means the shop is ready. |
| SS-002 | Ready state is history. Android QR still requires live DPC ready. |
| SS-003 | Android session create and Android QR return `SHOP_SETUP_REQUIRED` until the row is ready. iOS enrollment does not read this row. |
| SS-004 | Permission is the existing `devices.enroll`. No new role. |
| SS-005 | The enroll page keeps its per-device FRP attestations. Shop setup is the tenant-level gate in front of them. |
| SS-006 | Public responses omit `completedByUserId`. The column exists for audit. The page shows the completed date only. |

## Checklist

All four are required booleans on write:

| Field | Staff statement |
|-------|-----------------|
| `dpcAttested` | Staff saw DPC status ready at setup time. |
| `googleAccountReady` | The shop has a Google account someone at the shop can unlock on the device. |
| `wipeNeedsOnDeviceUnlock` | After reset, FRP is unlocked on the device, and the old QR cannot be reused. |
| `noRemoteFrpBypass` | The platform must not clear FRP. |

The row is ready only when every field is true. `completedAt` and `completedByUserId` are set on that write. A later write with any false clears both and the shop is not ready.

## Data model

`TenantShopSetup`

- `tenantId` PK, FK → `Tenant`
- the four booleans, no database defaults that would mark a new row ready
- `completedAt` nullable
- `completedByUserId` nullable FK → `User`
- `createdAt`, `updatedAt`
- every read and write filters by the caller tenant

No row means not ready. `GET` returns `{ data: null }` in that case.

## API

Prefix `/api/v1`. Permission `devices.enroll` on both routes.

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/devices/shop-setup` | `{ data: ShopSetupPublic \| null }` |
| PUT | `/devices/shop-setup` | Upsert. Body is the four booleans. |

`ShopSetupPublic`: the four booleans, `ready` (all true), `completedAt` or null. No user id.

Validation: each field must be a boolean. Anything else is HTTP 400.

Android session create and Android QR issue, after the existing tenant and permission checks:

1. If the tenant row is missing or not ready, `ConflictException` with message `SHOP_SETUP_REQUIRED`.
2. If live DPC config is not ready, keep the current DPC block.

Order is shop setup first, then live DPC. A ready row does not satisfy step 2.

## Merchant Web

- Nav id `shopSetup`, Thai label `ตั้งค่าร้าน`, English `Shop setup`.
- Place it immediately before `enroll`.
- Empty or not ready: four checkboxes. **บันทึก** is enabled only when all four are checked. Copy states that QR stays blocked until save.
- Ready: success text that the shop can enroll devices, the completed date, **ไปหน้าลงทะเบียน**, and **แก้เช็กลิสต์**.
- Edit loads the saved boxes. Save sends the current values. If any box is unchecked, the button stays enabled and the shop returns to not ready.
- Enroll, when create or QR fails with `SHOP_SETUP_REQUIRED`, shows that shop setup is required and a control that opens `shopSetup`. It does not issue a QR.
- Thai and English strings follow the existing `i18n.ts` pairs.
- Use the existing `./ui` adapters. No Google account field.

## Errors

- 400 for a body that is not four booleans
- 403 when the caller lacks `devices.enroll`
- 409 `SHOP_SETUP_REQUIRED` for Android create and Android QR while the shop is not ready
- Another tenant's row is never returned or updated
- Staff-facing copy uses the Thai or English message for the code. It does not include ids, tokens, or account secrets.

## Testing

Backend:

- missing row and a row with any false block Android create and Android QR with `SHOP_SETUP_REQUIRED`
- all four true allows those calls to pass this gate, and a DPC-not-ready config still blocks
- a later false write blocks again
- tenant A’s ready row does not satisfy tenant B
- a caller without `devices.enroll` cannot GET or PUT
- iOS session create does not require the row
- public payload has no `completedByUserId`

Merchant Web:

- save stays disabled until all four are checked on the first screen
- after a ready GET, the page shows the date and the enroll and edit actions
- edit save with one box cleared shows the checklist again
- enroll create or QR error `SHOP_SETUP_REQUIRED` shows the shop-setup prompt and does not render a QR

## Out of scope for the first slice

- Reminding the shop to redo the checklist on a schedule
- Per-device or per-branch rows
- Changing FRP behavior on the device
