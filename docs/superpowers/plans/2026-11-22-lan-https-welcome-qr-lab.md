# LAN HTTPS + Welcome QR Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove Pad 6 agent HTTPS over LAN to `192.168.68.108:3443` without `adb reverse`, inventory Google accounts before wipe, then (only after explicit wipe approval) prove full Welcome QR Device Owner re-enroll.

**Architecture:** Lab ops on existing Phase 3f TLS stack (`scripts/generate-lab-https-certs.sh`, Nest dual listen, DPC CA pin). No new product features. Agent `apiBase` must point at the LAN HTTPS origin (not `127.0.0.1`). Wipe is a hard human gate; FRP unlock is out of band; new QR only after wipe.

**Tech Stack:** OpenSSL lab certs, NestJS HTTPS (`HTTPS_PORT=3443`), Android DPC `0.1.17-lab`+ CA pin, `adb`, Merchant Web enroll/REENROLL.

**Spec:** [../specs/2026-11-22-lan-https-welcome-qr-lab-design.md](../specs/2026-11-22-lan-https-welcome-qr-lab-design.md)

**Commits:** Only if the user asks (project user rule).

---

## File map

| Path | Role |
|------|------|
| `scripts/generate-lab-https-certs.sh` | Regenerate server cert SAN for `192.168.68.108`; copy public CA → DPC raw |
| `lab-certs/*` | Gitignored private keys + certs (never commit keys) |
| `apps/android-dpc/app/src/main/res/raw/mip_lab_ca.crt` | Public CA pin in APK (rebuild if CA file changes) |
| `.env` (local only) | `TLS_*`, `HTTPS_PORT`, `DPC_ENROLLMENT_ENDPOINT=https://192.168.68.108:3443/api/v1/devices/enroll/check-in` |
| `docs/device-management/AGENT-HTTPS-LAB.md` | Record LAN proof row |
| `docs/device-management/lab-evidence/2026-11-22-xiaomi-pad6-lan-https-welcome-qr.md` | New evidence note |
| `docs/roadmap/CURRENT-PHASE.md` | Mark LAN proven; Welcome QR status |
| `docs/project-management/TASK-BACKLOG.md` | Add `R2-P4-006` / `R2-P4-007` DONE when proven |

---

### Task 1: Regenerate lab TLS for LAN IP

**Files:**
- Run: `scripts/generate-lab-https-certs.sh`
- Touch (generated): `lab-certs/server.crt`, `lab-certs/server.key` (and CA files if first run)
- May update: `apps/android-dpc/app/src/main/res/raw/mip_lab_ca.crt` (only if CA regenerated)

- [ ] **Step 1: Confirm host IP**

```bash
ipconfig getifaddr en0
```

Expected: `192.168.68.108`

- [ ] **Step 2: Generate certs**

```bash
cd /Users/tanawutmeesubprung/Documents/mobile-installment-platform
LAB_HTTPS_HOST=192.168.68.108 ./scripts/generate-lab-https-certs.sh
```

Expected stdout includes `Host IP: 192.168.68.108` and paths under `lab-certs/`.

- [ ] **Step 3: Verify SAN includes LAN IP**

```bash
openssl x509 -in lab-certs/server.crt -noout -text | grep -A2 'Subject Alternative Name'
```

Expected: `IP Address:192.168.68.108` and `IP Address:127.0.0.1`.

- [ ] **Step 4: Confirm private keys stay untracked**

```bash
git status --short lab-certs apps/android-dpc/app/src/main/res/raw/mip_lab_ca.crt
```

Expected: `lab-certs/*.key` not staged for commit; if `mip_lab_ca.crt` changed, it is public CA only (OK to commit later if user asks).

---

### Task 2: Backend HTTPS + firewall + env

**Files:**
- Modify (local only): `.env` — set TLS paths, `HTTPS_PORT`, LAN `DPC_ENROLLMENT_ENDPOINT`
- Do not commit `.env`

- [ ] **Step 1: Set local env values** (edit `.env`; keep secrets out of git)

```bash
# Required for this lab proof:
TLS_CERT_PATH=./lab-certs/server.crt
TLS_KEY_PATH=./lab-certs/server.key
HTTPS_PORT=3443
DPC_ENROLLMENT_ENDPOINT=https://192.168.68.108:3443/api/v1/devices/enroll/check-in
```

If `DPC_DOWNLOAD_URL` / `DPC_PACKAGE_CHECKSUM` were already set for QR, leave them; enrollment endpoint must be the LAN HTTPS URL above (not Cloudflare tunnel / not `127.0.0.1`).

- [ ] **Step 2: Allow inbound TCP 3443 (macOS)**

```bash
# Check whether a firewall rule already exists; if Application Firewall blocks node, allow it for lab.
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

If the firewall is on and Pad cannot connect later, allow the Node/Nest binary or temporarily note the block in evidence and fix before claiming pass.

- [ ] **Step 3: Start backend with TLS loaded**

```bash
# From repo root, using the project's usual start command (example):
cd backend && npm run start:dev
# or monorepo equivalent already used in prior lab sessions
```

Expected logs: HTTPS listening on `3443` (or dual listen message from prior Phase 3f).

- [ ] **Step 4: Health from Mac via LAN IP**

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://192.168.68.108:3443/api/v1/health
```

Expected: `200`

- [ ] **Step 5: Health must fail hostname mismatch if wrong IP (sanity)**

```bash
curl -sk --resolve wrong.lab:3443:127.0.0.1 https://wrong.lab:3443/api/v1/health -o /dev/null -w '%{http_code}\n' || true
```

Do not treat this as a gate; optional. Primary gate remains Step 4.

---

### Task 3: Point Pad agent at LAN HTTPS (no adb reverse)

**Files:**
- Device prefs via existing DPC `AgentTokenStore` (no code change required if CA unchanged)
- Rebuild/install APK only if `mip_lab_ca.crt` content changed in Task 1

- [ ] **Step 1: Ensure Pad and Mac share `192.168.68.0/24`**

```bash
adb devices
adb shell ip route | head -5
```

Expected: device online; default route / Wi‑Fi on `192.168.68.x`.

- [ ] **Step 2: Confirm NO reverse for this proof**

```bash
adb reverse --list
```

Expected: empty, or remove `tcp:3443` if present:

```bash
adb reverse --remove tcp:3443 || true
adb reverse --list
```

- [ ] **Step 3: Update agent `apiBase` to LAN HTTPS**

If Device Owner + agent token already exist, update stored `apiBase` to `https://192.168.68.108:3443/api/v1` without wipe.

Preferred lab paths (pick one that works on this Pad):

**A — LabProvisioningActivity** with extras that re-run check-in against LAN endpoint (token must still be valid / or staff issues fresh session and device re-checks-in).

**B — SharedPreferences** (lab only; DO `run-as` may work):

```bash
# Inspect current prefs name if known from prior lab (AgentTokenStore private prefs).
# If run-as works:
adb shell run-as com.mip.dpc cat shared_prefs/*.xml | head -100
```

Set `apiBase` to `https://192.168.68.108:3443/api/v1` while keeping `agentToken` / `deviceId`. Then force-stop and relaunch poller:

```bash
adb shell am force-stop com.mip.dpc
adb shell am start -n com.mip.dpc/.CommandPollActivity
```

If prefs cannot be edited, create a **new** enrollment session with LAN `DPC_ENROLLMENT_ENDPOINT`, Issue QR / lab check-in path that saves `apiBase` from `AgentApiBase.fromCheckInUrl` — still **without** factory wipe for Task 3.

- [ ] **Step 4: Prove Pad can reach host:3443 on Wi‑Fi**

```bash
# From device (toybox may lack curl; use as available):
adb shell "toybox nc -z 192.168.68.108 3443 && echo OPEN || echo CLOSED"
```

Expected: `OPEN`. If `CLOSED`, fix Wi‑Fi subnet / firewall before claiming HTTPS pass.

- [ ] **Step 5: Trigger heartbeat and confirm DB/API update**

1. Launch command poller / wait for heartbeat cycle (DPC `0.1.17-lab` posts heartbeat from poller).
2. Staff `GET /api/v1/devices/:id` (or Merchant Web device panel) — `lastHeartbeatAt` must be fresh (within ~1–2 minutes).
3. Record device id and timestamps in evidence note.

Pass only if path used `https://192.168.68.108:3443` and `adb reverse` was empty for `:3443`.

- [ ] **Step 6: If CA file changed, rebuild DPC**

```bash
cd apps/android-dpc
./gradlew :app:assembleDebug
# install via adb; bump versionName to 0.1.18-lab only if a new APK must be distinguished
```

If CA file unchanged, keep `0.1.17-lab`.

---

### Task 4: Document LAN HTTPS evidence

**Files:**
- Modify: `docs/device-management/AGENT-HTTPS-LAB.md`
- Create: `docs/device-management/lab-evidence/2026-11-22-xiaomi-pad6-lan-https-welcome-qr.md`
- Modify: `docs/roadmap/CURRENT-PHASE.md` (LAN proven note)
- Modify: `docs/project-management/TASK-BACKLOG.md` — add row `R2-P4-006` LAN HTTPS lab DONE when Task 3 passes

- [ ] **Step 1: Update AGENT-HTTPS-LAB.md table**

Replace/add row:

| Path | Result |
|------|--------|
| Direct LAN `https://192.168.68.108:3443` from Pad | Proven YYYY-MM-DD — heartbeat updated `last_heartbeat_at`; **no** `adb reverse` |

- [ ] **Step 2: Write evidence note** with device model, DPC version, deviceId, commands run, pass/fail, and explicit “not production DO”.

- [ ] **Step 3: CURRENT-PHASE + backlog** — mark LAN optional item done; Welcome QR still gated.

---

### Task 5: Pre-wipe Google account inventory (no wipe)

**Files:**
- Append section to evidence note from Task 4

- [ ] **Step 1: List accounts on Pad**

```bash
adb shell dumpsys account | grep -E 'Account |name=' | head -40
# Also ask operator to open Settings → Accounts and confirm visually
```

- [ ] **Step 2: Record results** in the evidence note (emails/names as seen; do not store passwords).

- [ ] **Step 3: Stop and ask the user**

Report the account list in chat. Ask:

1. Can you unlock FRP with this account after wipe?  
2. Do you **explicitly approve** factory reset of Xiaomi Pad 6?

**Do not proceed to Task 6 until the user answers yes to wipe approval in chat.**

---

### Task 6: Welcome QR after wipe (HARD GATE)

**Files:**
- Ops only + evidence append; Merchant Web enroll / `POST .../recovery-requests` REENROLL
- Follow: `docs/device-management/FRP-AND-REENROLL.md`

- [ ] **Step 0: Gate check**

If the latest user message does **not** explicitly approve wipe, **skip this entire task** and leave Welcome QR as deferred in docs.

- [ ] **Step 1: Factory reset** (only after approval)

Use operator-approved method (Settings wipe or lab `LabWipeActivity` / `wipeDevice`). Expect USB debugging cleared mid-wipe.

- [ ] **Step 2: FRP unlock + Wi‑Fi**

Operator signs in with inventoried Google account on Setup Wizard. Platform does **not** clear FRP.

- [ ] **Step 3: REENROLL + new QR**

1. Staff FRP checklist on Merchant Android enroll page.  
2. If device row exists: `POST /api/v1/devices/:id/recovery-requests` body `{"type":"REENROLL","reason":"lab welcome-qr after wipe"}`.  
3. Create new enrollment session → Issue QR with LAN HTTPS `DPC_ENROLLMENT_ENDPOINT` and current `DPC_*` download settings.  
4. Confirm QR payload has **no** secrets (password/private key).

- [ ] **Step 4: Welcome QR provisioning**

On Pad Setup Wizard: 6-tap → scan QR → install custom DPC → Device Owner. **Do not** use `dpm set-device-owner` for this proof.

- [ ] **Step 5: Verify check-in**

```bash
# After DO: session status ENROLLING; device row present
# adb: dpm list-owners shows com.mip.dpc/.MipDeviceAdminReceiver
adb shell dpm list-owners
```

Expected: Device Owner = `com.mip.dpc/...`.

- [ ] **Step 6: Document Welcome QR pass/fail**

Append to `docs/device-management/lab-evidence/2026-11-22-xiaomi-pad6-lan-https-welcome-qr.md`. Update `CURRENT-PHASE.md` and backlog `R2-P4-007` Welcome QR lab. Never claim production DO.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| LAN HTTPS without adb reverse | Tasks 1–4 |
| Pre-wipe account inventory | Task 5 |
| Explicit wipe gate | Task 5 Step 3 + Task 6 Step 0 |
| Welcome QR (not dpm shortcut) | Task 6 Steps 4–5 |
| Docs / no production claim | Tasks 4 + 6 Step 6 |

No TBDs. No new product modules. Commits only on user request.
