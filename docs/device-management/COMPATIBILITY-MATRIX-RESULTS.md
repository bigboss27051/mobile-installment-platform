# Compatibility matrix results

**Updated:** 2026-11-23  
**Operator:** Fill per physical SKU; desk rows remain **NOT RUN** until hardware evidence  
**Procedure:** For each shop SKU — factory-fresh or FRP-cleared → Welcome QR DO → check-in → START_LOCK_TASK / STOP → note Play Protect warnings. Ask before wipe. See [DM0-LAB-PROTOCOL.md](./DM0-LAB-PROTOCOL.md), [DPC-HOSTING-CHECKLIST.md](./DPC-HOSTING-CHECKLIST.md).

## Android custom DPC QR (implementation path D-057)

| Model | OS | GMS | 6-tap QR DO | Check-in | Lock Task | Package suspend | Result |
|-------|----|-----|-------------|----------|-----------|-----------------|--------|
| Xiaomi Pad 6 (pipa) | 14 | Y | Lab DONE (evidence) | Lab DONE | Lab DONE | Lab DONE | Lab only — not production DO |
| Samsung phone (shop SKU) | | Y expected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | BLOCKED |
| Xiaomi phone (shop SKU) | | Y expected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | BLOCKED |
| OPPO / vivo (shop SKU) | | Y expected | NOT RUN | NOT RUN | NOT RUN | NOT RUN | BLOCKED |
| Non-GMS / custom ROM | | N | — | — | — | — | **Unsupported** (D-052) |

Zero-touch (reseller-registered unit): **NOT RUN**. Thailand partners historically include A2 Network and DTAC; merchant contract not verified here.

## iOS Configurator / MDM

| Host iOS | Target iOS | Configurator | ABM org | MDM | Remote Management name | DeviceLock | Result |
|----------|------------|--------------|---------|-----|------------------------|------------|--------|
| NOT RUN | NOT RUN | iPhone app | none | none | — | — | BLOCKED |

Desk constraint: Configurator-for-iPhone needs **iOS 16+** on host and target. 30-day leave-RM window after Configurator-added enroll.

## Exit

Physical rows must be filled before claiming Device Owner / MDM. See [PHYSICAL-LAB-RUNBOOK.md](./PHYSICAL-LAB-RUNBOOK.md).
