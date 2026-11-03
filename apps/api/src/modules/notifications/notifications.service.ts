import { query } from "../../db";
import { AuthUser } from "../../middleware/auth";

export interface NotificationFilterOptions {
  isRead?: boolean;
  eventType?: string;
  page?: number;
  limit?: number;
}

export async function listNotifications(
  user: AuthUser,
  options: NotificationFilterOptions,
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 15));
  const offset = (page - 1) * limit;

  const conditions: string[] = ["n.recipient_id = $1"];
  const params: any[] = [user.id];
  let paramIndex = 2;

  if (options.isRead !== undefined) {
    conditions.push(`n.is_read = $${paramIndex}`);
    params.push(options.isRead);
    paramIndex++;
  }

  if (options.eventType) {
    conditions.push(`n.event_type = $${paramIndex}`);
    params.push(options.eventType);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await query(
    `SELECT COUNT(*) FROM notifications n WHERE ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const unreadCountResult = await query(
    `SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`,
    [user.id],
  );
  const unreadCount = parseInt(unreadCountResult.rows[0].count, 10);

  const dataQuery = `
    SELECT
      n.id,
      n.document_id,
      n.event_type,
      n.message,
      n.is_read,
      n.created_at,
      n.read_at,
      d.document_number,
      d.title as document_title,
      d.status as document_status,
      d.deleted_at as document_deleted_at,
      u.full_name as applicant_name,
      (d.deleted_at IS NULL) as can_open
    FROM notifications n
    LEFT JOIN documents d ON d.id = n.document_id
    LEFT JOIN users u ON u.id = d.applicant_id
    WHERE ${whereClause}
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const dataResult = await query(dataQuery, params);

  const items = dataResult.rows.map((row) => {
    const docNo = row.document_number || "Dokumen";
    const docTitle = row.document_title || "";
    const docRef = docTitle ? `${docNo} - ${docTitle}` : docNo;

    let title: string;
    let defaultMessage: string;

    switch (row.event_type) {
      case "submitted":
        title = "Pengajuan Dokumen Baru";
        defaultMessage = row.applicant_name
          ? `Dokumen ${docRef} telah diajukan oleh ${row.applicant_name} untuk pemeriksaan atasan (Checker).`
          : `Dokumen ${docRef} telah diajukan untuk pemeriksaan atasan (Checker).`;
        break;
      case "checker_comment":
        title = "Catatan Baru dari Pemeriksa";
        defaultMessage = `Atasan langsung (Checker) memberikan catatan pada dokumen ${docRef}.`;
        break;
      case "revision_requested":
        title = "Permintaan Revisi Dokumen";
        defaultMessage = `Dokumen ${docRef} memerlukan perbaikan/revisi sebelum dapat diproses lebih lanjut.`;
        break;
      case "checker_rejected":
        title = "Dokumen Ditolak oleh Checker";
        defaultMessage = `Pengajuan dokumen ${docRef} telah ditolak oleh atasan langsung (Checker).`;
        break;
      case "forwarded":
        title = "Dokumen Diteruskan ke Departemen";
        defaultMessage = `Dokumen ${docRef} telah disetujui oleh Checker dan diteruskan untuk persetujuan departemen.`;
        break;
      case "dept_response":
        title = "Respon Baru dari Departemen";
        defaultMessage = `Terdapat respon atau tanggapan baru pada alur persetujuan dokumen ${docRef}.`;
        break;
      case "dept_added":
        title = "Departemen Ditambahkan ke Alur";
        defaultMessage = `Departemen Anda telah ditambahkan ke dalam alur persetujuan dokumen ${docRef}.`;
        break;
      case "final_approved":
        title = "Dokumen Disetujui Penuh";
        defaultMessage = `Kabar baik! Seluruh departemen terkait telah menyetujui dokumen ${docRef}.`;
        break;
      case "final_rejected":
        title = "Dokumen Ditolak Final";
        defaultMessage = `Dokumen ${docRef} telah ditolak dalam tahap keputusan departemen.`;
        break;
      case "canceled":
        title = "Pengajuan Dokumen Dibatalkan";
        defaultMessage = `Pengajuan dokumen ${docRef} telah dibatalkan oleh pemohon.`;
        break;
      case "draft_deleted":
        title = "Draf Dokumen Dihapus";
        defaultMessage = `Draf pengajuan dokumen ${docRef} telah dihapus oleh pemohon.`;
        break;
      default:
        title = "Pemberitahuan Dokumen";
        defaultMessage = `Terdapat aktivitas atau pembaruan status pada dokumen ${docRef}.`;
        break;
    }

    const message =
      row.message && row.message.trim() ? row.message.trim() : defaultMessage;

    return {
      ...row,
      id: Number(row.id),
      document_id: row.document_id ? Number(row.document_id) : null,
      title,
      message,
      body: message,
    };
  });

  return {
    items,
    total,
    unreadCount,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function markAsRead(notificationId: number, user: AuthUser) {
  await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = now()
     WHERE id = $1 AND recipient_id = $2`,
    [notificationId, user.id],
  );
  return { message: "Notifikasi ditandai sudah dibaca" };
}

export async function markAllAsRead(user: AuthUser) {
  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = now()
     WHERE recipient_id = $1 AND is_read = FALSE`,
    [user.id],
  );
  return {
    message: "Semua notifikasi ditandai sudah dibaca",
    updatedCount: result.rowCount || 0,
  };
}
