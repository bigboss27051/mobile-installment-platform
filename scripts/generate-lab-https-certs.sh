#!/usr/bin/env bash
# Lab-only TLS material for HTTPS agent host. Do not use in production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${LAB_CERT_DIR:-$ROOT/lab-certs}"
HOST_IP="${LAB_HTTPS_HOST:-$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1)}"
DAYS="${LAB_CERT_DAYS:-825}"

mkdir -p "$OUT"
cd "$OUT"

if [[ ! -f ca.key || ! -f ca.crt ]]; then
  openssl genrsa -out ca.key 2048
  openssl req -x509 -new -nodes -key ca.key -sha256 -days "$DAYS" \
    -subj "/CN=MIP Lab CA/O=MIP Lab/C=TH" -out ca.crt
fi

openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/CN=${HOST_IP}/O=MIP Lab/C=TH" -out server.csr

cat > server.ext <<EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=IP:${HOST_IP},IP:127.0.0.1,DNS:localhost,DNS:mip-lab.local
EOF

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days "$DAYS" -sha256 -extfile server.ext

rm -f server.csr server.ext
chmod 600 ca.key server.key

# DPC pins this CA for lab HTTPS (safe to copy public cert only).
DPC_RAW="$ROOT/apps/android-dpc/app/src/main/res/raw"
mkdir -p "$DPC_RAW"
cp ca.crt "$DPC_RAW/mip_lab_ca.crt"

echo "Wrote $OUT/{ca.crt,ca.key,server.crt,server.key}"
echo "Host IP: $HOST_IP"
echo "Copied CA → apps/android-dpc/app/src/main/res/raw/mip_lab_ca.crt"
echo "Start backend with TLS_CERT_PATH=$OUT/server.crt TLS_KEY_PATH=$OUT/server.key HTTPS_PORT=3443"
