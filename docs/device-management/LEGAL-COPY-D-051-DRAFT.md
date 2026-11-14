# D-051 legal / PDPA copy — DRAFT

**Status:** Engineering draft for counsel. **Not** approved contract language. Do not print on live contracts until a lawyer reviews.  
**Languages:** Thai (customer-facing) + English (internal).  
**Related:** D-050 mandatory enroll; D-044 Play Protect stays on; D-045 no secrets in QR; R-022 30-day iOS leave-RM; Lost Mode forbidden for collections.

Fill `[ร้าน]`, `[นิติบุคคล]`, `[ช่องทางติดต่อร้าน]` at use time.

---

## Thai — สัญญาผ่อน + ความยินยอมจัดการอุปกรณ์ (ร่าง)

**การจัดการอุปกรณ์เป็นเงื่อนไขของการผ่อนชำระเครื่องนี้** ลูกค้าจะได้รับเครื่องเมื่อลงทะเบียนเข้าสู่ระบบจัดการของร้านสำเร็จแล้วเท่านั้น

1. **ใครเป็นเจ้าหนี้:** ร้าน `[ร้าน]` เป็นผู้ให้ผ่อน (แพลตฟอร์มไม่ใช่ผู้ให้สินเชื่อ)  
2. **ทำไมต้องลงทะเบียน:** เพื่อผูกเครื่องกับสัญญา ติดตามสถานะ และใช้มาตรการที่เปิดเผยเมื่อค้างชำระตามที่สัญญาอนุญาต  
3. **แอนดรอยด์:** เครื่องจะถูกลงทะเบียนแบบองค์กรผ่านช่องทางที่ระบบปฏิบัติการรองรับ (เช่น QR / Zero-touch) **ห้ามปิด Play Protect ตามคำสั่งร้าน** พนักงานต้องใส่ Wi-Fi บนเครื่องเอง ไม่สแกนรหัสจากคิวอาร์  
4. **ไอโฟน:** เครื่องจะแสดง **Remote Management** ในชื่อนิติบุคคลร้าน ลูกค้าตั้งรหัสผ่าน / Apple ID / Location Services ได้ตามที่ Apple กำหนด ร้าน **ไม่** ใช้ Lost Mode เพื่อทวงหนี้  
5. **หน้าต่าง 30 วัน (เฉพาะเครื่องที่เพิ่มด้วย Apple Configurator):** Apple อาจให้ผู้ใช้ **ออกจาก Remote Management ได้ภายใน 30 วัน** หลังลงทะเบียน หากลูกค้าออกก่อนครบกำหนด ถือว่าผิดเงื่อนไขสัญญา และร้านอาจเรียกเครื่องคืน / ระงับสิทธิ์ตามสัญญา (ไม่ใช่การล็อกจากระบบ Google)  
6. **โทรฉุกเฉิน:** ต้องใช้ได้ทุกช่วงการจัดการ  
7. **ข้อมูล:** ร้านประมวลผล IMEI / หมายเลขเครื่อง / สถานะการลงทะเบียน ตาม PDPA เพื่อปฏิบัติตามสัญญา ไม่เก็บ PAN/CVV ไม่ใช้การเฝ้าดูแอบแฝง  
8. **เมื่อปิดสัญญา:** ร้านจะถอนการผูกและถอนการจัดการตามขั้นตอนที่เปิดเผย  

ช่องทางติดต่อร้าน: `[ช่องทางติดต่อร้าน]`

---

## English — installment + device-management disclosure (draft)

Device management is a **condition of this installment sale**. The handset is handed over only after enrollment completes.

1. The **merchant** `[ร้าน]` is the creditor. The platform does not lend.  
2. Enrollment binds the unit to the contract and allows disclosed, audited management.  
3. **Android:** official enterprise enrollment (QR / Zero-touch). Play Protect remains on. Wi-Fi is entered **on the device**, never in the QR.  
4. **iOS:** Setup shows **Remote Management** under the shop legal name. Passcode, Apple ID, and Location Services are the customer’s choice. **Lost Mode is not used for collections.**  
5. **30-day window (Configurator-added iPhones):** Apple may let the user **leave Remote Management for 30 days** after enrollment. Leaving early is a contract breach; the merchant may demand return of the device under the installment contract (this is not an AMAPI lock). ADE-assigned serials may differ — confirm in lab.  
6. Emergency calling remains available at every management level.  
7. PDPA: IMEI / serial / enrollment status processed to perform the contract. No PAN/CVV. No covert surveillance.  
8. At contract close the merchant unbinds and unenrolls through the published recovery path.

---

## Counsel checklist (do not skip)

- [ ] Thai consumer-contract / hire-purchase wording vs “mandatory MDM”  
- [ ] PDPA lawful basis + retention for IMEI hashes  
- [ ] 30-day leave-RM vs D-050 handover gate (can we still sell Configurator path?)  
- [ ] What the shop may do if the customer leaves RM on day 10  
- [ ] Explicit ban on Lost Mode / wipe as debt tools  
- [ ] Google AMAPI exception (D-054) before any “lock if overdue” sentence
