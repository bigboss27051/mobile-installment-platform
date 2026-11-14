import 'package:customer_mobile/lock/lock_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('deep link maps screen without secrets', () {
    expect(
      screenFromLockDeepLink(Uri.parse('mipcustomer://lock?screen=locked')),
      'locked',
    );
    expect(screenFromLockDeepLink(Uri.parse('https://example.com/lock')), isNull);
  });

  test('lock headline does not claim OS lock when MDM is none', () {
    final status = LockStatus.fromJson({
      'desiredPresentation': 'LOCK',
      'osEnforcement': 'NONE',
      'phoneLockedByMdm': false,
      'enrollmentStatus': 'COMPLETED',
      'outstandingBalance': '10.00',
      'currency': 'THB',
      'merchantName': 'Shop',
      'disclaimer': defaultDisclaimer,
    });
    expect(status.phoneLockedByMdm, isFalse);
    expect(lockHeadline(status), isNot(contains('Single App Mode')));
    expect(lockHeadline(status), contains('lock app'));
  });
}
