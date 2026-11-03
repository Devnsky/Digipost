export interface NotificationItem {
  id: number;
  recipient_id: number;
  document_id: number;
  document_number: string;
  document_title: string;
  event_type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  document_status?: string;
  document_deleted_at?: string | null;
  applicant_name?: string;
  can_open?: boolean;
}
