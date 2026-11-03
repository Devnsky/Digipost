import { describe, it, expect, beforeEach } from "vitest";
import {
  authRateLimiter,
  csrfProtection,
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
});

