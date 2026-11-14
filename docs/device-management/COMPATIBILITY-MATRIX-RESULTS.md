# Compatibility matrix results

**Lab date:** 2026-11-14  
**Operator:** Cursor agent (desk only)  
**Hardware:** none in workspace → all SKU rows **NOT RUN**

## Android QR / AMAPI

| Model | OS | GMS | 6-tap QR | AMAPI enroll without Play Protect off | IMEI in AMAPI | Result |
|-------|----|-----|----------|----------------------------------------|---------------|--------|
| Samsung (TBD) | | Y expected | NOT RUN | NOT RUN | NOT RUN | BLOCKED |
| Xiaomi (TBD) | | Y expected | NOT RUN | NOT RUN | NOT RUN | BLOCKED |
| OPPO or vivo (TBD) | | Y expected | NOT RUN | NOT RUN | NOT RUN | BLOCKED |
| Non-GMS / custom ROM | | N | — | — | — | **Unsupported** (D-052), do not lab as in-scope |

Zero-touch (reseller-registered unit): **NOT RUN**. Thailand partners historically include A2 Network and DTAC; merchant contract not verified here.

## iOS Configurator / MDM

| Host iOS | Target iOS | Configurator | ABM org | MDM | Remote Management name | DeviceLock | Result |
|----------|------------|--------------|---------|-----|------------------------|------------|--------|
| NOT RUN | NOT RUN | iPhone app | none | none | — | — | BLOCKED |

Desk constraint: Configurator-for-iPhone needs **iOS 16+** on host and target. 30-day leave-RM window after Configurator-added enroll.

## Exit

Physical rows must be filled before claiming Device Owner / MDM. See [PHYSICAL-LAB-RUNBOOK.md](./PHYSICAL-LAB-RUNBOOK.md).
