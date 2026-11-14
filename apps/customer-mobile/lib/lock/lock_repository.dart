import '../api.dart';
import 'lock_models.dart';

abstract class LockRepository {
  Future<LockStatus> fetchStatus();
  Future<LockIntent> createPromptPay({
    required String contractId,
    required String amount,
    required String idempotencyKey,
  });
  Future<LockIntent> refreshIntent(String intentId);
}

class ApiLockRepository implements LockRepository {
  ApiLockRepository(this.api);

  final CustomerApi api;

  @override
  Future<LockStatus> fetchStatus() async {
    return LockStatus.fromJson(await api.getLockStatus());
  }

  @override
  Future<LockIntent> createPromptPay({
    required String contractId,
    required String amount,
    required String idempotencyKey,
  }) async {
    final data = await api.createIntent(
      contractId: contractId,
      amount: amount,
      idempotencyKey: idempotencyKey,
    );
    return LockIntent.fromJson(data);
  }

  @override
  Future<LockIntent> refreshIntent(String intentId) async {
    final data = await api.getPaymentIntent(intentId);
    return LockIntent.fromJson(data);
  }
}

class PreviewLockRepository implements LockRepository {
  PreviewLockRepository(this.fixture);

  final LockStatus fixture;
  LockIntent? _intent;

  @override
  Future<LockStatus> fetchStatus() async {
    return fixture.copyWith(latestIntent: _intent ?? fixture.latestIntent);
  }

  @override
  Future<LockIntent> createPromptPay({
    required String contractId,
    required String amount,
    required String idempotencyKey,
  }) async {
    _intent = const LockIntent(
      id: 'preview-intent',
      status: 'AWAITING_PROVIDER',
      qrPayload: 'PROMPTPAY-PREVIEW-NOT-A-SECRET',
    );
    return _intent!;
  }

  @override
  Future<LockIntent> refreshIntent(String intentId) async {
    return _intent ??
        LockIntent(id: intentId, status: 'AWAITING_PROVIDER', qrPayload: 'PROMPTPAY-PREVIEW-NOT-A-SECRET');
  }
}

LockStatus previewFixture(DesiredPresentation presentation) {
  return LockStatus(
    contractId: 'preview-contract',
    deviceId: 'preview-device',
    platform: 'IOS',
    enrollmentStatus: 'COMPLETED',
    desiredPresentation: presentation,
    osEnforcement: OsEnforcement.none,
    phoneLockedByMdm: false,
    outstandingBalance: presentation == DesiredPresentation.none ? '0.00' : '1500.00',
    currency: 'THB',
    merchantName: 'Demo Shop',
    latestIntent: presentation == DesiredPresentation.none
        ? null
        : const LockIntent(
            id: 'preview-intent',
            status: 'AWAITING_PROVIDER',
            qrPayload: 'PROMPTPAY-PREVIEW-NOT-A-SECRET',
          ),
    disclaimer: defaultDisclaimer,
  );
}
