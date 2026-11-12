import 'package:customer_mobile/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows customer login fields', (tester) async {
    await tester.pumpWidget(const CustomerApp());
    expect(find.text('Customer login'), findsOneWidget);
    expect(find.text('Request OTP'), findsOneWidget);
  });
}
