export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "DigiPost API",
    version: "1.0.0",
    description:
      "Dokumentasi resmi API DigiPost — Multi-Department Document Workflow Approval System dengan arsitektur Maker-Checker, Dynamic Consensus (Opsi A), dan Digital Stamping Audit Trail.",
    contact: {
      name: "DigiPost Engineering Team",
    },
    license: {
      name: "UNLICENSED",
    },
  },
  servers: [
    {
      url: "/api",
      description: "Default API Gateway Base URL",
    },
  ],
  tags: [
    {
      name: "Auth",
      description:
        "Otentikasi, manajemen sesi cookie HTTP-only, dan reset password",
    },
    {
      name: "Documents",
      description:
        "Pembuatan, pelacakan dokumen, listing antrean, dan pembatalan",
    },
    {
      name: "Workflow",
      description:
        "Alur persetujuan Checker, konsensus departemen, dan thread diskusi",
    },
    {
      name: "Files",
      description:
        "Unduhan lampiran asli dan pratinjau berkas PDF berstempel resmi",
    },
    {
      name: "Departments",
      description: "Master data departemen aktif dalam organisasi",
    },
    {
      name: "Notifications",
      description: "Notifikasi alur persetujuan dan pelacakan status dibaca",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "digipost_session",
        description: "Cookie sesi HTTP-only aman (SHA-256 session hash)",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Opsi token otorisasi Bearer header (alternatif cookie)",
      },
    },
    schemas: {
      AppError: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Dokumen tidak ditemukan.",
          },
          code: {
            type: "string",
            example: "NOT_FOUND",
          },
          statusCode: {
            type: "integer",
            example: 404,
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          username: { type: "string", example: "ahmad.assistant" },
          full_name: { type: "string", example: "Ahmad Dahlan" },
          email: { type: "string", example: "ahmad@digipost.local" },
          employee_no: { type: "string", example: "EMP-001" },
          role: {
            type: "string",
            enum: ["assistant", "checker", "dept_manager", "admin"],
            example: "assistant",
          },
          department_id: { type: "integer", example: 1 },
          department_name: {
            type: "string",
            example: "Information Technology",
          },
          department_code: { type: "string", example: "IT" },
          manager_id: { type: "integer", nullable: true, example: 2 },
          manager_name: {
            type: "string",
            nullable: true,
            example: "Budi Checker",
          },
          must_change_password: { type: "boolean", example: false },
          is_active: { type: "boolean", example: true },
        },
      },
      Department: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          code: { type: "string", example: "IT" },
          name: { type: "string", example: "Information Technology" },
          manager_id: { type: "integer", example: 2 },
          manager_name: { type: "string", example: "Budi Pratama" },
        },
      },
      DocumentListItem: {
        type: "object",
        properties: {
          id: { type: "integer", example: 101 },
          document_number: { type: "string", example: "DOC-2026-001" },
          title: { type: "string", example: "Pengadaan Perangkat Server" },
          description: {
            type: "string",
            example: "Pengadaan server produksi data center",
          },
          status: {
            type: "string",
            enum: ["draft", "pending", "approved", "rejected", "canceled"],
            example: "pending",
          },
          review_stage: {
            type: "string",
            nullable: true,
            enum: ["applicant", "checker"],
            example: null,
          },
          version: { type: "integer", example: 1 },
          created_at: { type: "string", format: "date-time" },
          submitted_at: { type: "string", format: "date-time", nullable: true },
          forwarded_at: { type: "string", format: "date-time", nullable: true },
          finalized_at: { type: "string", format: "date-time", nullable: true },
          applicant_id: { type: "integer", example: 1 },
          applicant_name: { type: "string", example: "Ahmad Dahlan" },
          applicant_department: {
            type: "string",
            example: "Information Technology",
          },
          checker_name: {
            type: "string",
            nullable: true,
            example: "Budi Pratama",
          },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "integer", example: 50 },
          recipient_id: { type: "integer", example: 1 },
          document_id: { type: "integer", example: 101 },
          document_number: { type: "string", example: "DOC-2026-001" },
          document_title: {
            type: "string",
            example: "Pengadaan Perangkat Server",
          },
          event_type: { type: "string", example: "CHECKER_FORWARDED" },
          title: {
            type: "string",
            example: "Dokumen Diteruskan ke Departemen",
          },
          message: {
            type: "string",
            example:
              "Dokumen DOC-2026-001 telah diteruskan ke departemen terkait.",
          },
          is_read: { type: "boolean", example: false },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [
    {
      cookieAuth: [],
    },
  ],
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login pengguna",
        description:
          "Verifikasi kredensial pengguna, proteksi brute-force lockout (5x), dan terbitkan sesi cookie HTTP-only.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", example: "ahmad.assistant" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login berhasil",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: {
            description: "Kredensial tidak valid atau akun terkunci",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppError" },
              },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Ambil informasi pengguna aktif",
        description:
          "Mengembalikan data profil pengguna berdasarkan cookie sesi aktif.",
        responses: {
          200: {
            description: "Profil pengguna ditemukan",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: {
            description: "Sesi tidak ditemukan atau kedaluwarsa",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppError" },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout dari sistem",
        description:
          "Mencabut token sesi di basis data dan menghapus cookie autentikasi di browser.",
        responses: {
          200: {
            description: "Berhasil logout",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Berhasil keluar dari sesi.",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Ganti password akun",
        description:
          "Memperbarui password akun dengan validasi kebijakan keamanan (panjang min 10 karakter, kombinasi huruf & angka, beda dari password lama).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["old_password", "new_password"],
                properties: {
                  old_password: { type: "string", example: "OldPassword123" },
                  new_password: { type: "string", example: "NewPassword456!" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password berhasil diperbarui",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Password berhasil diperbarui.",
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Validasi password gagal",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppError" },
              },
            },
          },
        },
      },
    },
    "/documents": {
      get: {
        tags: ["Documents"],
        summary: "Daftar Dokumen Saya (My Documents)",
        description:
          "Mengambil daftar dokumen yang diajukan oleh pengguna aktif beserta status alurnya.",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string" },
            description:
              "Filter status (draft/pending/approved/rejected/canceled)",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Pencarian judul atau nomor dokumen",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: {
          200: {
            description: "Daftar dokumen berhasil dimuat",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/DocumentListItem" },
                    },
                    total: { type: "integer", example: 15 },
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 10 },
                    totalPages: { type: "integer", example: 2 },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Documents"],
        summary: "Buat dokumen baru",
        description:
          "Membuat draft dokumen baru dengan lampiran berkas (PDF atau DOCX) dan daftar departemen tujuan.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["title", "departments", "file"],
                properties: {
                  title: {
                    type: "string",
                    example: "Pengadaan Perangkat Server",
                  },
                  description: {
                    type: "string",
                    example: "Pengadaan server produksi data center",
                  },
                  departments: {
                    type: "string",
                    description:
                      "JSON array ID departemen tujuan (contoh: [2, 3])",
                    example: "[2, 3]",
                  },
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Berkas lampiran (PDF atau DOCX, maks 25MB)",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Dokumen draft berhasil dibuat",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    document: { $ref: "#/components/schemas/DocumentListItem" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/documents/checker-queue": {
      get: {
        tags: ["Documents"],
        summary: "Antrean Dokumen Pemeriksaan Checker",
        description:
          "Mengambil daftar dokumen bawahan langsung yang menunggu persetujuan atau pemeriksaan Checker.",
        responses: {
          200: {
            description: "Antrean checker berhasil dimuat",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/DocumentListItem" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/documents/dept-queue": {
      get: {
        tags: ["Documents"],
        summary: "Antrean Dokumen Departemen Tujuan",
        description:
          "Mengambil daftar dokumen yang ditujukan ke departemen yang dikelola oleh manajer aktif.",
        responses: {
          200: {
            description: "Antrean departemen berhasil dimuat",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/DocumentListItem" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/documents/{id}": {
      get: {
        tags: ["Documents"],
        summary: "Detail lengkap dokumen",
        description:
          "Mengambil data lengkap dokumen mencakup metadata, departemen tujuan, riwayat versi, log persetujuan, thread respons, dan izin aksi (allowedActions).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID Dokumen",
          },
        ],
        responses: {
          200: {
            description: "Detail dokumen ditemukan",
          },
          404: {
            description: "Dokumen tidak ditemukan",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppError" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Documents"],
        summary: "Hapus draft dokumen",
        description:
          "Menghapus dokumen yang masih berstatus Draft (Applicant).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Draft berhasil dihapus",
          },
        },
      },
    },
    "/documents/{id}/cancel": {
      post: {
        tags: ["Documents"],
        summary: "Batalkan pengajuan dokumen",
        description:
          "Pemohon membatalkan dokumen yang sedang dalam status Pending sebelum diputuskan.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  note: {
                    type: "string",
                    example: "Dibatalkan karena perubahan alokasi anggaran",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Dokumen berhasil dibatalkan",
          },
        },
      },
    },
    "/workflow/{id}/submit": {
      post: {
        tags: ["Workflow"],
        summary: "Ajukan dokumen ke Checker",
        description:
          "Mengubah status dokumen dari Draft (Applicant) ke Draft (Checker) untuk ditinjau atasan.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Dokumen berhasil diajukan ke Checker",
          },
        },
      },
    },
    "/workflow/{id}/checker-forward": {
      post: {
        tags: ["Workflow"],
        summary: "Checker setujui dan teruskan dokumen",
        description:
          "Checker menyetujui dokumen, mengubah status menjadi Pending, dan membuka alur peninjauan departemen tujuan.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  note: {
                    type: "string",
                    example:
                      "Dokumen telah diperiksa dan disetujui untuk diproses departemen.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Dokumen berhasil diteruskan",
          },
        },
      },
    },
    "/workflow/{id}/checker-revision": {
      post: {
        tags: ["Workflow"],
        summary: "Checker minta revisi",
        description:
          "Checker mengembalikan dokumen ke pemohon untuk diperbaiki beserta catatan revisi.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["note"],
                properties: {
                  note: {
                    type: "string",
                    example: "Mohon lengkapi lampiran estimasi biaya vendor.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Permintaan revisi berhasil dikirim",
          },
        },
      },
    },
    "/workflow/{id}/dept-decision": {
      post: {
        tags: ["Workflow"],
        summary: "Keputusan Departemen Tujuan (Opsi A Konsensus)",
        description:
          "Manajer departemen memberikan keputusan (Approved / Rejected) atau mengubah keputusan sebelumnya. Berdasarkan Opsi A, jika seluruh departemen setuju dokumen menjadi Approved; jika salah satu menolak dokumen menjadi Rejected.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["decision"],
                properties: {
                  decision: {
                    type: "string",
                    enum: ["approved", "rejected"],
                    example: "approved",
                  },
                  note: {
                    type: "string",
                    example: "Disetujui sesuai regulasi anggaran kuartal 4.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description:
              "Keputusan berhasil disimpan dan status konsensus diperbarui",
          },
        },
      },
    },
    "/workflow/{id}/add-dept": {
      post: {
        tags: ["Workflow"],
        summary: "Tambah departemen peninjau tambahan",
        description:
          "Menambahkan departemen baru ke alur peninjauan saat status dokumen sedang Pending.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["department_id"],
                properties: {
                  department_id: { type: "integer", example: 3 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Departemen berhasil ditambahkan",
          },
        },
      },
    },
    "/departments": {
      get: {
        tags: ["Departments"],
        summary: "Daftar Master Departemen Aktif",
        description:
          "Mengambil daftar seluruh departemen aktif beserta nama manajernya dengan dukungan in-memory caching.",
        responses: {
          200: {
            description: "Daftar departemen",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    departments: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Department" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Daftar notifikasi pengguna",
        description:
          "Mengambil daftar notifikasi terbaru milik pengguna yang sedang login.",
        responses: {
          200: {
            description: "Daftar notifikasi berhasil dimuat",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Notification" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Jumlah notifikasi belum dibaca",
        description:
          "Mengambil counter notifikasi aktif yang belum dibuka oleh pengguna.",
        responses: {
          200: {
            description: "Jumlah notifikasi belum dibaca",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "integer", example: 3 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/documents/{id}/files/{versionNo}/download": {
      get: {
        tags: ["Files"],
        summary: "Unduh berkas asli lampiran dokumen",
        description: "Mengunduh berkas lampiran asli pada versi tertentu.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "versionNo",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description:
              "Berkas lampiran dikembalikan dalam bentuk stream biner",
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
    },
    "/documents/{id}/files/{versionNo}/preview": {
      get: {
        tags: ["Files"],
        summary: "Pratinjau berkas PDF dengan stempel validasi resmi",
        description:
          "Mengembalikan berkas PDF dengan cap stempel digital resmi (Status: Approved / Rejected / Pending, Nomor Dokumen, Timestamp stempel) yang dihasilkan melalui pdf-lib.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
          {
            name: "versionNo",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Berkas PDF berstempel",
            content: {
              "application/pdf": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
    },
  },
};
