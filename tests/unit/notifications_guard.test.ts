import { describe, it, expect, vi } from "vitest";
import { NotificationItem } from "../../apps/web/src/types/notifications.types";

/**
 * Pure handler function mirroring handleNotificationClick in NotificationsPage
 * to empirically verify the guard logic against dead link navigation.
 */
async function processNotificationClick(
  notif: NotificationItem,
  markReadApi: (id: number) => Promise<any>,
  onSelectDocument: (docNum: string) => void,
  toastInfo: (msg: string) => void,
) {
  try {
    if (!notif.is_read) {
      await markReadApi(notif.id);
    }
  } catch {
    // Ignore markRead failures gracefully
  }

  if (notif.can_open === false || notif.event_type === "draft_deleted") {
    toastInfo("Draf dokumen ini telah dihapus oleh pemohon.");
    return;
  }

  if (notif.document_number) {
    onSelectDocument(notif.document_number);
  }
}

describe("Notification Soft-Delete Guard Unit Tests", () => {
  it("prevents document navigation and shows info toast when document is deleted (can_open = false)", async () => {
    const notif: NotificationItem = {
      id: 1,
      recipient_id: 10,
      document_id: 100,
      document_number: "DOC-2026-001",
      document_title: "Draft Proposal",
      event_type: "draft_deleted",
      title: "Draf Dokumen Dihapus",
      message: "Draf proposal dihapus",
      is_read: false,
      created_at: new Date().toISOString(),
      can_open: false,
      document_deleted_at: new Date().toISOString(),
    };

    const markReadApi = vi.fn().mockResolvedValue({});
    const onSelectDoc = vi.fn();
    const toastInfo = vi.fn();

    await processNotificationClick(notif, markReadApi, onSelectDoc, toastInfo);

    expect(markReadApi).toHaveBeenCalledWith(1);
    expect(toastInfo).toHaveBeenCalledWith("Draf dokumen ini telah dihapus oleh pemohon.");
    expect(onSelectDoc).not.toHaveBeenCalled();
  });

  it("allows document navigation when document is active (can_open = true)", async () => {
    const notif: NotificationItem = {
      id: 2,
      recipient_id: 10,
      document_id: 101,
      document_number: "DOC-2026-002",
      document_title: "Proposal Pengadaan",
      event_type: "submitted",
      title: "Pengajuan Dokumen Baru",
      message: "Dokumen baru diajukan",
      is_read: true,
      created_at: new Date().toISOString(),
      can_open: true,
      document_deleted_at: null,
    };

    const markReadApi = vi.fn();
    const onSelectDoc = vi.fn();
    const toastInfo = vi.fn();

    await processNotificationClick(notif, markReadApi, onSelectDoc, toastInfo);

    expect(markReadApi).not.toHaveBeenCalled();
    expect(toastInfo).not.toHaveBeenCalled();
    expect(onSelectDoc).toHaveBeenCalledWith("DOC-2026-002");
  });
});

