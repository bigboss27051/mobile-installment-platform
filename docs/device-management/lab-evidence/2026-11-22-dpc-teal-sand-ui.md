# Lab evidence: DPC Teal/Sand UI (Pad 6)

**Date:** 2026-11-22  
**Device:** Xiaomi Pad 6 (`pipa` / `23043RP34G`), Android 14, Device Owner `com.mip.dpc`  
**APK:** `0.1.19-lab` (`versionCode` 19)  
**Result:** Visual acceptance — **PASS** (lab only; not production DO)

## Checklist

| Check | Result | Evidence |
|-------|--------|----------|
| Lock split Teal/Sand, TH+EN, emergency dock | PASS | `2026-11-22-dpc-teal-sand-lock.png` |
| Optional amount / due / contract rows | PASS | `2026-11-22-dpc-teal-sand-lock-amount.png` |
| Lab shell sand + teal status | PASS | `2026-11-22-dpc-teal-sand-lab.png` |
| Reminder TH+EN + teal accent | PASS | `2026-11-22-dpc-teal-sand-reminder-shade.png` (id `4101`, channel `mip_overdue_reminder`) |

## Notes

- Install via `adb push` + `pm install -r` (MIUI USB install dialog may cancel `adb install -r`).
- Unlock lab Lock Task: `am start -n com.mip.dpc/.MangoLockActivity -f 0x10008000 --ez clearLock true` then Home.
- Reminder may not appear if package notification importance is `NONE`; grant `POST_NOTIFICATION` / allow app notifications.
- Desired policy left at `NONE` after the run.
