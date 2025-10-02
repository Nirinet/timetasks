#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$ROOT_DIR/nginx/ssl"
CA_KEY="$CERT_DIR/dev-ca.key.pem"
CA_CERT="$CERT_DIR/dev-ca.cert.pem"
CA_SERIAL="$CERT_DIR/dev-ca.srl"
SERVER_KEY="$CERT_DIR/privkey.pem"
SERVER_CSR="$CERT_DIR/server.csr"
SERVER_CERT="$CERT_DIR/server.cert.pem"
FULLCHAIN="$CERT_DIR/fullchain.pem"
CHAIN="$CERT_DIR/chain.pem"

umask 077

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required but not installed." >&2
  exit 1
fi

mkdir -p "$CERT_DIR"

if [[ -f "$FULLCHAIN" || -f "$SERVER_KEY" ]]; then
  echo "Existing certificates detected in $CERT_DIR." >&2
  read -r -p "Overwrite existing certificates? [y/N] " REPLY
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo "Aborting without changes." >&2
    exit 0
  fi
fi

rm -f "$CA_KEY" "$CA_CERT" "$CA_SERIAL" "$SERVER_KEY" "$SERVER_CSR" "$SERVER_CERT" "$FULLCHAIN" "$CHAIN"

SAN_CONFIG="$(mktemp)"
trap 'rm -f "$SAN_CONFIG"' EXIT

cat >"$SAN_CONFIG" <<'SANEOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
CN = localhost
O = TimeTask Dev

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
SANEOF

openssl req -x509 -nodes -newkey rsa:4096 -sha256 -days 825 \
  -keyout "$CA_KEY" -out "$CA_CERT" \
  -subj "/CN=TimeTask Dev CA/O=TimeTask"

openssl genrsa -out "$SERVER_KEY" 2048

openssl req -new -key "$SERVER_KEY" -out "$SERVER_CSR" -config "$SAN_CONFIG"

openssl x509 -req -in "$SERVER_CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" -CAcreateserial \
  -out "$SERVER_CERT" -days 825 -sha256 -extfile "$SAN_CONFIG" -extensions v3_req

cat "$SERVER_CERT" "$CA_CERT" > "$FULLCHAIN"
cp "$CA_CERT" "$CHAIN"

chmod 600 "$CA_KEY" "$SERVER_KEY"

rm -f "$SERVER_CSR"

echo "Generated development certificates in $CERT_DIR:" >&2
echo "  - fullchain.pem" >&2
echo "  - privkey.pem" >&2
echo "  - chain.pem" >&2
echo "Import $CA_CERT into your browser/OS trust store to avoid warnings." >&2
