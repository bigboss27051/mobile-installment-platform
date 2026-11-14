const CHECK_IN_PATH = '/api/v1/devices/enroll/check-in';

export type DpcQrSettings = {
  componentName: string;
  downloadUrl: string;
  packageChecksum: string;
  enrollmentEndpoint: string;
};

export function resolveDpcQrSettings(
  env: Record<string, string | undefined>,
): DpcQrSettings | null {
  const componentName = env.DPC_COMPONENT_NAME?.trim() ?? '';
  const downloadUrl = env.DPC_DOWNLOAD_URL?.trim() ?? '';
  const packageChecksum = env.DPC_PACKAGE_CHECKSUM?.trim() ?? '';
  const enrollmentEndpoint = env.DPC_ENROLLMENT_ENDPOINT?.trim() ?? '';
  if (
    !componentName ||
    !isHttpsResource(downloadUrl) ||
    !isSha256Base64Url(packageChecksum) ||
    !isCheckInEndpoint(enrollmentEndpoint)
  ) {
    return null;
  }
  return {
    componentName,
    downloadUrl,
    packageChecksum,
    enrollmentEndpoint,
  };
}

export function buildAndroidEnrollmentQrPayload(input: {
  enrollmentToken: string;
  sessionId: string;
  componentName: string;
  downloadUrl: string;
  packageChecksum: string;
  enrollmentEndpoint: string;
}): Record<string, unknown> {
  return {
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME':
      input.componentName,
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION':
      input.downloadUrl,
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM':
      input.packageChecksum,
    'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
      enrollmentToken: input.enrollmentToken,
      enrollmentEndpoint: input.enrollmentEndpoint,
      enrollmentSessionId: input.sessionId,
    },
  };
}

function isHttpsResource(value: string): boolean {
  const url = parseUrl(value);
  return url !== null && url.protocol === 'https:' && url.username === '' && url.password === '';
}

function isCheckInEndpoint(value: string): boolean {
  const url = parseUrl(value);
  return (
    url !== null &&
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    url.pathname === CHECK_IN_PATH &&
    url.search === '' &&
    url.hash === ''
  );
}

function isSha256Base64Url(value: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) {
    return false;
  }
  return Buffer.from(value, 'base64url').length === 32;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
