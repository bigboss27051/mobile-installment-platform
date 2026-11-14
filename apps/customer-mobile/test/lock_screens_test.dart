import 'package:customer_mobile/lock/lock_models.dart';
import 'package:customer_mobile/lock/lock_repository.dart';
import 'package:customer_mobile/lock/lock_screens.dart';
import 'package:customer_mobile/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('login offers lock preview without MDM', (tester) async {
    await tester.pumpWidget(const CustomerApp());
    expect(find.text('Lock screens (preview)'), findsOneWidget);
  });

  testWidgets('locked preview states it is app UI not MDM', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: LockShell(
          repository: PreviewLockRepository(previewFixture(DesiredPresentation.lock)),
          forcedScreen: 'locked',
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('not locked by MDM'), findsOneWidget);
    expect(find.textContaining('Single App Mode is confirmed'), findsOneWidget);
  });
}
