# Phase 3g Soft Location (Arrears-Only) Design

**Date:** 2026-11-21  
**Status:** Approved — awaiting implementation plan  
**Parent:** R2 Device Provisioning & Enrollment (Android Phase 3 lab)  
**Depends on:** Phase 3d heartbeat, Phase 3a–3c policy/commands, Phase 3f HTTPS agent host (lab)  
**Decision:** D-061

## Goal

When an enrolled Android device’s **desired policy** is `RESTRICT` or `LOCK` (arrears / collections restriction), the DPC may attach a **soft location** sample to the existing agent heartbeat so staff can see a last-known position and a short arrears history. Location is not collected while desired policy is `NONE` or `REMINDER`.

## Non-Goals

- Continuous tracking while the customer is current  
- Forcing GPS / Location Services on  
- iOS / MDM Lost Mode / Find My  
- High-frequency background location service  
- Map embed (optional later); lab UI may show coordinates only  
- Payment-to-unlock orchestration (Phase 4)  
- Production Device Owner / financing / PDPA legal final copy (D-051 still draft)  
- Raw cell tower / Wi-Fi MAC dumps  

## Decisions

| ID | Decision |
|----|----------|
| D-061 | Soft location only under desired `RESTRICT` \| `LOCK`; network/soft primary + GPS only if already enabled; last-known + ≤14-day arrears history; purge on `NONE` / TTL / unenroll; Phase 3g after 3f |

## Trigger rules

| Desired policy | Agent may send `location`? |
|----------------|----------------------------|
| `NONE` | No — server rejects if present (`400 LOCATION_NOT_ALLOWED`) |
| `REMINDER` | No — same reject |
| `RESTRICT` | Yes |
| `LOCK` | Yes |

Server authority is the stored desired policy for that device, not the client’s claim.

## Precision

1. Prefer network / fused soft fix (`source: NETWORK` or `FUSED`).  
2. If GPS hardware is already enabled and a fresh fix is available, may send `source: GPS`.  
3. Never prompt to enable GPS as a required step for lab or product SOP in this phase.  
4. If no fix: omit `location`; heartbeat still succeeds.

## API

### `POST /devices/agent/heartbeat` (extend)

Header: `X-Device-Agent-Token` (`dat_…`).

Existing body fields unchanged: `connectivity?`, `policyVersion?`, `batteryPercent?`.

Optional:

```json
{
  "location": {
    "lat": 13.7563,
    "lng": 100.5018,
    "accuracyMeters": 120,
    "source": "NETWORK",
    "capturedAt": "2026-11-21T12:00:00.000Z"
  }
}
```

`source`: `NETWORK` | `GPS` | `FUSED` | `UNKNOWN`.

Behavior:

- No `location` → update `last_heartbeat_at` only (current behavior).  
- `location` present and desired ∈ {RESTRICT, LOCK} → upsert last-known + append `device_location_samples`.  
- `location` present and desired ∉ {RESTRICT, LOCK} → `400 LOCATION_NOT_ALLOWED`, no persist.

### Staff reads

- `GET /devices/:id` — include nullable `lastKnownLocation` `{ lat, lng, accuracyMeters, source, capturedAt }` and `locationUpdatedAt`.  
- `GET /devices/:id/location-history` — recent samples (tenant-scoped). Requires permission `devices.location.read`. Audited on read.

## Schema

### `devices` (nullable last-known columns)

- `last_location_lat` / `last_location_lng` (decimal)  
- `last_location_accuracy_m` (int, nullable)  
- `last_location_source` (enum/text)  
- `last_location_at` (timestamptz)

Cleared when desired → `NONE`, on unenroll/recovery that resets policy, or by retention job when stale beyond product rule.

### `device_location_samples`

| Column | Notes |
|--------|--------|
| id | UUID |
| tenant_id | isolation |
| device_id | FK |
| lat, lng | required |
| accuracy_meters | optional |
| source | NETWORK/GPS/FUSED/UNKNOWN |
| captured_at | from device |
| created_at | server |

Retention: **14 days** max while in arrears window; purge job deletes older rows. On desired → `NONE`, delete all samples for that device (and clear last-known).

## DPC / agent

- After policy GET / poll knows desired is RESTRICT or LOCK, attempt a soft location read before/with heartbeat.  
- Coarse location permission; fine optional.  
- Piggyback on existing heartbeat cadence — no separate high-frequency service in 3g.  
- Lab HTTPS (3f) remains the transport path.

## Merchant Web

- Device status panel: show last-known when present.  
- Optional “Location history (arrears)” panel calling history API; gated by `devices.location.read`.  
- Lab v1: text coordinates + accuracy + time + source (map optional later).

## Security / PDPA

- Agent token auth only for ingest; tenant from bound device.  
- Staff: `devices.location.read` + tenant (and branch scope when available).  
- Audit staff history reads.  
- Do not log full lat/lng in application logs (round or omit).  
- Disclosure text remains under D-051 draft; lab must not claim production PDPA clearance.  
- Not Lost Mode; not stealth tracking outside arrears policy.

## Testing (mandatory)

- Reject location when desired is NONE/REMINDER.  
- Accept + persist when RESTRICT/LOCK.  
- Tenant isolation on history and device GET.  
- Missing `devices.location.read` → 403.  
- Purge: age > 14 days; clear on policy → NONE.  
- Heartbeat without location still updates `last_heartbeat_at`.

## Out of phase / later

- iOS location via MDM vendor (if ever) — separate decision.  
- Map UI, geofencing, staff `REQUEST_LOCATION` command.  
- Tying ingest strictly to payment overdue flags (Phase 4 may align payment → policy; 3g keys off **desired policy** only).

## Plan placement

- Backlog: `R2-P3-009` Phase 3g.  
- After Phase 3f HTTPS lab; before Phase 4 payment-to-unlock.  
- Implementation plan: to be written after this spec is reviewed (`docs/superpowers/plans/…`).
