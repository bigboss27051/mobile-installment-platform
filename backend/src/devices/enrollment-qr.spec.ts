import { createHash } from 'crypto';
import {
  buildAndroidEnrollmentQrPayload,
  resolveDpcQrSettings,
} from './enrollment-qr';

const packageChecksum = createHash('sha256').update('phase2-dpc').digest('base64url');
const endpoint = 'https://api.example.test/api/v1/devices/enroll/check-in';

describe('buildAndroidEnrollmentQrPayload', () => {
  it('names the project DPC and puts only the enrollment bundle in extras', () => {
    const payload = buildAndroidEnrollmentQrPayload({
      enrollmentToken: 'enc_test_token_value',
      sessionId: '11111111-1111-4111-8111-111111111111',
      componentName: 'com.mip.dpc/com.mip.dpc.DeviceAdminReceiver',
      downloadUrl: 'https://downloads.example.test/dpc.apk',
      packageChecksum,
      enrollmentEndpoint: endpoint,
    });

    expect(payload).toEqual({
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME':
        'com.mip.dpc/com.mip.dpc.DeviceAdminReceiver',
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION':
        'https://downloads.example.test/dpc.apk',
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM': packageChecksum,
      'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
        enrollmentToken: 'enc_test_token_value',
        enrollmentEndpoint: endpoint,
        enrollmentSessionId: '11111111-1111-4111-8111-111111111111',
      },
    });
    expect(JSON.stringify(payload)).not.toContain(
      'com.google.android.apps.work.clouddpc',
    );
    expect(JSON.stringify(payload)).not.toMatch(/WIFI_PASSWORD/i);
    expect(payload).not.toHaveProperty(
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM',
    );
  });
});

describe('resolveDpcQrSettings', () => {
  const valid = {
    DPC_COMPONENT_NAME: 'com.mip.dpc/com.mip.dpc.DeviceAdminReceiver',
    DPC_DOWNLOAD_URL: 'https://downloads.example.test/dpc.apk',
    DPC_PACKAGE_CHECKSUM: packageChecksum,
    DPC_ENROLLMENT_ENDPOINT: endpoint,
  };

  it('accepts https download and an exact check-in pathname', () => {
    expect(resolveDpcQrSettings(valid)).toEqual({
      componentName: valid.DPC_COMPONENT_NAME,
      downloadUrl: valid.DPC_DOWNLOAD_URL,
      packageChecksum: valid.DPC_PACKAGE_CHECKSUM,
      enrollmentEndpoint: valid.DPC_ENROLLMENT_ENDPOINT,
    });
    const withPort = resolveDpcQrSettings({
      ...valid,
      DPC_ENROLLMENT_ENDPOINT:
        'https://api.example.test:8443/api/v1/devices/enroll/check-in',
    });
    expect(withPort?.enrollmentEndpoint).toBe(
      'https://api.example.test:8443/api/v1/devices/enroll/check-in',
    );
  });

  it.each([
    ['missing component', { DPC_COMPONENT_NAME: '  ' }],
    ['http download', { DPC_DOWNLOAD_URL: 'http://downloads.example.test/dpc.apk' }],
    ['short checksum', { DPC_PACKAGE_CHECKSUM: 'abcd' }],
    ['http endpoint', { DPC_ENROLLMENT_ENDPOINT: 'http://api.example.test/api/v1/devices/enroll/check-in' }],
    ['query on endpoint', { DPC_ENROLLMENT_ENDPOINT: `${endpoint}?x=1` }],
    ['userinfo on endpoint', { DPC_ENROLLMENT_ENDPOINT: 'https://user:pass@api.example.test/api/v1/devices/enroll/check-in' }],
    ['wrong path', { DPC_ENROLLMENT_ENDPOINT: 'https://api.example.test/api/v1/devices/enroll/check-in/extra' }],
  ])('rejects %s', (_label, override) => {
    expect(resolveDpcQrSettings({ ...valid, ...override })).toBeNull();
  });
});
