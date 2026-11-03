import { describe, it, expect, beforeEach } from "vitest";
import {
  authRateLimiter,
  csrfProtection,
  errorHandler,
  pruneRateLimitMap,
  _getRateLimitMapSize,
  _clearRateLimitMap,
} from "../../apps/api/src/middleware/security";
import { config } from "../../apps/api/src/config";

describe("Security Middleware Unit Tests", () => {
  beforeEach(() => {
    _clearRateLimitMap();
  });

  describe("authRateLimiter & Memory Cap", () => {
    it("menolak request jika melebihi batas percobaan (HTTP 429)", () => {
      const limiter = authRateLimiter(3, 15);
      const req: any = {
        ip: "192.168.1.100",
        headers: { "x-test-rate-limit": "true" },
      };
      let statusCalled = 0;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCalled = code;
          return {
            json: (body: any) => {
              jsonBody = body;
            },
          };
        },
      };

      let nextCalled = 0;
      const next = () => {
        nextCalled++;
      };

      // 3 Percobaan pertama berhasil
      limiter(req, res, next);
      limiter(req, res, next);
      limiter(req, res, next);
      expect(nextCalled).toBe(3);
      expect(statusCalled).toBe(0);

      // Percobaan ke-4 ditolak
      limiter(req, res, next);
      expect(statusCalled).toBe(429);
      expect(jsonBody?.code).toBe("TOO_MANY_REQUESTS");
    });

    it("mengisolasi kuota rate limit antar-rute berbeda untuk IP yang sama", () => {
      const loginLimiter = authRateLimiter(5, 15);
      const forgotLimiter = authRateLimiter(2, 15);

      const loginReq: any = {
        ip: "192.168.1.50",
        baseUrl: "/api/auth",
        path: "/login",
        headers: { "x-test-rate-limit": "true" },
      };
      const forgotReq: any = {
        ip: "192.168.1.50",
        baseUrl: "/api/auth",
        path: "/forgot-password",
        headers: { "x-test-rate-limit": "true" },
      };

      let loginStatus = 0;
      const loginRes: any = {
        status: (c: number) => {
          loginStatus = c;
          return { json: () => {} };
        },
      };
      let forgotStatus = 0;
      const forgotRes: any = {
        status: (c: number) => {
          forgotStatus = c;
          return { json: () => {} };
        },
      };

      let nextCount = 0;
      const next = () => {
        nextCount++;
      };

      // 3 request ke /login (melebihi limit forgot-password yang 2, tapi di bawah limit login 5)
      loginLimiter(loginReq, loginRes, next);
      loginLimiter(loginReq, loginRes, next);
      loginLimiter(loginReq, loginRes, next);
      expect(nextCount).toBe(3);
      expect(loginStatus).toBe(0);

      // Request pertama ke /forgot-password harus tetap lolos (kuota tidak tercampur)
      forgotLimiter(forgotReq, forgotRes, next);
      expect(nextCount).toBe(4);
      expect(forgotStatus).toBe(0);
    });

    it("pruneRateLimitMap membatasi ukuran map secara tegas (FIFO eviction) untuk mencegah OOM", () => {
      const limiter = authRateLimiter(5, 15);
      const res: any = { status: () => ({ json: () => {} }) };
      const next = () => {};

      // Masukkan 50 IP unik dengan header x-test-rate-limit
      for (let i = 1; i <= 50; i++) {
        const req: any = {
          ip: `10.0.0.${i}`,
          headers: { "x-test-rate-limit": "true" },
        };
        limiter(req, res, next);
      }
      expect(_getRateLimitMapSize()).toBe(50);

      // Jalankan pruneRateLimitMap dengan kapasitas maksimal 20
      pruneRateLimitMap(Date.now(), 20);
      expect(_getRateLimitMapSize()).toBe(19); // 1 slot evicted to make room
    });

    it("tidak memicu eviction jika IP yang sama mengirim request berulang", () => {
      const limiter = authRateLimiter(10, 15);
      const res: any = { status: () => ({ json: () => {} }) };
      const next = () => {};

      const req: any = {
        ip: "10.0.0.99",
        headers: { "x-test-rate-limit": "true" },
      };

      // Request berulang kali dari IP yang sama
      for (let i = 0; i < 5; i++) {
        limiter(req, res, next);
      }
      expect(_getRateLimitMapSize()).toBe(1);
    });
  });

  describe("csrfProtection", () => {
    it("mengizinkan metode aman (GET, HEAD, OPTIONS) tanpa origin check", () => {
      let nextCalled = false;
      const req: any = { method: "GET" };
      const res: any = {};
      csrfProtection(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    });

    it("mengizinkan request dengan Bearer token header tanpa cookie CSRF check", () => {
      let nextCalled = false;
      const req: any = {
        method: "POST",
        headers: { authorization: "Bearer some-token" },
      };
      const res: any = {};
      csrfProtection(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    });

    it("menolak request jika sec-fetch-site adalah cross-site (HTTP 403)", () => {
      let statusCode = 0;
      let jsonBody: any = null;
      const req: any = {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
        cookies: { [config.sessionCookieName]: "valid-cookie" },
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (body: any) => {
              jsonBody = body;
            },
          };
        },
      };

      csrfProtection(req, res, () => {});
      expect(statusCode).toBe(403);
      expect(jsonBody?.code).toBe("CSRF_BLOCKED");
    });

    it("menolak request jika header Origin tidak cocok dengan frontend atau host (HTTP 403)", () => {
      let statusCode = 0;
      let jsonBody: any = null;
      const req: any = {
        method: "POST",
        headers: { origin: "https://evil-attacker.com" },
        cookies: { [config.sessionCookieName]: "valid-cookie" },
        get: () => "localhost:4000",
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (body: any) => {
              jsonBody = body;
            },
          };
        },
      };

      csrfProtection(req, res, () => {});
      expect(statusCode).toBe(403);
      expect(jsonBody?.code).toBe("ORIGIN_MISMATCH");
    });

    it("mengizinkan request jika header Origin cocok dengan host target", () => {
      let nextCalled = false;
      const req: any = {
        method: "POST",
        headers: { origin: "http://my-company.internal" },
        cookies: { [config.sessionCookieName]: "valid-cookie" },
        get: () => "my-company.internal",
      };
      const res: any = {};

      csrfProtection(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled).toBe(true);
    });

    it("menolak request ber-cookie tanpa header Origin/Referer pada non-test environment (HTTP 403)", () => {
      const origEnv = config.env;
      (config as any).env = "production";
      try {
        let statusCode = 0;
        let jsonBody: any = null;
        const req: any = {
          method: "POST",
          headers: {},
          cookies: { [config.sessionCookieName]: "valid-cookie" },
          get: () => "localhost:4000",
        };
        const res: any = {
          status: (code: number) => {
            statusCode = code;
            return {
              json: (body: any) => {
                jsonBody = body;
              },
            };
          },
        };

        csrfProtection(req, res, () => {});
        expect(statusCode).toBe(403);
        expect(jsonBody?.code).toBe("CSRF_ORIGIN_REQUIRED");
      } finally {
        (config as any).env = origEnv;
      }
    });
  });

  describe("errorHandler Unit Tests (Sprint 4)", () => {
    it("mengonversi MulterError LIMIT_FILE_SIZE ke status 413 FILE_TOO_LARGE", () => {
      let statusCode = 0;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (b: any) => {
              jsonBody = b;
            },
          };
        },
      };

      const multerErr = {
        name: "MulterError",
        code: "LIMIT_FILE_SIZE",
        message: "File too large",
      };

      errorHandler(multerErr, {} as any, res, () => {});
      expect(statusCode).toBe(413);
      expect(jsonBody?.code).toBe("FILE_TOO_LARGE");
      expect(jsonBody?.error).toContain("Ukuran berkas melebihi batas");
    });

    it("mengonversi MulterError generik ke status 400 INVALID_FILE_UPLOAD", () => {
      let statusCode = 0;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (b: any) => {
              jsonBody = b;
            },
          };
        },
      };

      const multerErr = {
        name: "MulterError",
        code: "LIMIT_UNEXPECTED_FILE",
        message: "Unexpected field",
      };

      errorHandler(multerErr, {} as any, res, () => {});
      expect(statusCode).toBe(400);
      expect(jsonBody?.code).toBe("INVALID_FILE_UPLOAD");
    });

    it("mengonversi PostgreSQL error 22P02 ke status 400 INVALID_INPUT_SYNTAX", () => {
      let statusCode = 0;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (b: any) => {
              jsonBody = b;
            },
          };
        },
      };

      const pgErr = {
        code: "22P02",
        message: 'invalid input syntax for type bigint: "abc"',
      };

      errorHandler(pgErr, {} as any, res, () => {});
      expect(statusCode).toBe(400);
      expect(jsonBody?.code).toBe("INVALID_INPUT_SYNTAX");
    });

    it("mengonversi PostgreSQL error 22007 ke status 400 INVALID_DATETIME_FORMAT", () => {
      let statusCode = 0;
      let jsonBody: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (b: any) => {
              jsonBody = b;
            },
          };
        },
      };

      const pgErr = {
        code: "22007",
        message: 'invalid input syntax for type date: "invalid-date"',
      };

      errorHandler(pgErr, {} as any, res, () => {});
      expect(statusCode).toBe(400);
      expect(jsonBody?.code).toBe("INVALID_DATETIME_FORMAT");
    });
  });
});

