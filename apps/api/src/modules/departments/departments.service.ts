import { query } from "../../db";

export interface DepartmentListItem {
  id: number;
  code: string;
  name: string;
  manager_id: number | null;
  manager_name: string | null;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

let departmentsCache: CacheEntry<DepartmentListItem[]> | null = null;
const DEPARTMENTS_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function invalidateDepartmentsCache(): void {
  departmentsCache = null;
}

export async function listActiveDepartments(): Promise<DepartmentListItem[]> {
  const now = Date.now();
  if (departmentsCache && now < departmentsCache.expiresAt) {
    return departmentsCache.data;
  }

  const result = await query<DepartmentListItem>(
    `SELECT d.id, d.code, d.name, d.manager_id, u.full_name as manager_name
     FROM departments d
     LEFT JOIN users u ON u.id = d.manager_id
     WHERE d.is_active = TRUE
     ORDER BY d.code ASC`,
  );

  const items = result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    manager_id: row.manager_id ? Number(row.manager_id) : null,
  }));

  departmentsCache = {
    data: items,
    expiresAt: now + DEPARTMENTS_CACHE_TTL_MS,
  };

  return items;
}
