# Merchant Web: Force Login on Expired Access Token

**Date:** 2026-11-22  
**App:** `apps/merchant-web`  
**Status:** Approved for planning

## Problem

`apiRequest` / `apiUpload` already clear `localStorage` (`mip.staff.accessToken`) when the API returns **401**.  
`App` keeps auth in React state (`useState(getAccessToken())`) and never re-syncs after that clear, so the merchant shell stays open and only shows an “Unauthorized” toast.

## Goal

When a mid-session access token is rejected (expired / invalid), merchant-web must:

1. Clear the stored session.
2. Leave the authenticated shell immediately.
3. Show the login screen with a short **session expired** message (TH + EN).
4. Clear that message after a successful login.

## Non-goals

- Refresh-token rotation or silent refresh.
- Proactive client-side JWT `exp` parsing before requests.
- Route-based auth / React Router guards.
- Changing backend token TTL.

## Behavior

| Case | Result |
|------|--------|
| Authenticated API/upload returns 401 | Clear token, notify UI → login + session-expired Alert |
| Login with wrong credentials (401) | Stay on login; show normal login failure — **not** session-expired |
| Manual logout | Login with no session-expired message |
| Successful login after expiry | Clear session-expired flag; enter app as today |

## Design (Approach 1 — auth event)

### `api.ts`

- Keep existing: on 401, `setAccessToken(null)` then throw `ApiError`.
- Add a tiny pub/sub:
  - `subscribeAuthExpired(listener: () => void): () => void`
  - internal `notifyAuthExpired()`
- Call `notifyAuthExpired()` after clearing the token on 401 for **authenticated** requests (`apiRequest`, `apiUpload`).
- Do **not** notify for `/api/v1/auth/login` 401s (failed credentials must not look like “session expired”).

### `App.tsx`

- Subscribe to `subscribeAuthExpired` on mount; unsubscribe on unmount.
- On event: `setToken(null)`, `setSessionExpired(true)`, clear transient page error if useful.
- When `!token`, render `LoginForm` with `sessionExpired` prop.
- On successful login: clear `sessionExpired`.

### `LoginForm`

- If `sessionExpired`, show `<Alert>` with `t('login.sessionExpired')` above or below the form (same Alert pattern as login errors).

### i18n

- Add `login.sessionExpired`:
  - TH: e.g. `เซสชันหมดอายุ — กรุณาเข้าสู่ระบบอีกครั้ง`
  - EN: e.g. `Session expired — please sign in again`

## Tests

- **`api.spec.ts`**: 401 on a normal path clears token and invokes the auth-expired listener; login 401 clears nothing meaningful for session notify (listener not called).
- **`App.spec.tsx`** (or focused auth test): after auth-expired notification while “logged in”, login screen appears with session-expired copy.

## Files touched

- `apps/merchant-web/src/api.ts`
- `apps/merchant-web/src/api.spec.ts`
- `apps/merchant-web/src/App.tsx`
- `apps/merchant-web/src/App.spec.tsx` (if present / extend)
- `apps/merchant-web/src/i18n.ts`
