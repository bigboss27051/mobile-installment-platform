# LAN HTTPS + Welcome QR Lab Design

**Date:** 2026-11-22  
**Status:** Approved — awaiting implementation plan  
**Parent:** R2 Device Provisioning & Enrollment (Android lab completeness)  
**Depends on:** Phase 3f HTTPS agent host (adb-reverse proven), FRP SOP (D-060), REENROLL API  
**Approach:** #3 — LAN HTTPS proof first; pre-wipe Google account inventory; wipe only after explicit human approval

## Goal

1. Prove agent traffic over **LAN Wi‑Fi HTTPS** to the lab Mac at `192.168.68.108:3443` **without** `adb reverse`.
2. Inventory Google accounts on Pad 6 **before** any factory reset so FRP unlock is known.
3. After **explicit wipe approval only**, prove full **Welcome QR** Device Owner path (wipe → FRP unlock → new QR → 6-tap scan → check-in `ENROLLING`), not the sideload + `dpm set-device-owner` shortcut.

## Non-Goals

- Production TLS / public CA / DNS
- Remote FRP bypass or storing Google passwords in the platform
- Play Protect disable (D-044)
- Zero-touch / FRP exemption (D-049) lab
- Multi-SKU matrix (DM0-001)
- iOS / MDM
- Claiming production Device Owner or financing lock

## Decisions

| Item | Choice |
|------|--------|
| Lab Mac LAN IP | `192.168.68.108` (verified on host) |
| Order | HTTPS proof → account inventory → ask wipe → Welcome QR |
| Wipe | Hard gate: no factory reset until user explicitly approves in chat |
| FRP | Operator unlocks with previous Google account out of band; platform issues **new** session/QR only |
| Enrollment after wipe | Welcome QR path only for this proof (not `dpm set-device-owner`) |

## Part A — LAN Wi‑Fi HTTPS

### Steps

1. Regenerate lab certs: `LAB_HTTPS_HOST=192.168.68.108 ./scripts/generate-lab-https-certs.sh` (SAN includes LAN IP; copies public CA into DPC `res/raw`).
2. Rebuild/install lab DPC so the pinned CA matches.
3. Run backend with `TLS_CERT_PATH` / `TLS_KEY_PATH` / `HTTPS_PORT=3443`; allow inbound TCP `3443` on macOS firewall from LAN.
4. Point enrollment/agent base at `https://192.168.68.108:3443/...` (not `127.0.0.1`).
5. On Pad (Wi‑Fi, no USB reverse for this proof): confirm heartbeat/poll succeeds and staff `lastHeartbeatAt` updates.
6. On Mac: `curl -sk https://192.168.68.108:3443/api/v1/health` → 200.

### Pass criteria

| Check | Pass |
|-------|------|
| Host health over LAN HTTPS | 200 |
| Pad agent → `https://192.168.68.108:3443` | `last_heartbeat_at` updates |
| `adb reverse` | **Not** used for the recorded proof |

## Part B — Pre-wipe inventory

### Steps

1. With Pad connected (USB OK for inventory): list Google accounts via Settings and/or `adb` account dumps where available.
2. Report account list to the operator.
3. Operator confirms they can unlock FRP with that account **or** chooses to defer wipe.

### Pass criteria

| Check | Pass |
|-------|------|
| Account list captured | At least one identifier or explicit “none / unknown” documented |
| Wipe | Not performed in this part |

## Part C — Welcome QR after wipe (gated)

### Hard gate

Do **not** factory-reset until the user writes an explicit wipe approval in the session.

### Steps (after approval)

1. Factory reset Pad 6.
2. Unlock FRP with the inventoried Google account; connect Wi‑Fi.
3. Staff: Merchant Web FRP checklist; `REENROLL` if an existing device row needs recovery; create **new** enrollment session → Issue QR (HTTPS LAN endpoint in QR extras).
4. Setup Wizard: 6-tap → scan Welcome QR → custom DPC Device Owner provisioning.
5. Compliance/check-in → session `ENROLLING` (or documented equivalent success).
6. Record evidence separately from prior sideload/dpm restores.

### Pass criteria

| Check | Pass |
|-------|------|
| Path | Welcome QR DO (not dpm shortcut) |
| Session | New `enc_` / QR after wipe; check-in succeeds |
| FRP | Cleared by operator account; no remote platform clear |

## Docs to update when gates pass

- `docs/device-management/AGENT-HTTPS-LAB.md` — LAN row proven
- Lab evidence note under `docs/device-management/lab-evidence/`
- `docs/roadmap/CURRENT-PHASE.md` — next/lab notes
- `docs/project-management/TASK-BACKLOG.md` — new task id(s) DONE when proven

## Out of scope claims

Prototype lab only. Do not mark commercial Device Owner / MDM / live payments complete.
