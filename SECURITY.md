# Kebijakan Keamanan (Security Policy) - DigiPost

Keamanan data organisasi dan integritas alur persetujuan dokumen adalah prioritas tertinggi dalam perancangan dan operasional **DigiPost**. Dokumen ini menguraikan kebijakan keamanan, versi yang didukung, serta tata cara pelaporan kerentanan (_vulnerability disclosure_).

---

## 1. Versi yang Didukung (Supported Versions)

Pembaruan keamanan dan perbaikan _patch_ secara aktif diberikan pada versi berikut:

| Versi            | Didukung Secara Aktif | Status                                               |
| :--------------- | :-------------------: | :--------------------------------------------------- |
| **1.0.x (Main)** |         ✅ Ya         | Versi Produksi Aktif (Node.js 24 LTS, PostgreSQL 16) |
| `< 1.0.0`        |       ❌ Tidak        | Versi Pengembangan Awal                              |

---

## 2. Tata Cara Melaporkan Kerentanan (Reporting a Vulnerability)

Kami sangat menghargai kontribusi para peneliti keamanan dan pengguna dalam menjaga keamanan DigiPost. Jika Anda menemukan potensi kerentanan keamanan:

1. **JANGAN** membuat _public issue_ atau mendiskusikan kerentanan secara terbuka di repositori publik.
2. Kirimkan laporan rinci melalui saluran komunikasi internal/keamanan:
   - **Email:** `security@digipost.internal` (atau kontak _Lead Code Auditor_)
3. Sertakan informasi berikut dalam laporan Anda:
   - Deskripsi kerentanan dan potensi dampaknya (_severity_).
   - Langkah-langkah reproduksi yang jelas (_Proof of Concept_ atau skrip pengujian).
   - Komponen atau endpoint yang terdampak (misalnya: `/api/workflow/:id/dept-decision`).
4. **Waktu Respons:** Tim keamanan akan mengonfirmasi penerimaan laporan dalam waktu **1x24 jam** dan memberikan pembaruan berkala mengenai proses investigasi serta mitigasi.

---

## 3. Pilar & Kontrol Keamanan Inti

Sistem DigiPost mengimplementasikan pertahanan berlapis (_Defense in Depth_) yang mencakup:

### A. Otentikasi & Manajemen Sesi

- **Hashing Kredensial:** Menggunakan algoritma **Argon2id** (rekomendasi OWASP) dengan proteksi serangan _timing attack_ via _dummy password hash_.
- **Perlindungan Sesi:** Token sesi diacak dengan entropi 256-bit dan hanya disimpan dalam bentuk **SHA-256 hash** pada basis data. Cookie sesi bertanda `HttpOnly`, `SameSite: "lax"`, dan `Secure`.
- **Proteksi Brute-Force:** Dilengkapi rate limiter per alamat IP (`15 percobaan / 15 menit`) dan penguncian akun otomatis (_account lockout_) setelah 5 kali kegagalan login berturut-turut.

### B. Otorisasi & Alur Maker-Checker

- **Four-Eyes Principle:** Pemohon (_Applicant_) tidak dapat menyetujui dokumennya sendiri; verifikasi tingkat pertama wajib dilakukan oleh atasan langsung (_Checker_).
- **Dynamic Consensus (Opsi A):** Evaluasi keputusan paralel seluruh departemen tujuan bersifat atomik dengan penguncian baris basis data (`SELECT ... FOR UPDATE`).
- **Database Trigger Guards:** Trigger `trg_dd_guard` dan `trg_doc_terminal` mencegah manipulasi data atau bypass status setelah dokumen final.

### C. Proteksi Injeksi & Integritas Berkas

- **100% Parameterized Queries:** Seluruh interaksi PostgreSQL menggunakan parameter binding `$1, $2, ...` tanpa konkatenasi string SQL mentah.
- **Validasi Berkas:** Pembatasan ukuran maksimum berkas 25MB, verifikasi _magic bytes_ secara hemat melalui file descriptor, dan pencatatan checksum SHA-256 pada setiap versi berkas.
- **Digital Stamping:** Berkas PDF resmi disematkan cap stempel validasi digital sistem via `pdf-lib`.

---