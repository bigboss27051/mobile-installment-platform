import { buildAndroidEnrollmentQrPayload } from './enrollment-qr';

describe('buildAndroidEnrollmentQrPayload', () => {
  it('includes opaque enrollment token and never Wi-Fi secrets', () => {
    const payload = buildAndroidEnrollmentQrPayload({
      enrollmentToken: 'enc_test_token_value',
      sessionId: '11111111-1111-4111-8111-111111111111',
    });

    expect(payload['android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE']).toEqual(
      expect.objectContaining({
        'com.google.android.apps.work.clouddpc.EXTRA_ENROLLMENT_TOKEN':
          'enc_test_token_value',
      }),
    );
    expect(JSON.stringify(payload)).not.toMatch(/WIFI_PASSWORD/i);
    expect(JSON.stringify(payload)).not.toMatch(/wifiPassword/i);
    expect(payload).not.toHaveProperty('android.app.extra.PROVISIONING_WIFI_SSID');
    expect(payload).not.toHaveProperty(
      'android.app.extra.PROVISIONING_WIFI_PASSWORD',
    );
  });
});
