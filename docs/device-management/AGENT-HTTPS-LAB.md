# Agent HTTPS lab (adb reverse → real host)

**Status:** lab guidance. Not production Device Owner / financing.

## Today (USB lab)

1. Backend on host `:3000`.
2. `adb reverse tcp:3000 tcp:3000`.
3. Agent `apiBase` from check-in URL, e.g. `http://127.0.0.1:3000/api/v1` (cleartext allowed in DPC `network_security_config` for lab).
4. Heartbeat: `POST /api/v1/devices/agent/heartbeat` with `X-Device-Agent-Token`.

## Next shop-relevant step

Point `DPC_ENROLLMENT_ENDPOINT` at an **HTTPS** API host (no secrets in URL). After check-in, `AgentApiBase` stores `https://…/api/v1`. Keep lab cleartext only behind `adb reverse` / emulator.

Do not put passwords or private keys in QR extras. Do not claim production until Play-signed DPC + HTTPS evidence exist.
