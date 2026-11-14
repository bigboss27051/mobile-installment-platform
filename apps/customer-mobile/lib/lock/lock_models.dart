enum DesiredPresentation { none, reminder, restrict, lock }

enum OsEnforcement { none, pending, singleAppMode, deviceLock }

class LockStatus {
  const LockStatus({
    required this.contractId,
    required this.deviceId,
    required this.platform,
    required this.enrollmentStatus,
    required this.desiredPresentation,
    required this.osEnforcement,
    required this.phoneLockedByMdm,
    required this.outstandingBalance,
    required this.currency,
    required this.merchantName,
    required this.latestIntent,
    required this.disclaimer,
  });

  final String? contractId;
  final String? deviceId;
  final String? platform;
  final String enrollmentStatus;
  final DesiredPresentation desiredPresentation;
  final OsEnforcement osEnforcement;
  final bool phoneLockedByMdm;
  final String outstandingBalance;
  final String currency;
  final String merchantName;
  final LockIntent? latestIntent;
  final String disclaimer;

  factory LockStatus.fromJson(Map<String, dynamic> json) {
    return LockStatus(
      contractId: json['contractId'] as String?,
      deviceId: json['deviceId'] as String?,
      platform: json['platform'] as String?,
      enrollmentStatus: json['enrollmentStatus'] as String? ?? 'NOT_ENROLLED',
      desiredPresentation: parseDesired(json['desiredPresentation'] as String?),
      osEnforcement: parseOsEnforcement(json['osEnforcement'] as String?),
      phoneLockedByMdm: json['phoneLockedByMdm'] == true,
      outstandingBalance: json['outstandingBalance'] as String? ?? '0.00',
      currency: json['currency'] as String? ?? 'THB',
      merchantName: json['merchantName'] as String? ?? 'Shop',
      latestIntent: json['latestIntent'] is Map<String, dynamic>
          ? LockIntent.fromJson(json['latestIntent'] as Map<String, dynamic>)
          : null,
      disclaimer: json['disclaimer'] as String? ?? defaultDisclaimer,
    );
  }

  LockStatus copyWith({LockIntent? latestIntent, DesiredPresentation? desiredPresentation}) {
    return LockStatus(
      contractId: contractId,
      deviceId: deviceId,
      platform: platform,
      enrollmentStatus: enrollmentStatus,
      desiredPresentation: desiredPresentation ?? this.desiredPresentation,
      osEnforcement: osEnforcement,
      phoneLockedByMdm: phoneLockedByMdm,
      outstandingBalance: outstandingBalance,
      currency: currency,
      merchantName: merchantName,
      latestIntent: latestIntent ?? this.latestIntent,
      disclaimer: disclaimer,
    );
  }
}

class LockIntent {
  const LockIntent({
    required this.id,
    required this.status,
    this.qrPayload,
  });

  final String id;
  final String status;
  final Object? qrPayload;

  factory LockIntent.fromJson(Map<String, dynamic> json) {
    return LockIntent(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'CREATED',
      qrPayload: json['qrPayload'],
    );
  }
}

const defaultDisclaimer =
    'This is the installment lock app. The iPhone is not OS-locked unless MDM Single App Mode is confirmed.';

DesiredPresentation parseDesired(String? value) {
  switch (value) {
    case 'REMINDER':
      return DesiredPresentation.reminder;
    case 'RESTRICT':
      return DesiredPresentation.restrict;
    case 'LOCK':
      return DesiredPresentation.lock;
    default:
      return DesiredPresentation.none;
  }
}

OsEnforcement parseOsEnforcement(String? value) {
  switch (value) {
    case 'PENDING':
      return OsEnforcement.pending;
    case 'SINGLE_APP_MODE':
      return OsEnforcement.singleAppMode;
    case 'DEVICE_LOCK':
      return OsEnforcement.deviceLock;
    default:
      return OsEnforcement.none;
  }
}

String lockHeadline(LockStatus status) {
  if (status.osEnforcement == OsEnforcement.singleAppMode) {
    return 'This iPhone is in Single App Mode';
  }
  switch (status.desiredPresentation) {
    case DesiredPresentation.reminder:
      return 'Payment reminder';
    case DesiredPresentation.restrict:
      return 'Restricted (app policy only)';
    case DesiredPresentation.lock:
      return 'Payment overdue — lock app';
    case DesiredPresentation.none:
      return 'Device in good standing';
  }
}

/// Deep links must not carry secrets. Example: mipcustomer://lock?screen=locked
String? screenFromLockDeepLink(Uri uri) {
  if (uri.scheme != 'mipcustomer') {
    return null;
  }
  final isLock = uri.host == 'lock' || uri.pathSegments.contains('lock');
  if (!isLock) {
    return null;
  }
  return uri.queryParameters['screen'] ?? 'status';
}
