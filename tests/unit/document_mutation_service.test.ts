import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitDocument,
  deleteDocument,
  cancelDocument,
} from "../../apps/api/src/modules/documents/services/documents-mutation.service";
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

vi.mock("../../apps/api/src/db", () => ({
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

    it("addDepartmentPending menolak jika bukan manager dari departemen pemilik dokumen", async () => {
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
            applicant_department_id: 1, // Milik departemen 1
          },
        ],
      });

      await expect(
        addDepartmentPending(100, 3, otherManager),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});

