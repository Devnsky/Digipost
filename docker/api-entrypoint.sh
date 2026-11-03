#!/bin/sh
set -e

echo "======================================================"
echo "          DigiPost API Container Initialization       "
echo "======================================================"

# Pastikan folder penyimpanan berkas tersedia
UPLOAD_DIRECTORY="${UPLOAD_DIR:-/app/uploads/documents}"
mkdir -p "$UPLOAD_DIRECTORY"

# Verifikasi variabel lingkungan kritis
if [ -z "$DATABASE_URL" ]; then
  echo "❌ FATAL CONFIG ERROR: Variabel lingkungan DATABASE_URL wajib disetel pada kontainer!"
  exit 1
fi

echo "Memeriksa kesiapan basis data PostgreSQL (eksternal/internal)..."
MAX_RETRIES=45
COUNT=0

until node -e "
  const { Pool } = require('pg');
  const url = process.env.DATABASE_URL;
  const isSsl = process.env.DATABASE_SSL === 'true' ||
    url.includes('sslmode=require') ||
    url.includes('supabase.co') ||
    url.includes('neon.tech') ||
    url.includes('rds.amazonaws.com') ||
    url.includes('aivencloud.com');
  let ssl = undefined;
  if (isSsl) {
    if (process.env.DATABASE_SSL_ALLOW_SELF_SIGNED === 'true') {
      ssl = { rejectUnauthorized: false };
    } else if (process.env.DATABASE_CA_CERT) {
      ssl = { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT };
    } else {
      ssl = { rejectUnauthorized: true };
    }
  }
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 4000,
    ssl
  });
  pool.query('SELECT 1')
    .then(() => { pool.end(); process.exit(0); })
    .catch((err) => {
      console.error('Info koneksi:', err.message);
      pool.end();
      process.exit(1);
    });
" 2>/dev/null || [ $COUNT -ge $MAX_RETRIES ]; do
  COUNT=$((COUNT + 1))
  echo "Menunggu basis data PostgreSQL siap... ($COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $COUNT -ge $MAX_RETRIES ]; then
  echo "FATAL: Tidak dapat terhubung ke PostgreSQL setelah $MAX_RETRIES percobaan."
  echo "Pastikan kredensial, host, port, izin firewall, dan SSL database eksternal sudah sesuai."
  echo "Menghentikan startup container..."
  exit 1
else
  echo "PostgreSQL terhubung dengan sukses!"
  
  # 1. Jalankan migrasi skema basis data
  echo "[1/2] Menjalankan migrasi skema basis data (npm run migrate)..."
  npm run migrate || {
    echo "Gagal menjalankan migrasi basis data!";
    exit 1;
  }
  
  # 2. Jalankan seed awal jika SEED_ON_START diaktifkan
  if [ "$SEED_ON_START" = "true" ] || [ "$SEED_ON_START" = "1" ]; then
    echo "[2/2] Menjalankan seeding akun pengguna dan master departemen..."
    npm run seed || {
      echo "Peringatan: Seeding gagal atau data sudah ada.";
    }
  else
    echo "[2/2] SEED_ON_START tidak diaktifkan, melewati proses seeding data."
  fi
fi

echo "======================================================"
echo "Menjalankan aplikasi: $@"
echo "======================================================"
exec "$@"

