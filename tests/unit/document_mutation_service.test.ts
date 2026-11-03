import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitDocument,
  deleteDocument,
  cancelDocument,
} from "../../apps/api/src/modules/documents/services/documents-mutation.service";
import { getDocumentDetail } from "../../apps/api/src/modules/documents/services/documents-query.service";
import {
  checkerDecide,
  checkerComment,
  setDepartmentDecision,
  addDepartmentPending,
  deptResponse,
} from "../../apps/api/src/modules/workflow/workflow.service";
import {
  ForbiddenError,
  BadRequestError,
  NotFoundError,
  VersionConflictError,
} from "../../apps/api/src/middleware/errors";

const mockClient = {
  query: vi.fn(),
};

const mockDbQuery = vi.fn();

vi.mock("../../apps/api/src/db", () => ({
  query: (...args: any[]) => mockDbQuery(...args),
  withTransaction: vi.fn(async (cb: (client: any) => Promise<any>) => {
    return await cb(mockClient);
  }),
}));

describe("Document Mutation & Workflow Core Contracts Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Role & Input Preconditions", () => {
    it("submitDocument menolak pengguna yang bukan Assistant (ForbiddenError)", async () => {
      const nonAssistant: any = { id: 2, role: "dept_manager" };
      await expect(submitDocument(100, nonAssistant)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it("deleteDocument menolak pengguna yang bukan Assistant (ForbiddenError)", async () => {
      const nonAssistant: any = { id: 3, role: "checker" };
      await expect(deleteDocument(100, nonAssistant)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it("cancelDocument menolak pengguna yang bukan Assistant (ForbiddenError)", async () => {
      const nonAssistant: any = { id: 4, role: "admin" };
      await expect(cancelDocument(100, nonAssistant)).rejects.toThrow(
        ForbiddenError,
      );
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it("checkerComment menolak body komentar kosong (BadRequestError)", async () => {
      const checker: any = { id: 5, role: "checker" };
      await expect(checkerComment(100, checker, "   ")).rejects.toThrow(
        BadRequestError,
      );
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it("deptResponse menolak isi respon kosong (BadRequestError)", async () => {
      const manager: any = { id: 6, role: "dept_manager" };
      await expect(deptResponse(100, 2, manager, "")).rejects.toThrow(
        BadRequestError,
      );
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe("Optimistic Concurrency & Version Checks", () => {
    it("submitDocument melempar NotFoundError jika dokumen tidak ditemukan saat expectedVersion dipasok", async () => {
      const assistant: any = { id: 10, role: "assistant" };
      mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(submitDocument(100, assistant, 2)).rejects.toThrow(
        NotFoundError,
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT version FROM documents"),
        [100],
      );
    });

    it("submitDocument melempar VersionConflictError jika versi dokumen tidak cocok", async () => {
      const assistant: any = { id: 10, role: "assistant" };
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ version: 3 }],
      });

      await expect(submitDocument(100, assistant, 2)).rejects.toThrow(
        VersionConflictError,
      );
    });

    it("submitDocument langsung mengeksekusi stored procedure dalam 1 query jika expectedVersion tidak disertakan", async () => {
      const assistant: any = { id: 10, role: "assistant" };
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const result = await submitDocument(100, assistant);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        `SELECT sp_submit_document($1, $2)`,
        [100, 10],
      );
      expect(result.message).toContain("berhasil diajukan");
    });

    it("checkerDecide melempar VersionConflictError jika versi dokumen tidak sesuai", async () => {
      const checker: any = { id: 20, role: "checker" };
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ version: 5 }],
      });

      await expect(
        checkerDecide(100, checker, "approve", "Approved", 4),
      ).rejects.toThrow(VersionConflictError);
    });

    it("setDepartmentDecision langsung mengeksekusi stored procedure jika expectedVersion cocok", async () => {
      const manager: any = { id: 30, role: "dept_manager" };
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ version: 2 }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ result: "pending" }],
        });

      const res = await setDepartmentDecision(
        100,
        2,
        manager,
        "approved",
        2,
      );

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(res.status).toBe("pending");
      expect(res.message).toContain("Keputusan departemen berhasil disimpan");
    });

    it("addDepartmentPending menolak jika bukan checker, manager pembuat dokumen, atau target dept manager", async () => {
      const otherManager: any = {
        id: 99,
        role: "dept_manager",
        department_id: 9,
      };
      mockClient.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            checker_id: 20,
            status: "pending",
            version: 1,
            applicant_department_id: 1,
            applicant_dept_manager_id: 50,
            applicant_manager_id: 50,
            is_target_dept_manager: false,
          },
        ],
      });

      await expect(
        addDepartmentPending(100, 3, otherManager),
      ).rejects.toThrow(ForbiddenError);
    });

    it("addDepartmentPending mengizinkan jika pemanggil adalah manager departemen tujuan (TC-06)", async () => {
      const targetManager: any = {
        id: 2,
        role: "dept_manager",
        department_id: 2,
      };
      mockClient.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              checker_id: 20,
              status: "pending",
              version: 1,
              applicant_department_id: 1,
              applicant_dept_manager_id: 50,
              applicant_manager_id: 50,
              is_target_dept_manager: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const res = await addDepartmentPending(100, 3, targetManager);
      expect(res.message).toContain("berhasil ditambahkan");
      expect(mockClient.query).toHaveBeenCalledWith(
        `SELECT sp_add_department($1, $2, $3)`,
        [100, 3, 2],
      );
    });

    it("addDepartmentPending mengizinkan jika pemanggil adalah checker dokumen", async () => {
      const checkerUser: any = {
        id: 20,
        role: "checker",
        department_id: 1,
      };
      mockClient.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              checker_id: 20,
              status: "pending",
              version: 1,
              applicant_department_id: 1,
              applicant_dept_manager_id: 50,
              applicant_manager_id: 50,
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] });

      const res = await addDepartmentPending(100, 3, checkerUser);
      expect(res.message).toContain("berhasil ditambahkan");
      expect(mockClient.query).toHaveBeenCalledWith(
        `SELECT sp_add_department($1, $2, $3)`,
        [100, 3, 20],
      );
    });
  });

  describe("Public Document Number Resolution (getDocumentDetail)", () => {
    const mockUser: any = {
      id: 10,
      role: "assistant",
      department_id: 1,
    };

    it("mengambil dokumen berdasarkan document_number unik dan me-resolve ID internal untuk relasi", async () => {
      // 1. Mock document query by document_number
      mockDbQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 42,
            document_number: "IAC-26110001",
            title: "Pengadaan Laptop Baru",
            status: "draft",
            review_stage: "applicant",
            applicant_id: 10,
            version: 1,
          },
        ],
      });

      // 2. Mock intended departments query
      mockDbQuery.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });

      // 3. Mock Promise.all (versions, responses, decision history, logs)
      mockDbQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, version_no: 1 }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const result = await getDocumentDetail("IAC-26110001", mockUser);

      expect(result.document.document_number).toBe("IAC-26110001");
      expect(result.document.id).toBe(42);

      // Verifikasi query pertama mengambil berdasarkan document_number
      const firstCall = mockDbQuery.mock.calls[0];
      expect(firstCall[0]).toContain("d.document_number = $1");
      expect(firstCall[1]).toEqual(["IAC-26110001"]);

      // Verifikasi query departemen & relasi menggunakan ID internal 42
      const secondCall = mockDbQuery.mock.calls[1];
      expect(secondCall[0]).toContain("dd.document_id = $1");
      expect(secondCall[1]).toEqual([42]);
    });

    it("melemparkan NotFoundError jika document_number tidak ditemukan", async () => {
      mockDbQuery.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });

      await expect(
        getDocumentDetail("NON-EXISTENT", mockUser),
      ).rejects.toThrow(NotFoundError);
    });
  });
});

