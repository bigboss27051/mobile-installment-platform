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

  'inventory.title': 'สต็อก',
  'inventory.variantId': 'รหัสรุ่นสินค้า',
  'inventory.imei': 'IMEI',
  'inventory.receive': 'รับเข้า IMEI',
  'inventory.colImei': 'IMEI',
  'inventory.colStatus': 'สถานะ',
  'inventory.loadFailed': 'โหลดสต็อกไม่สำเร็จ',
  'inventory.receiveReason': 'รับเข้าจากเว็บร้าน',

  'customers.title': 'ลูกค้า',
  'customers.fullName': 'ชื่อ-นามสกุล',
  'customers.phone': 'เบอร์โทร',
  'customers.nationalId': 'เลขบัตรประชาชน',
  'customers.create': 'สร้างลูกค้า',
  'customers.colName': 'ชื่อ',
  'customers.colPhone': 'เบอร์โทร',
  'customers.colNationalId': 'บัตรประชาชน',
  'customers.loadFailed': 'โหลดลูกค้าไม่สำเร็จ',

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

  'inventory.title': 'Inventory',
  'inventory.variantId': 'Variant ID',
  'inventory.imei': 'IMEI',
  'inventory.receive': 'Receive IMEI',
  'inventory.colImei': 'IMEI',
  'inventory.colStatus': 'Status',
  'inventory.loadFailed': 'Failed to load inventory',
  'inventory.receiveReason': 'Merchant web receive',

  'customers.title': 'Customers',
  'customers.fullName': 'Full name',
  'customers.phone': 'Phone',
  'customers.nationalId': 'National ID',
  'customers.create': 'Create customer',
  'customers.colName': 'Name',
  'customers.colPhone': 'Phone',
  'customers.colNationalId': 'National ID',
  'customers.loadFailed': 'Failed to load customers',

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
