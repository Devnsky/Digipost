import {
  ResponseItem,
  DecisionHistoryItem,
  ApprovalLogItem,
} from "./workflow.types";

export type DocumentStatus =
  "draft" | "pending" | "approved" | "rejected" | "canceled";

export type ReviewStage = "applicant" | "checker" | null;

export interface DocumentListItem {
  id: number;
  document_number: string;
  title: string;
  description?: string;
  status: DocumentStatus;
  review_stage: ReviewStage;
  version: number;
  created_at: string;
  submitted_at?: string;
  forwarded_at?: string;
  finalized_at?: string;
  applicant_id?: number;
  applicant_name?: string;
  applicant_department?: string;
  checker_name?: string;
  departments?: Array<{
    id: number;
    code: string;
    name: string;
    decision?: "approved" | "rejected" | null;
  }>;
}

export interface DocumentDepartment {
  relation_id: number;
  department_id: number;
  code: string;
  name: string;
  manager_id: number;
  manager_name?: string;
  passed_checker: boolean;
  decision: "approved" | "rejected" | null;
  decided_by?: number;
  decided_by_name?: string;
  decided_at?: string;
  added_by?: number;
  added_by_name?: string;
  added_at?: string;
}

export interface DocumentVersion {
  id: number;
  version_no: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  checksum: string;
  uploaded_at: string;
  uploaded_by_name: string;
}

export interface AllowedActions {
  can_create?: boolean;
  can_edit: boolean;
  can_submit: boolean;
  can_delete: boolean;
  can_cancel: boolean;
  can_checker_decide: boolean;
  can_dept_decide: boolean;
  managed_department_id: number | null;
  can_add_dept: boolean;
  can_respond: boolean;
  can_print: boolean;
  is_checker_dept_conflict: boolean;
}

export interface DocumentDetailResponse {
  document: {
    id: number;
    document_number: string;
    title: string;
    description?: string;
    applicant_id: number;
    applicant_name: string;
    applicant_email: string;
    applicant_employee_no?: string;
    applicant_department_id?: number;
    applicant_department_name?: string;
    applicant_department_code?: string;
    checker_id: number | null;
    checker_name?: string;
    checker_email?: string;
    checker_department_name?: string;
    status: DocumentStatus;
    review_stage: ReviewStage;
    version: number;
    created_at: string;
    submitted_at?: string;
    forwarded_at?: string;
    finalized_at?: string;
  };
  departments: DocumentDepartment[];
  versions: DocumentVersion[];
  responses: ResponseItem[];
  decisionHistory: DecisionHistoryItem[];
  logs: ApprovalLogItem[];
  allowedActions: AllowedActions;
}

export interface DashboardStats {
  myDocuments: {
    total: string | number;
    draft: string | number;
    pending: string | number;
    approved: string | number;
    rejected: string | number;
    canceled: string | number;
  };
  checkerQueue: number;
  deptDocuments: {
    total: string | number;
    pending: string | number;
    approved: string | number;
    rejected: string | number;
    canceled: string | number;
  };
  managerStats?: {
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    canceled: number;
  };
  oldestPending: Array<{
    document_id: number;
    document_number: string;
    title: string;
    applicant_name: string;
    forwarded_at: string;
    pending_days: number;
    total_depts: number;
    approved_count: number;
    rejected_count: number;
    pending_count: number;
  }>;
}
