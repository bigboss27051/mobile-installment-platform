export type Locale = 'th' | 'en';

export const DEFAULT_LOCALE: Locale = 'th';
export const LOCALE_STORAGE_KEY = 'mip.merchant.locale';

const th: Record<string, string> = {
  'nav.brand': 'ร้านค้า',
  'nav.products': 'สินค้า',
  'nav.inventory': 'สต็อก',
  'nav.customers': 'ลูกค้า',
  'nav.applications': 'คำขอผ่อน',
  'nav.contracts': 'สัญญา',
  'nav.enroll': 'ลงทะเบียนเครื่อง',
  'nav.logout': 'ออกจากระบบ',
  'nav.menu': 'เมนู',
  'nav.langTh': 'ไทย',
  'nav.langEn': 'EN',

  'login.title': 'เข้าสู่ระบบร้านค้า',
  'login.email': 'อีเมล',
  'login.password': 'รหัสผ่าน',
  'login.submit': 'เข้าสู่ระบบ',
  'login.failed': 'เข้าสู่ระบบไม่สำเร็จ',

  'products.title': 'สินค้า',
  'products.name': 'ชื่อสินค้า',
  'products.brand': 'ยี่ห้อ',
  'products.create': 'สร้างสินค้า',
  'products.loadFailed': 'โหลดสินค้าไม่สำเร็จ',
  'products.colName': 'ชื่อ',
  'products.colBrand': 'ยี่ห้อ',
  'products.empty': 'ยังไม่มีสินค้า',
  'products.new': 'เพิ่มสินค้า',

  'inventory.title': 'สต็อก',
  'inventory.variantId': 'รหัสรุ่นสินค้า',
  'inventory.imei': 'IMEI',
  'inventory.receive': 'รับเข้า IMEI',
  'inventory.colImei': 'IMEI',
  'inventory.colStatus': 'สถานะ',
  'inventory.loadFailed': 'โหลดสต็อกไม่สำเร็จ',
  'inventory.receiveReason': 'รับเข้าจากเว็บร้าน',
  'inventory.empty': 'ยังไม่มี IMEI',
  'inventory.new': 'รับเครื่องเข้าสต็อก',

  'customers.title': 'ลูกค้า',
  'customers.fullName': 'ชื่อ-นามสกุล',
  'customers.phone': 'เบอร์โทร',
  'customers.nationalId': 'เลขบัตรประชาชน',
  'customers.create': 'สร้างลูกค้า',
  'customers.colName': 'ชื่อ',
  'customers.colPhone': 'เบอร์โทร',
  'customers.colNationalId': 'บัตรประชาชน',
  'customers.loadFailed': 'โหลดลูกค้าไม่สำเร็จ',
  'customers.empty': 'ยังไม่มีลูกค้า',
  'customers.new': 'เพิ่มลูกค้า',
  'customers.nationalIdHelper': 'เลขบัตร 13 หลัก แสดงแบบปกปิดในรายการ',

  'applications.title': 'คำขอผ่อน',
  'applications.customerId': 'รหัสลูกค้า',
  'applications.imeiUnitId': 'รหัสหน่วย IMEI',
  'applications.principal': 'ราคาสินค้า',
  'applications.downPayment': 'เงินดาวน์',
  'applications.create': 'สร้างฉบับร่าง',
  'applications.colId': 'รหัส',
  'applications.colStatus': 'สถานะ',
  'applications.submit': 'ส่งพิจารณา',
  'applications.approve': 'อนุมัติ',
  'applications.approveReason': 'อนุมัติจากเว็บร้าน',
  'applications.loadFailed': 'โหลดคำขอไม่สำเร็จ',
  'applications.empty': 'ยังไม่มีใบสมัคร',
  'applications.new': 'สร้างใบสมัคร',

  'contracts.title': 'สัญญา',
  'contracts.applicationId': 'รหัสคำขอที่อนุมัติแล้ว',
  'contracts.create': 'สร้างสัญญาฉบับร่าง',
  'contracts.colId': 'รหัส',
  'contracts.colStatus': 'สถานะ',
  'contracts.open': 'เปิด',
  'contracts.activate': 'เปิดใช้สัญญา',
  'contracts.detailTitle': 'สัญญา {id}',
  'contracts.status': 'สถานะ {status}',
  'contracts.colSeq': 'งวด',
  'contracts.colDue': 'ยอดถึงกำหนด',
  'contracts.colPaid': 'ชำระแล้ว',
  'contracts.amount': 'จำนวนเงิน',
  'contracts.createIntent': 'สร้าง PromptPay',
  'contracts.loadFailed': 'โหลดสัญญาไม่สำเร็จ',
  'contracts.empty': 'ยังไม่มีสัญญา',
  'contracts.new': 'สร้างสัญญา',
  'contracts.list': 'สัญญา',

  'enroll.title': 'ลงทะเบียนเครื่อง',
  'enroll.stubNote':
    'คิวอาร์นี้มาจาก API จำลอง ยังไม่ใช่ Device Owner / AMAPI จริง ห้ามปิด Play Protect ห้ามใส่รหัส Wi-Fi ในคิวอาร์ พนักงานใส่ Wi-Fi บนเครื่อง',
  'enroll.contractId': 'รหัสสัญญาที่เปิดใช้แล้ว',
  'enroll.android': 'แอนดรอยด์',
  'enroll.ios': 'ไอโฟน',
  'enroll.createSession': 'สร้างเซสชันและแสดงคิวอาร์',
  'enroll.sessionId': 'เซสชัน {id}',
  'enroll.status': 'สถานะ {status}',
  'enroll.expires': 'หมดอายุ {at}',
  'enroll.iosInstructions':
    'ไอโฟนใช้ Apple Configurator / Remote Management ไม่ใช้คิวอาร์แบบแอนดรอยด์',
  'enroll.fingerprint': 'ลายนิ้วมือ {hash}',
  'enroll.wifiForbidden': 'เพย์โหลดคิวอาร์มีรหัส Wi-Fi ห้ามใช้งาน',
  'enroll.reason': 'เหตุผล (ต้องระบุตอนผูกสัญญา)',
  'enroll.activateBind': 'เปิดใช้งานและผูกสัญญา',
  'enroll.bound': 'เครื่อง {id} ผูกในระบบแล้ว (ยังไม่เรียก AMAPI)',
  'enroll.defaultReason': 'ยืนยันเปิดใช้งานที่เคาน์เตอร์',
  'enroll.failed': 'ลงทะเบียนเครื่องไม่สำเร็จ',
  'enroll.bindFailed': 'เปิดใช้งานหรือผูกสัญญาไม่สำเร็จ',
  'enroll.consent':
    'ลูกค้ายินยอมให้ร้านจัดการอุปกรณ์ตามร่างสัญญา (ยังไม่ใช่ข้อความกฎหมายสุดท้าย)',
  'enroll.androidHow': 'ขั้นตอนแอนดรอยด์',
  'enroll.androidStep1': 'เครื่องต้องใหม่หรือรีเซ็ตโรงงาน และมี GMS',
  'enroll.androidStep2': 'เมื่อถาม Wi-Fi ให้ใส่บนเครื่อง ห้ามสแกนรหัสจากเว็บนี้',
  'enroll.androidStep3': 'หน้า Welcome แตะ 6 ครั้ง แล้วสแกนคิวอาร์นี้',
  'enroll.androidStep4': 'ยอมรับว่าเครื่องนี้เป็นขององค์กรร้าน',
  'enroll.playProtect': 'ห้ามปิด Play Protect',
  'enroll.iosHow': 'ขั้นตอนไอโฟน',
  'enroll.iosPrereqTitle': 'ต้องครบก่อนเริ่ม (ร้านยืนยันเอง — ยังไม่มี MDM จริง)',
  'enroll.iosPrereqAbm': 'ร้านมี Apple Business Manager',
  'enroll.iosPrereqMdm': 'มี MDM vendor ผูกกับ ABM แล้ว',
  'enroll.iosPrereqConfigurator': 'ไอโฟนร้านมีแอป Configurator (iOS 16+)',
  'enroll.iosPrereqErased': 'ไอโฟนลูกค้าใหม่หรือลบเครื่องแล้ว หยุดที่หน้า Wi-Fi',
  'enroll.iosStep1': 'เปิด Configurator บนไอโฟนร้าน แล้วเพิ่มเครื่องนี้เข้า Apple Business',
  'enroll.iosStep2': 'เครื่องลูกค้ารีสตาร์ทเข้า Setup Assistant',
  'enroll.iosStep3': 'ต่อ Wi-Fi บนเครื่อง หน้า Remote Management ต้องเป็นชื่อนิติบุคคลร้านนี้',
  'enroll.iosStep4': 'กด Register แล้วตั้งรหัส / Apple ID ตามที่ลูกค้าเลือก',
  'enroll.iosStep5': 'รอสถานะกำลังลงทะเบียน แล้วค่อยยืนยันและผูกสัญญา',
  'enroll.iosNoSkip': 'ห้ามสอนข้ามรหัสผ่าน Apple ID หรือ Location Services และห้ามใช้ Lost Mode ทวงหนี้',
  'enroll.iosThirtyDays':
    'เครื่องที่เพิ่มด้วย Configurator อาจออกจาก Remote Management ได้ใน 30 วัน ต้องเปิดเผยในสัญญา',
  'enroll.refresh': 'รีเฟรชสถานะ',
  'enroll.issueQr': 'ออก QR',
  'enroll.cancel': 'ยกเลิกเซสชัน',
  'enroll.newSession': 'เริ่มเซสชันใหม่',
  'enroll.handoverBlocked': 'ยังส่งมอบเครื่องไม่ได้ จนกว่าสถานะจะเป็นเสร็จสิ้น',
  'enroll.handoverReady': 'ผูกสัญญาในระบบแล้ว (ยังไม่ใช่ Device Owner จริง) พร้อมส่งมอบเฉพาะเมื่อแล็บผ่าน',
  'enroll.needConsent': 'ต้องติ๊กความยินยอมก่อนสร้างเซสชัน',
  'enroll.needIosPrereq': 'ต้องยืนยันเงื่อนไขไอโฟนให้ครบก่อน',
  'enroll.state.NOT_STARTED': 'ยังไม่เริ่ม',
  'enroll.state.WAITING_FOR_DEVICE': 'รอเครื่อง',
  'enroll.state.QR_GENERATED': 'ออก QR แล้ว',
  'enroll.state.PROVISIONING': 'กำลังเตรียมเครื่อง',
  'enroll.state.ENROLLING': 'กำลังลงทะเบียน',
  'enroll.state.VERIFYING': 'กำลังตรวจตัวตน',
  'enroll.state.ACTIVATING': 'กำลังเปิดใช้',
  'enroll.state.COMPLETED': 'เสร็จสิ้น',
  'enroll.state.FAILED': 'ล้มเหลว',
  'enroll.state.EXPIRED': 'หมดอายุ',
  'enroll.state.CANCELLED': 'ยกเลิกแล้ว',
  'enroll.state.RECOVERY_REQUIRED': 'ต้องกู้คืน',

  'common.lang': 'ภาษา',
};

const en: Record<string, string> = {
  'nav.brand': 'Merchant',
  'nav.products': 'Products',
  'nav.inventory': 'Inventory',
  'nav.customers': 'Customers',
  'nav.applications': 'Applications',
  'nav.contracts': 'Contracts',
  'nav.enroll': 'Enroll device',
  'nav.logout': 'Log out',
  'nav.menu': 'Menu',
  'nav.langTh': 'ไทย',
  'nav.langEn': 'EN',

  'login.title': 'Merchant login',
  'login.email': 'Email',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.failed': 'Login failed',

  'products.title': 'Products',
  'products.name': 'Product name',
  'products.brand': 'Brand',
  'products.create': 'Create product',
  'products.loadFailed': 'Failed to load products',
  'products.colName': 'Name',
  'products.colBrand': 'Brand',
  'products.empty': 'No products yet.',
  'products.new': 'New product',

  'inventory.title': 'Inventory',
  'inventory.variantId': 'Variant ID',
  'inventory.imei': 'IMEI',
  'inventory.receive': 'Receive IMEI',
  'inventory.colImei': 'IMEI',
  'inventory.colStatus': 'Status',
  'inventory.loadFailed': 'Failed to load inventory',
  'inventory.receiveReason': 'Merchant web receive',
  'inventory.empty': 'No IMEI units yet.',
  'inventory.new': 'Receive IMEI',

  'customers.title': 'Customers',
  'customers.fullName': 'Full name',
  'customers.phone': 'Phone',
  'customers.nationalId': 'National ID',
  'customers.create': 'Create customer',
  'customers.colName': 'Name',
  'customers.colPhone': 'Phone',
  'customers.colNationalId': 'National ID',
  'customers.loadFailed': 'Failed to load customers',
  'customers.empty': 'No customers yet.',
  'customers.new': 'New customer',
  'customers.nationalIdHelper': '13-digit national ID. Stored masked in lists.',

  'applications.title': 'Applications',
  'applications.customerId': 'Customer ID',
  'applications.imeiUnitId': 'IMEI unit ID',
  'applications.principal': 'Principal',
  'applications.downPayment': 'Down payment',
  'applications.create': 'Create draft',
  'applications.colId': 'ID',
  'applications.colStatus': 'Status',
  'applications.submit': 'Submit',
  'applications.approve': 'Approve',
  'applications.approveReason': 'Approved from merchant web',
  'applications.loadFailed': 'Failed to load applications',
  'applications.empty': 'No applications yet.',
  'applications.new': 'New application',

  'contracts.title': 'Contracts',
  'contracts.applicationId': 'Approved application ID',
  'contracts.create': 'Create draft contract',
  'contracts.colId': 'ID',
  'contracts.colStatus': 'Status',
  'contracts.open': 'Open',
  'contracts.activate': 'Activate',
  'contracts.detailTitle': 'Contract {id}',
  'contracts.status': 'Status {status}',
  'contracts.colSeq': '#',
  'contracts.colDue': 'Due',
  'contracts.colPaid': 'Paid',
  'contracts.amount': 'Amount',
  'contracts.createIntent': 'Create PromptPay intent',
  'contracts.loadFailed': 'Failed to load contracts',
  'contracts.empty': 'No contracts yet.',
  'contracts.new': 'Create contract',
  'contracts.list': 'Contracts',

  'enroll.title': 'Device enrollment',
  'enroll.stubNote':
    'Stub QR from the API. This is not production Device Owner / AMAPI. Do not disable Play Protect. Do not put Wi-Fi passwords in the QR. Staff enter Wi-Fi on the phone.',
  'enroll.contractId': 'Active contract ID',
  'enroll.android': 'Android',
  'enroll.ios': 'iPhone',
  'enroll.createSession': 'Create session + show QR',
  'enroll.sessionId': 'Session {id}',
  'enroll.status': 'Status {status}',
  'enroll.expires': 'Expires {at}',
  'enroll.iosInstructions':
    'iOS uses Apple Configurator / Remote Management instructions, not an Android QR.',
  'enroll.fingerprint': 'Fingerprint {hash}',
  'enroll.wifiForbidden': 'QR payload contains a Wi-Fi secret and must not be used.',
  'enroll.reason': 'Reason (required to bind)',
  'enroll.activateBind': 'Activate + bind contract',
  'enroll.bound': 'Device {id} bound locally (no AMAPI).',
  'enroll.defaultReason': 'staff confirmed desk activation',
  'enroll.failed': 'Enrollment failed',
  'enroll.bindFailed': 'Activate/bind failed',
  'enroll.consent':
    'Customer agreed to device management (draft wording — not final legal copy).',
  'enroll.androidHow': 'Android steps',
  'enroll.androidStep1': 'Phone must be new or factory reset with GMS.',
  'enroll.androidStep2': 'Enter shop Wi-Fi on the phone. Do not scan a password from this app.',
  'enroll.androidStep3': 'On Welcome, tap 6 times and scan this QR.',
  'enroll.androidStep4': 'Accept that this device belongs to the shop organization.',
  'enroll.playProtect': 'Do not turn off Play Protect.',
  'enroll.iosHow': 'iPhone steps',
  'enroll.iosPrereqTitle': 'All must be true before start (staff attestation — no live MDM yet).',
  'enroll.iosPrereqAbm': 'Merchant Apple Business Manager is active.',
  'enroll.iosPrereqMdm': 'MDM vendor is assigned in ABM.',
  'enroll.iosPrereqConfigurator': 'Shop iPhone has Apple Configurator (iOS 16+).',
  'enroll.iosPrereqErased': 'Customer iPhone is new or erased, stopped at Wi-Fi.',
  'enroll.iosStep1': 'Open Configurator on the shop iPhone and add this device to Apple Business.',
  'enroll.iosStep2': 'Customer iPhone restarts into Setup Assistant.',
  'enroll.iosStep3': 'Join Wi-Fi on the device. Remote Management must show this shop legal name.',
  'enroll.iosStep4': 'Tap Register. Passcode / Apple ID are the customer’s choice.',
  'enroll.iosStep5': 'Wait until enrolling, then verify and bind.',
  'enroll.iosNoSkip': 'Do not skip passcode, Apple ID, or Location Services. Do not use Lost Mode for collections.',
  'enroll.iosThirtyDays':
    'Configurator-added devices may leave Remote Management for 30 days — disclose in the contract.',
  'enroll.refresh': 'Refresh status',
  'enroll.issueQr': 'Issue QR',
  'enroll.cancel': 'Cancel session',
  'enroll.newSession': 'Start a new session',
  'enroll.handoverBlocked': 'Handover is blocked until enrollment is completed.',
  'enroll.handoverReady': 'Bound in our system (not production Device Owner). Handover only after lab proof.',
  'enroll.needConsent': 'Consent is required before creating a session.',
  'enroll.needIosPrereq': 'Confirm every iPhone prerequisite first.',
  'enroll.state.NOT_STARTED': 'Not started',
  'enroll.state.WAITING_FOR_DEVICE': 'Waiting for device',
  'enroll.state.QR_GENERATED': 'QR generated',
  'enroll.state.PROVISIONING': 'Provisioning',
  'enroll.state.ENROLLING': 'Enrolling',
  'enroll.state.VERIFYING': 'Verifying',
  'enroll.state.ACTIVATING': 'Activating',
  'enroll.state.COMPLETED': 'Completed',
  'enroll.state.FAILED': 'Failed',
  'enroll.state.EXPIRED': 'Expired',
  'enroll.state.CANCELLED': 'Cancelled',
  'enroll.state.RECOVERY_REQUIRED': 'Recovery required',

  'common.lang': 'Language',
};

const catalogs: Record<Locale, Record<string, string>> = { th, en };

const apiErrorTh: Record<string, string> = {
  'Contract not found.': 'ไม่พบสัญญา',
  'Enrollment session not found.': 'ไม่พบเซสชันลงทะเบียน',
  'Device not found.': 'ไม่พบเครื่อง',
  'Device activation not found.': 'ไม่พบการเปิดใช้งานเครื่อง',
  Unauthorized: 'ไม่มีสิทธิ์เข้าสู่ระบบ',
  'Request failed': 'คำขอไม่สำเร็จ',
  CONTRACT_NOT_ACTIVE: 'สัญญายังไม่เปิดใช้',
  IMEI_DOES_NOT_MATCH_CONTRACT: 'IMEI ไม่ตรงกับสัญญา',
  IMEI_BOUND: 'IMEI ถูกผูกอยู่แล้ว',
  ALREADY_ACTIVATED: 'เปิดใช้งานเครื่องนี้แล้ว',
  ENROLLMENT_EXPIRED: 'เซสชันหมดอายุ',
  ENROLLMENT_CANCELLED: 'เซสชันถูกยกเลิก',
  SESSION_OPEN: 'ยังมีเซสชันเปิดอยู่',
  QR_NOT_APPLICABLE: 'แพลตฟอร์มนี้ไม่มีคิวอาร์',
  DPC_QR_NOT_CONFIGURED: 'ยังไม่ได้ตั้งค่า DPC สำหรับออก QR',
  SESSION_NOT_QR_READY: 'สถานะนี้ยังออก QR ไม่ได้',
  'Idempotency-Key header is required.': 'ต้องส่ง Idempotency-Key',
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'th' || value === 'en';
}

export function readStoredLocale(): Locale {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_LOCALE;
  }
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

export function writeStoredLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function t(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
  vars?: Record<string, string>,
): string {
  const raw = catalogs[locale]?.[key] ?? catalogs.th[key] ?? key;
  if (!vars) {
    return raw;
  }
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    raw,
  );
}

export function translateApiError(message: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === 'en') {
    return message;
  }
  return apiErrorTh[message] ?? message;
}

export function applyDocumentLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.title = t('nav.brand', locale);
}
