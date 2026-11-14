# MDM vendor shortlist (not a decision)

**Status:** Open. Architecture is **Model B + `MdmProviderPort`** (D-043). This file does **not** pick a SKU.  
**Do not** build an in-house MDM protocol.

Use this when a human compares trial accounts. Lab still required before production claims.

| Vendor | Fit notes for Thailand retail installment | Watch-outs |
|--------|-------------------------------------------|------------|
| **Jamf** (School/Pro/Now) | Strong Apple story; ADE/Configurator well documented | Cost; SMB “Now” vs full Pro; confirm DeviceLock vs Lost Mode mapping |
| **Mosyle** | Business-focused Apple MDM; often cheaper than Jamf | Confirm APNs + ABM assignment in TH entity |
| **SimpleMDM** | Small-fleet, API-first, maps cleanly to an adapter | Smaller ecosystem; support hours |
| **Kandji** | Mac/iOS automation | Overkill if we only need iPhone supervision + lock |
| **Microsoft Intune** | If a merchant already lives in M365 | Heavier; not iPhone-Configurator-first |

**Must be true of any pick**

- Assigned as the merchant’s MDM server **in that merchant’s ABM** (Model B).  
- Adapter talks vendor API; platform stores `secret_ref` only.  
- Commands we cannot support return `422 UNSUPPORTED_CAPABILITY` (no silent success).  
- **Lost Mode / wipe are not collections tools.**  
- Disclose Configurator **30-day leave Remote Management** (see legal draft).

**How to close this later:** run DM0-002 on one vendor trial, record check-in + DeviceLock (not Lost Mode) in `lab-evidence/`, then add a Decision Log row. Until then the SKU stays **pending**.
