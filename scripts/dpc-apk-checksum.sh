#!/usr/bin/env bash
# Print SHA-256 of a DPC APK for DPC_PACKAGE_CHECKSUM (no secrets).
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
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$apk" | awk '{print $1}'
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$apk" | awk '{print $1}'
else
  echo "Need shasum or sha256sum" >&2
  exit 1
fi
