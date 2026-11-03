# DigiPost 📄

**DigiPost** adalah sistem manajemen alur persetujuan dokumen internal perusahaan berbasis web yang dirancang untuk memfasilitasi proses verifikasi bertingkat secara transparan, aman, dan akuntabel.

Sistem ini menerapkan mekanisme **Maker-Checker** (verifikasi berjenjang oleh atasan langsung) yang dilanjutkan dengan **Multi-Department Approval** (persetujuan paralel lintas divisi) sebelum dokumen mencapai status final.

---

## ✨ Fitur Utama

- **Maker-Checker Workflow:**
  - Pemohon (*Applicant*) membuat draf dokumen dan menentukan departemen tujuan.
  - Atasan langsung (*Checker*) memverifikasi draf sebelum diteruskan (dapat menyetujui & meneruskan, meminta revisi, atau menolak).
- **Multi-Department Approval:**
  - Dokumen dievaluasi secara paralel oleh para manajer dari departemen tujuan terkait.
  - Evaluasi status akhir bersifat atomik berdasarkan konsensus seluruh departemen.
- **Pengelolaan Berkas & Pratinjau:**
  - Pengelolaan multi-versi berkas lampiran dengan pencatatan checksum SHA-256.
  - Pratinjau langsung di dalam aplikasi untuk format PDF dan dokumen Microsoft Word (.docx).
  - Ekspor/unduh berkas dengan stempel cap status resmi (*watermark stamp*: Approved, Rejected, Canceled).
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
- **Backend API:** `http://localhost:4000/api/health`
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

Buka antarmuka web di: **`http://localhost:5173`** (API berjalan di port `4000`).

---

## 🧪 Pengujian & Kualitas Kode

```bash
npm test          # Menjalankan 44 pengujian integrasi otomatis
npm run typecheck  # Validasi tipe statis TypeScript (API & Web)
npm run lint       # Audit standar kepatuhan kode (ESLint)
```

---

## 📖 Dokumentasi Lengkap

Spesifikasi teknis dan catatan keputusan arsitektur dapat diakses pada folder `docs/`:
- [Requirements Traceability Matrix (RTM)](docs/requirements-traceability.md): Pemetaan kebutuhan fungsional dan kasus uji SRS.
- [Catatan Keputusan Arsitektur](docs/decisions.md): Dokumentasi keputusan teknis dan penyelesaian ambiguitas bisnis.
- [Catatan Riwayat Progres](docs/progress.md): Log pengerjaan dan pencapaian implementasi.
