# Reference video observations

**Sources:** `docs/reference/mango_android.mp4`, `docs/reference/mango_ios.mp4`  
**Reviewed:** 2026-11-14 by sampling frames across each file (ffmpeg not installed; frames extracted via AVFoundation).  
**Brand shown:** third-party **mangolock / Mango Pay / Mango Lock** tutorials. These are **not** this platform’s product.

## What the videos establish

They demonstrate **store-side provisioning and enrollment UX** for a competitor. They do **not** show:

- Overdue detection, policy levels 1–5, or lock/unlock after missed payments  
- Backend APIs, QR JSON contents, certificates, or MDM server internals  
- Apple Business Manager web UI, ADE token exchange, or Android Enterprise console  
- Whether Play Protect disable is technically required vs a competitor workaround  
- Zero-touch, NFC, or Mac-based Apple Configurator 2 (the iOS video uses **Apple Configurator on an iPhone**)

Do not treat MangoLock behavior as a requirement. Do not copy their “disable Play Protect” or “skip Apple ID” coaching as our product rules.

---

## Android video (`mango_android.mp4`)

On-screen title: **เชื่อมต่อ Android**. Device shown: **Samsung Galaxy Tab A11**. Overlay steps are **3/3**.

| Observed step | What is visible |
|---------------|-----------------|
| Start | Android first-run welcome (Thai locale, “เริ่ม”). Device appears new / not set up. |
| 1/3 Scan QR | Camera caption: scan QR from the **shop system**. A computer screen shows a QR plus Thai instructions and a contract-like code `CT-2026-0018`. Caption says the camera opens to scan the shop QR. |
| 2/3 Play Protect | Competitor labels this “ปิด Play Protect”. Screen “เกิดข้อผิดพลาด” is captioned as **expected, not a broken device**. Help → “จัดการการอัปเดตแอป”. Google Play is shown with overlay **do not sign in to Google**. |
| 3/3 Install app | Caption: tap the welcome screen **6 times**, then scan QR **again**. Android Enterprise screen: “Galaxy Tab A11 เครื่องนี้ไม่ใช่อุปกรณ์ส่วนตัว” (not a personal device) with **ยอมรับและดำเนินการต่อ**. Skip recommended-apps carousel (X). |
| Done | App branded **mangolock** with “เครื่องพร้อมใช้งาน”. |

**Inferences we refuse:** the video does not prove Device Owner vs Profile Owner beyond the standard “not a personal device” DO-style consent screen. It does not show Wi-Fi entry (may occur off-sampled frames). It does not show factory-reset as a labeled step, though first-run strongly implies a clean device. It does **not** show payment-related locking.

**Implications for our plan:** 6-tap QR enrollment is a **real Android first-run pattern** (Enterprise QR). Competitor Play Protect disable is **out of scope as a required step**. QR in the shop UI is bound to a **contract identifier** in their tutorial; we will bind via our enrollment session + later activation, not by stuffing secrets into the QR.

---

## iOS video (`mango_ios.mp4`)

On-screen title: **เชื่อมต่อ iPhone**. Overlay steps are **5/5**.

| Observed step | What is visible |
|---------------|-----------------|
| Start | New iPhone language list; Thai selected. |
| 1/5 Add device | Quick Start screen; caption: choose **Set Up Without Another Device**. Then **Apple Configurator on the shop iPhone** (camera overlay “กำลังเตรียม iPhone…”). Target iPhone reboots (Apple logo). |
| 2/5 New device setup | Join Wi-Fi `Home_5G` and type password (tutorial shows a home SSID; **do not put Wi-Fi passwords in our enrollment QR/payloads**). **Remote Management**: “เจ้าของ iPhone เครื่องนี้คือ: **Anaheim Digital Tech Co, Ltd.**” with register-this-iPhone. Caption: org name is “our shop”. |
| 3/5 Register Mango Lock | On-device form: **shop code** (`988887` from Mango Lock web “add iPhone”), **customer name**, **phone**, **contract number** (`CT-202…`) matching Mango Pay. |
| 4/5 Skip remaining setup | Apple ID screen; caption: **sign in later during setup**. eSIM / remaining screens: continue or set up later. This is **competitor coaching**, not an Apple requirement we will copy as policy. |
| 5/5 Verify | Settings: “iPhone เครื่องนี้ถูกกำกับดูแลและจัดการโดย Anaheim Digital Tech Co, Ltd.” Caption: supervised + managed by shop name = connected. |

**Inferences we refuse:** the video does not show ABM enrollment, ADE, MDM vendor name, supervision method beyond Configurator + Remote Management, or any lock-for-debt UI. Org name on Remote Management looks like a **specific company**, which is evidence that **some merchant-or-partner Apple organization** is in the path — not proof of Model A vs B for *our* SaaS.

---

## Mapping competitor UX → our lifecycle (planning only)

| Competitor beat | Our intended equivalent |
|-----------------|-------------------------|
| Shop QR / shop code | Enrollment session + token; merchant wizard |
| 6-tap Android QR | Official Android Enterprise QR provisioning (DM0) |
| Play Protect off | **Not required.** Prefer Play-distributed / signed Enterprise DPC or AMAPI |
| DO consent screen | Expected if Device Owner / fully managed |
| Configurator on iPhone | Documented iOS path; Mac Configurator 2 and ADE also evaluated in DM0 |
| Remote Management org name | Apple Business / MDM organization display name (ownership TBD) |
| Shop code + customer + contract on device | Activation + bind-contract APIs after MDM enrollment |
| “Device ready” / Settings supervised | Enrollment verified + heartbeat |

Overdue device locking remains specified only by **our** PRD (levels 1–5 + capability matrix), not by these videos.
