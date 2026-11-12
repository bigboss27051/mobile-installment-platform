import 'package:customer_mobile/payment_status.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('does not treat local QR display as paid', () {
    expect(isServerConfirmedPaid(null), isFalse);
    expect(isServerConfirmedPaid('AWAITING_PROVIDER'), isFalse);
    expect(isServerConfirmedPaid('CREATED'), isFalse);
  });

  test('treats only SUCCEEDED as paid', () {
    expect(isServerConfirmedPaid('SUCCEEDED'), isTrue);
  });
}
