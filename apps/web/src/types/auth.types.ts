export type UserRole = "assistant" | "checker" | "dept_manager" | "admin";

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  employee_no?: string;
  role?: UserRole | string;
  department_id?: number;
  department_name?: string;
  department_code?: string;
  manager_id?: number;
  manager_name?: string;
  must_change_password: boolean;
  is_active: boolean;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  manager_id: number;
  manager_name?: string;
}
