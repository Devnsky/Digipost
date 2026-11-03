import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as db from "../../apps/api/src/db";
import {
  listActiveDepartments,
  invalidateDepartmentsCache,
} from "../../apps/api/src/modules/departments/departments.service";

describe("Departments In-Memory Cache Unit Tests", () => {
  beforeEach(() => {
    invalidateDepartmentsCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    invalidateDepartmentsCache();
    vi.restoreAllMocks();
  });

  it("menyimpan hasil query dalam memori dan tidak mengulang query database dalam rentang TTL", async () => {
    const mockDbRows = [
      {
        id: 1,
        code: "HR",
        name: "Human Resources",
        manager_id: 10,
        manager_name: "Manager HR",
      },
      {
        id: 2,
        code: "FIN",
        name: "Finance",
        manager_id: 20,
        manager_name: "Manager Finance",
      },
    ];

    const querySpy = vi.spyOn(db, "query").mockResolvedValue({
      rows: mockDbRows,
      rowCount: 2,
      command: "SELECT",
      oid: 0,
      fields: [],
    } as any);

    // Call 1: Database must be queried
    const depts1 = await listActiveDepartments();
    expect(depts1).toHaveLength(2);
    expect(querySpy).toHaveBeenCalledTimes(1);

    // Call 2: Must be served from cache without querying database
    const depts2 = await listActiveDepartments();
    expect(depts2).toHaveLength(2);
    expect(depts2).toEqual(depts1);
    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it("memperbarui data dari database setelah invalidateDepartmentsCache() dipanggil", async () => {
    const querySpy = vi.spyOn(db, "query").mockResolvedValue({
      rows: [
        {
          id: 1,
          code: "HR",
          name: "Human Resources",
          manager_id: 10,
          manager_name: "Manager HR",
        },
      ],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    } as any);

    await listActiveDepartments();
    expect(querySpy).toHaveBeenCalledTimes(1);

    // Invalidate cache
    invalidateDepartmentsCache();

    // Next call must re-query database
    await listActiveDepartments();
    expect(querySpy).toHaveBeenCalledTimes(2);
  });
});
