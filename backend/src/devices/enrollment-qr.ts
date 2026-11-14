export const ANDROID_CLOUD_DPC_COMPONENT =
  'com.google.android.apps.work.clouddpc/.receivers.CloudDeviceAdminReceiver';

export const ANDROID_CLOUD_DPC_CHECKSUM =
  'I5YvS0O5hXY46mb01BlRjq4oJJGs2kuUcHvVkAPEXlg';

export const ANDROID_CLOUD_DPC_DOWNLOAD =
  'https://play.google.com/managed/downloadManagingApp?identifier=setup';

export function buildAndroidEnrollmentQrPayload(input: {
  enrollmentToken: string;
  sessionId: string;
}): Record<string, unknown> {
  return {
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME':
      ANDROID_CLOUD_DPC_COMPONENT,
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM':
      ANDROID_CLOUD_DPC_CHECKSUM,
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION':
      ANDROID_CLOUD_DPC_DOWNLOAD,
    'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
      'com.google.android.apps.work.clouddpc.EXTRA_ENROLLMENT_TOKEN':
        input.enrollmentToken,
      mipEnrollmentSessionId: input.sessionId,
    },
  };
}
