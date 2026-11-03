export interface ResponseItem {
  id: number;
  author_id: number;
  author_role: string;
  type: "comment" | "revision_request" | "dept_response";
  body: string;
  visible_to_dept: boolean;
  created_at: string;
  author_name: string;
  department_name?: string;
}

export interface DecisionHistoryItem {
  id: number;
  department_id: number;
  department_name: string;
  old_decision: string | null;
  new_decision: string;
  changed_at: string;
  actor_name: string;
}

export interface ApprovalLogItem {
  id: number;
  action: string;
  from_status: string;
  to_status: string;
  note?: string;
  created_at: string;
  actor_name: string;
}
