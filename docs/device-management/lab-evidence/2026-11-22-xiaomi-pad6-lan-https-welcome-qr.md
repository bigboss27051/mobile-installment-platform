# Lab evidence: Xiaomi Pad 6 LAN HTTPS (2026-11-22)

**Device:** Xiaomi Pad 6 (`1cb75234` / `23043RP34G` pipa), Android 14  
**DPC:** `com.mip.dpc` versionName `0.1.17-lab` (rebuild with heartbeat logging)  
**Lab only — not production Device Owner / financing.**

## Network

| Role | Address |
|------|---------|
| Mac (backend host) | `192.168.68.108` |
| Pad 6 Wi‑Fi | `192.168.68.110/24` (same L2 as Mac) |

`adb reverse --list` was **empty** for this proof (no USB port forwarding for agent traffic).

## Agent configuration

| Setting | Value |
|---------|--------|
| `apiBase` | `https://192.168.68.108:3443/api/v1` |
| `deviceId` | `705f8cff-6bfe-4b82-96c5-5c2a6bce1b05` |

## Host health (LAN HTTPS)

`https://192.168.68.108:3443/api/v1/health` → **200**

## Heartbeat (TLS over LAN, no adb reverse)

Staff/backend `last_heartbeat_at` advanced while the agent poller ran against the LAN `apiBase`, e.g.:

- `2026-11-22 13:50:17.946` → `2026-11-22 13:50:37.488`

`CommandPollActivity` showed the heartbeat path working; UI had shown `HB=ok` earlier in the same session.

## Result

| Path | Result |
|------|--------|
| Pad agent → `https://192.168.68.108:3443/api/v1` (lab CA pin) | **Proven** — `last_heartbeat_at` updates over Wi‑Fi LAN |
| `adb reverse` for `:3443` | **Not used** (`adb reverse --list` empty) |

Related runbook: [AGENT-HTTPS-LAB.md](../AGENT-HTTPS-LAB.md).

---

## Pre-wipe account inventory (2026-11-22)

`dumpsys account` for user 0: **Accounts: 0** (no Google / Xiaomi account currently signed in).

History on device (same dump): Google account was **added** ~2026-11-21 14:03 then **removed** ~14:07 the same day. FRP after a future wipe may still challenge a prior Google account even when the live account list is empty — treat as unknown until Setup Wizard after wipe.

Operator must confirm FRP unlock capability before approving wipe.

---

## Welcome QR after wipe — **proven 2026-11-22**

Human approved wipe (“อนุมัติ”). Path:

1. `LabWipeActivity` `confirm=true` → factory reset (Pad dropped off `adb`).
2. Pre-wipe inventory had **Accounts: 0**; after Setup, operator reached **Home** with USB debugging re-enabled.
3. **Device Owner via Welcome QR** (not `dpm set-device-owner`): `dpm list-owners` → `com.mip.dpc/.MipDeviceAdminReceiver` (DeviceOwner, Affiliated); DPC **0.1.17-lab** from GitHub release `v0.1.17-lab-dpc`.
4. Session `a68aa503-ad74-4f13-920a-08097a014066` stayed `QR_GENERATED` until **post-DO** `LabProvisioningActivity` check-in with rotated `enc_` + LAN endpoint → **`ENROLLING`**.
5. Agent prefs: `apiBase=https://192.168.68.108:3443/api/v1`; `adb reverse` empty; poller `HB=ok`; `last_heartbeat_at` `14:05:58` → `14:18:55` (UTC in DB).

**REENROLL:** recovery `a46cf099-…` APPROVED before new QR.

**Note:** Auto check-in during Setup Wizard compliance did not move the session alone this run; lab completed check-in with `LabProvisioningActivity` after DO was already present. Still **not** the `dpm set-device-owner` shortcut.

**Not claimed:** production Device Owner, financing lock, shop-ready distribution.