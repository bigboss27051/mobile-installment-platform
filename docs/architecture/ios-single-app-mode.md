# iOS Single App Mode (financing lock)

**Status:** Design accepted (D-056). **Not production-validated.**  
**Requires:** Supervised iPhone + MDM enrollment + managed install of the customer app.

## What Single App Mode is

On a **supervised** iOS device, MDM can install the **AppLock** payload (`com.apple.app.lock`) so SpringBoard only runs one app (our customer “mp_pay lock” UI). The customer cannot leave that app with the Home / App Switcher while the payload is installed. Emergency calling behavior must be **lab-validated** on the target iOS version; do not ship if emergency access is blocked.

This is **not**:

- The MDM **DeviceLock** command (device passcode lock / “iPhone is disabled” style lock). We may support DeviceLock later as a separate command type; it is **not** the financing lock UX (balance + PromptPay QR).  
- **Lost Mode** (forbidden for collections).  
- A Flutter `WillPopScope` full-screen page. App UI alone is **not** an iPhone lock. Copy must never say the whole iPhone is locked unless `osEnforcement` is confirmed Single App Mode.  
- Android lock-task / Device Owner kiosk.

**Autonomous Single App Mode (ASAM)** (app requests SAM when MDM allows it) is weaker: the app could exit. Financing lock uses **MDM-forced AppLock**, not ASAM.

## Command flow (IOS-D target)

1. Shared policy engine (not yet built) sets **desired** level `LOCK`.  
2. Device command row: type `ENABLE_SINGLE_APP_MODE`, status `QUEUED`, tenant + device + reason + actor.  
3. `MdmProviderPort` maps to vendor API (install AppLock / Single App Mode for bundle ID).  
4. Vendor wakes device via APNs; device acknowledges.  
5. Adapter records `ACKNOWLEDGED`. Only then `osEnforcement = SINGLE_APP_MODE`.  
6. App shows outstanding balance + PromptPay QR + shop contact (IOS-B UI).  
7. Verified payment → orchestrator (IOS-E) enqueues `DISABLE_SINGLE_APP_MODE`.  
8. Vendor removes AppLock; ack → `osEnforcement = NONE`. Home Screen returns.

Offline device: command stays `SENT` / `QUEUED`; business state stays “unlock pending”; UI may show payment succeeded while OS is still locked until ack.

Reboot: AppLock typically **persists** on supervised devices. Must be proven in lab (IOS-D). Do not assume.

## Restrictions (Level RESTRICT)

iOS cannot “suspend” arbitrary third-party apps the way Android Device Owner can. Options if the vendor supports them on supervised devices:

- Restrictions payload (app installation, explicit app denylist/allowlist — **vendor- and OS-version-specific**).  
- Managed app config for *our* app only.  

If the vendor cannot approximate RESTRICT, return `UNSUPPORTED_CAPABILITY`. Never fake Android level 3/5 parity.

## Bundle ID

Single App Mode targets the **installed** customer app bundle ID (Flutter iOS target). Until TestFlight / MDM app catalog exists, lab must use a development build the MDM can install or allow.

## Safety

- Customer consent + contract authorization before enrollment.  
- Reason + authz on every restrict command.  
- Recovery / support path always visible in the lock app.  
- No covert control or surveillance.  
