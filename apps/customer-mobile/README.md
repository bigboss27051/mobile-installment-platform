# Customer mobile (Flutter)

R1f: OTP login, contracts, sandbox PromptPay.
Lab completeness A: pay uses contract `outstandingBalance` from the API (not a hardcoded 100). Device/lock status is a first-class entry after login; OS lock on financed Android is the DPC’s job.

IOS-B: mp_pay lock screens (activation, enrollment, overdue, restricted, locked, balance, QR, pending, unlock, recovery). Open **Lock screens (preview)** on login to exercise UI without MDM.

This app does **not** enroll Apple MDM or enable Single App Mode. Copy must not claim the iPhone is OS-locked unless `osEnforcement` is confirmed.

iOS target: `com.mip.customer_mobile`. Deep link: `mipcustomer://lock?screen=locked` (no secrets).
