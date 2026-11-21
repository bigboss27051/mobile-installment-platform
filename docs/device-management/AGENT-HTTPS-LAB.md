# Agent HTTPS lab

**Status:** lab proven on Xiaomi Pad 6 (`0.1.14-lab`). Not production Device Owner / financing.

## What “HTTPS agent host” means here

1. Backend also listens on **HTTPS** (`HTTPS_PORT`, default `3443`) when `TLS_CERT_PATH` + `TLS_KEY_PATH` are set.
2. DPC pins the public **MIP Lab CA** (`res/raw/mip_lab_ca.crt`) so the agent trusts that TLS chain without a user-installed CA.
3. After check-in (or prefs), `apiBase` is `https://…/api/v1` — heartbeat / poll / ack use TLS.

Cleartext `adb reverse` to `:3000` remains allowed for USB-only loops; prefer HTTPS for shop-relevant paths.

## Generate certs (local machine)

```bash
LAB_HTTPS_HOST=<your-LAN-IP> ./scripts/generate-lab-https-certs.sh
```

- Writes gitignored `lab-certs/{ca,server}.{crt,key}`
- Copies **public** `ca.crt` → `apps/android-dpc/app/src/main/res/raw/mip_lab_ca.crt`
- SAN includes LAN IP, `127.0.0.1`, `localhost`, `mip-lab.local`

**Never commit private keys.** Re-run when the LAN IP changes, then rebuild the DPC.

## Run backend

```bash
export TLS_CERT_PATH=./lab-certs/server.crt
export TLS_KEY_PATH=./lab-certs/server.key
export HTTPS_PORT=3443
# PORT=3000 still serves HTTP for Merchant Web
```

QR / env: `DPC_ENROLLMENT_ENDPOINT=https://<host>:3443/api/v1/devices/enroll/check-in` (HTTPS required by enrollment-qr validation).

## Pad 6 evidence (2026-11-21)

| Path | Result |
|------|--------|
| Host `curl -sk https://127.0.0.1:3443/api/v1/health` | 200 |
| Host agent heartbeat over HTTPS | 200 + `lastHeartbeatAt` |
| Device `apiBase=https://127.0.0.1:3443/api/v1` + `adb reverse tcp:3443 tcp:3443` | Poller updated `last_heartbeat_at` (TLS + lab CA) |
| Direct LAN `https://192.168.1.7:3443` from Pad | Not proven this session (Pad Wi‑Fi subnet `192.168.68.x` vs Mac `192.168.1.7`; open firewall / same L2 for shop Wi‑Fi) |

## Wipe / FRP

Factory reset → FRP is a **separate** lab gate. **Ask before wipe.** Platform cannot clear FRP remotely ([FRP-AND-REENROLL.md](./FRP-AND-REENROLL.md)).
