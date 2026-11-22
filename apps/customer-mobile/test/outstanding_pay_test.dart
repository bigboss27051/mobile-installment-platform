import 'package:customer_mobile/outstanding_pay.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('uses outstandingBalance when positive', () {
    expect(
      payAmountFromContract({'outstandingBalance': '10600.00'}),
      '10600.00',
    );
  });

  test('returns null for zero outstanding', () {
    expect(payAmountFromContract({'outstandingBalance': '0.00'}), isNull);
  });

  test('returns null when outstanding missing', () {
    expect(payAmountFromContract({'id': 'c1'}), isNull);
  });

  test('does not fall back to hardcoded 100', () {
    expect(payAmountFromContract({'financedAmount': '10000.00'}), isNull);
  });
}
