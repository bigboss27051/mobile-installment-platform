#!/usr/bin/env bash
# Print SHA-256 of a DPC APK as Android base64url (no padding) for DPC_PACKAGE_CHECKSUM.
set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo "Usage: $0 path/to/app.apk" >&2
  exit 1
fi
apk="$1"
if [[ ! -f "$apk" ]]; then
  echo "File not found: $apk" >&2
  exit 1
fi

# openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=\n'
if command -v openssl >/dev/null 2>&1; then
  openssl dgst -sha256 -binary "$apk" | openssl base64 -A | tr '+/' '-_' | tr -d '='
  echo
  exit 0
fi

echo "Need openssl to produce base64url checksum" >&2
exit 1
