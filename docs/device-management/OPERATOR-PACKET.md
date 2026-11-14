# งานคนคืนนี้: ส่งฟอร์ม Google + แล็บเครื่อง

**เจ้าของ:** คน (นิติบุคคล + Google account) — เอเจนต์ส่งฟอร์มแทนไม่ได้  
**ฟอร์มที่เปิดไว้:** [Android Management API General Usage Inquiry](https://services.google.com/fb/forms/AMAPIUsageInquiry/) (`goo.gle/android-enterprise-response`)  
**นโยบาย:** [Permissible Usage](https://developers.google.com/android/management/permissible-usage) (อัปเดต 2026-03-30) — **ห้าม** device financing / EMI lock ตามสถานะชำระ  
**จนกว่า Google เขียน allow:** ห้าม `policies.patch` / `issueCommand` LOCK จากค้างชำระ (D-054)

---

## A. ส่งฟอร์ม (DM0-006) — ทำก่อนแล็บ AMAPI

### A1. Cloud ก่อนกด Submit

1. เปิด [Google Cloud Console](https://console.cloud.google.com/) ด้วยอีเมลบริษัท  
2. สร้างโปรเจกต์ **dev เท่านั้น** (ชื่อเช่น `mip-amapi-dev`) — โควต้าให้ได้สูงสุด 2 โปรเจกต์ต่อ developer  
3. Enable **Android Management API**  
4. คัดลอก **Project ID** (เช่น `mip-amapi-dev-xxxxxx`)  
5. ถ้ายังไม่มีโปรเจกต์จริง ให้ใส่ `none` ในฟอร์มได้ — แต่ควรมี ID จะรีวิวเร็วกว่า

ตั้งแต่วันที่ 1 พ.ย. 2025 การ enroll เครื่องผ่าน AMAPI ต้องผ่านการลงทะเบียน Android Enterprise + โควต้าก่อน ไม่เช่นนั้น QR จะขึ้น *usage limits*.

### A2. กรอกฟิลด์ตามหน้าฟอร์มจริง

| ฟิลด์บนฟอร์ม | ใส่ค่า |
|--------------|--------|
| Name | ชื่อผู้ติดต่อจริง |
| Company Name | ชื่อนิติบุคคลไทยตามหนังสือรับรอง |
| Contact email | อีเมลบริษัทที่รับจดหมาย Google (อย่าใช้อีเมลส่วนตัวถ้าทำได้) |
| Enterprise type | เลือกแนว **EMM / commercial EMM developer** (ไม่ใช่ OEM, ไม่ใช่ in-house only) |
| Android Management API Project ID | Project ID จาก A1 หรือ `none` |
| Please describe your use case | วางข้อความภาษาอังกฤษด้านล่างทั้งก้อน |

กด Submit แล้ว **เก็บ** หน้า confirmation / อีเมลตอบกลับ → ใส่ตารางใน [GOOGLE-AMAPI-USAGE-INQUIRY.md](./GOOGLE-AMAPI-USAGE-INQUIRY.md)

รีวิวโควต้ามัก ~14 วันทำการ ชุมชน Google **อุทธรณ์ไม่ได้** ถ้าโดนปฏิเสธ

### A3. ข้อความวางในช่อง use case (อังกฤษ — copy ทั้งก้อน)

```
Organization: [LEGAL NAME], Thailand.
Product: Multi-tenant SaaS for mobile-phone retailers who sell handsets on merchant-funded installment. The platform does not lend. Merchants are external commercial customers (EMM), not an in-house-only fleet.

Intended AMAPI role: Commercial EMM. Fully managed / company-owned enrollment at point of sale via official QR and Android Device Policy. Zero-touch only when a reseller has already registered the IMEI. No Play Protect-off SOP. No Wi-Fi passwords in QR payloads.

What we want AMAPI to do:
1) Enroll new or factory-reset GMS devices as fully managed.
2) One AMAPI enterprise per merchant tenant where quotas allow.
3) Apply graduated policies that the merchant configures, disclosed in the customer contract, with audit, expiry, human approval for severe levels, emergency calling always available, no hidden DPC, and no Lost Mode or factory reset as a collections action.
4) Product policy steps: (1) normal (2) warning/notifications only (3) limit entertainment apps (4) lock screen with a call-shop path (5) maximum restrict short of blocking emergency services. Transitions would be tied to verified installment arrears and reverse when the account is current.

What we will not do with AMAPI:
- Covert surveillance, keylogging, accessibility-API stalking, or Advertising ID use.
- First-party in-house-only fleet with no merchant customers.
- Lost Mode or factory reset as a debt-collection action.

Question (permissible usage):
Does this retail installment / EMI-adjacent use, with informed contract consent and the merchant as creditor, fall under the prohibited “device financing solutions … based on payment status (e.g., non-payment of EMI)” clause?

- If yes (prohibited): we will not use AMAPI to change policy or issue LOCK based on arrears. Please confirm whether enrollment-only / inventory-only AMAPI (no payment-triggered policy) is still allowed for the same merchants.
- If no (allowed) or allowed with conditions: please list conditions (partner program, quotas, disclosure, prohibited commands).

Quota request: we request an initial development-project device quota (up to 500) for lab enrollment of GMS devices. A second production project would be requested only after usage is approved. Until written approval, we will not enroll production retail devices.

Direct customer agreement: each merchant tenant will have a contract with us; end customers sign the retail installment contract that discloses device management.
```

อย่าแก้ประโยคที่ถามเรื่องข้อห้าม EMI — นั่นคือจุดที่ต้องให้ Google ตอบเป็นลายลักษณ์อักษร

---

## B. แล็บเครื่อง (ทำคู่ขนานได้ — ไม่ต้องรอคำตอบ Google สำหรับการซื้อ/นับ SKU)

จนกว่าโควต้า + allow จะ **อย่า** สแกน QR ของ Google Device Policy แล้วอ้างว่า Device Owner ใช้งานได้ในร้าน

### B1. รายการซื้อ / ยืมจากสต็อกร้าน (Android — DM0-001)

ต้องการ **อย่างน้อย 3 เครื่อง GMS คนละแบรนด์** ที่ร้านขายจริง เครื่องใหม่หรือรีเซ็ตโรงงาน:

| ลำดับ | แบรนด์ | หมายเหตุ |
|--------|--------|----------|
| 1 | Samsung (ซีรีส์ที่ร้านขาย) | GMS, อัปเดต Play services ได้ |
| 2 | Xiaomi / Redmi **โกลบอล/ไทย** | **ห้าม** China ROM / ไม่มี Play |
| 3 | OPPO หรือ vivo ที่ร้านขาย | GMS |

ห้ามแล็บเครื่องไม่มี GMS เป็น in-scope (D-052)

อุปกรณ์ประกอบ: สายชาร์จ, ซิมหรือ Wi-Fi ร้านที่พนักงานพิมพ์บนเครื่องเอง, กล้องมือถือสำรองถ่ายหลักฐาน

**อย่า:** ปิด Play Protect · ใส่รหัส Wi-Fi ใน QR · ล็อกเครื่องจากสถานะค้างชำระ

ขั้นตอนต่อเครื่อง: รีเซ็ต → Welcome → แตะ 6 ครั้ง → สแกน QR **หลัง** Google อนุมัติโควต้า → พนักงานใส่ Wi-Fi บนเครื่อง → บันทึกลง [COMPATIBILITY-MATRIX-RESULTS.md](./COMPATIBILITY-MATRIX-RESULTS.md) + รูปใน `lab-evidence/`

ถ้ายังไม่มีโควต้า: ซื้อ/ยืมเครื่องได้วันนี้ แต่แถวผลลัพธ์ยังเป็น **NOT RUN** สำหรับ AMAPI enroll

### B2. iOS (DM0-002) — คนละคิวกับ Google

| ชิ้น | ทำอะไร |
|------|--------|
| นิติบุคคล | สมัคร [Apple Business Manager](https://business.apple.com/) |
| MDM trial | หนึ่งตัวจาก [MDM-VENDOR-SHORTLIST.md](./MDM-VENDOR-SHORTLIST.md) — ยังไม่ปิด SKU |
| iPhone ร้าน (host) | iOS 16+ ติดตั้ง Apple Configurator |
| iPhone เป้า | iOS 16+ ลบเครื่อง หยุดที่หน้า Wi-Fi |

Lost Mode **ไม่ใช่** เครื่องมือทวงหนี้ · ต้องเปิดเผยหน้าต่าง 30 วันออกจาก Remote Management หลัง Configurator

### B3. หลักฐาน

วางสกรีน (ไม่มีรหัส, ไม่มีคีย์) ที่ `docs/device-management/lab-evidence/`  
ไฟล์ลับถูก git-ignore แล้ว

---

## C. สิ่งที่ซอฟต์แวร์ทำอยู่แล้ว (ไม่ใช่งานคืนนี้)

เซสชัน enroll + QR stub, activate/bind ในฐานข้อมูล, Merchant Web ไทยเป็นหลัก, RBAC 3a  
**ยังห้าม** AMAPI HTTP ล็อกจากค้างชำระ
