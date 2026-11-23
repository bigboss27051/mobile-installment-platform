import 'package:customer_mobile/promptpay_qr.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('maps imageUrlPng from Stripe-style payload', () {
    final vm = PromptPayQrViewModel.fromPayload({
      'imageUrlPng': 'https://example.com/qr.png',
      'hostedInstructionsUrl': 'https://example.com/pay',
    });
    expect(vm.imageUrlPng, 'https://example.com/qr.png');
    expect(vm.hostedInstructionsUrl, 'https://example.com/pay');
    expect(vm.fallbackText, isNull);
  });

  test('falls back to text for sandbox-style payload', () {
    final vm = PromptPayQrViewModel.fromPayload({
      'type': 'promptpay',
      'amount': '100.00',
    });
    expect(vm.imageUrlPng, isNull);
    expect(vm.fallbackText, isNotNull);
  });
}
