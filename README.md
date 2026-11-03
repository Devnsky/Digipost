# DigiPost 📄

**DigiPost** adalah sistem manajemen alur persetujuan dokumen internal perusahaan berbasis web yang dirancang untuk memfasilitasi proses verifikasi bertingkat secara transparan, aman, dan akuntabel.

Sistem ini menerapkan mekanisme **Maker-Checker** (verifikasi berjenjang oleh atasan langsung) yang dilanjutkan dengan **Multi-Department Approval** (persetujuan paralel lintas divisi) sebelum dokumen mencapai status final.

---

## ✨ Fitur Utama

- **Maker-Checker Workflow:**
  - Pemohon (_Applicant_) membuat draf dokumen dan menentukan departemen tujuan.
  - Atasan langsung (_Checker_) memverifikasi draf sebelum diteruskan (dapat menyetujui & meneruskan, meminta revisi, atau menolak).
- **Multi-Department Approval:**
  - Dokumen dievaluasi secara paralel oleh para manajer dari departemen tujuan terkait.
  - Evaluasi status akhir bersifat atomik berdasarkan konsensus seluruh departemen.
- **Pengelolaan Berkas & Pratinjau:**
  - Pengelolaan multi-versi berkas lampiran dengan pencatatan checksum SHA-256.
  - Pratinjau langsung di dalam aplikasi untuk format PDF dan dokumen Microsoft Word (.docx).
  - Ekspor/unduh berkas dengan stempel cap status resmi (_watermark stamp_: Approved, Rejected, Canceled).
- **Keamanan & Jejak Audit (Audit Trail):**
  - Pencatatan seluruh mutasi status, tanggapan, dan riwayat keputusan secara kronologis.
  - Autentikasi berbasis cookie `HttpOnly` dengan enkripsi password Argon2id dan proteksi brute-force.
  - Notifikasi terintegrasi untuk setiap perubahan tahapan dokumen.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend API:** Node.js 24 LTS, Express, TypeScript, Driver `pg` (parameterized queries & stored procedures)
- **Basis Data:** PostgreSQL 16
- **Kontainerisasi & CI/CD:** Docker, Docker Compose, GitHub Actions

---

## 🚀 Memulai Cepat (Quick Start)

### Menggunakan Docker Compose (Direkomendasikan)

Pastikan Docker Engine dan Docker Compose telah terpasang di sistem Anda:

```bash
# 1. Salin berkas konfigurasi lingkungan
cp .env.docker.example .env

# 2. Bangun image dan jalankan seluruh container
docker compose up --build -d
```

Akses layanan di peramban:

- **Frontend Web:** `http://localhost:3000`
- **Backend API Health:** `http://localhost:4000/api/health`
- **Dokumentasi API (Swagger UI):** `http://localhost:4000/api/docs` (Spesifikasi JSON: `/api/docs.json`)
- **Mailpit (Webmail Pengujian):** `http://localhost:8025`

---

### Menjalankan Secara Lokal

Prasyarat: **Node.js 24 LTS** dan **PostgreSQL 16** (berjalan lokal).

```bash
# 1. Salin konfigurasi environment
cp .env.example .env

# 2. Pasang dependensi monorepo
npm install

# 3. Jalankan migrasi basis data dan data seed awal
npm run migrate
npm run seed

# 4. Jalankan aplikasi dalam mode pengembangan
npm run dev
```

Buka antarmuka web di: **`http://localhost:5173`** (API berjalan di port `4000`, Swagger UI interaktif di **`http://localhost:4000/api/docs`**).

---

## 🧪 Pengujian & Kualitas Kode

Sistem pengujian dipisahkan menjadi unit testing mandiri dan integration testing relasional:

```bash
# Menjalankan unit test suite mandiri (in-memory, 85 unit tests, <3.5 detik, tanpa DB fisik)
npm test
npm run test:unit

# Menjalankan pengujian integrasi database dengan PostgreSQL (TC-01 s.d. TC-26)
npm run test:integration

# Menjalankan seluruh pengujian (unit + integrasi)
npm run test:all

# Pengujian konkurensi mutasi bersamaan
npm run test:concurrency

# Benchmark performa 100.000 dokumen terindeks
npm run test:benchmark

# Validasi tipe statis TypeScript (API & Web)
npm run typecheck

# Audit kepatuhan standar linter (ESLint + React Hooks)
npm run lint

# Format otomatis seluruh codebase (Prettier)
npm run format
```

---

## 🏗️ Struktur Monorepo & Arsitektur

```text
Digipost/
├── apps/
│   ├── api/                     # Backend Express + TypeScript
│   │   ├── src/
│   │   │   ├── config/          # Validasi environment fail-fast & konfigurasi
│   │   │   ├── db/              # Koneksi node-pg & manajemen transaksi
│   │   │   ├── middleware/      # Keamanan (Rate Limiter, CORS, Session Cookie Auth)
│   │   │   └── modules/         # Domain modules (auth, departments, documents, files, notifications, workflow)
│   │   └── package.json
│   └── web/                     # Frontend React 18 + Vite + Tailwind CSS
│       ├── src/
│       │   ├── app/             # Routing & Root App Component
│       │   ├── components/      # Reusable UI components (AppShell, Modal, StatusBadge)
│       │   ├── features/        # Feature screens (auth, dashboard, documents, notifications, account)
│       │   └── lib/             # API client, context providers, formatters, types
│       └── package.json
├── database/                    # Skema PostgreSQL & Runner
│   ├── migrations/              # SQL migrations (001 s.d. 004)
│   └── runner.ts                # TypeScript migration & seed runner
├── tests/                       # Test suites
│   ├── unit/                    # Pure in-memory unit tests (Fast, no DB)
│   └── integration/             # Relational PostgreSQL integration tests
├── .github/workflows/ci.yml     # Automated CI pipeline (Lint, Typecheck, Unit, Integration, Build)
├── Dockerfile                   # Multi-stage production container build
└── docker-compose.yml           # Local production stack (Postgres, Mailpit, API, Web)
```

---
