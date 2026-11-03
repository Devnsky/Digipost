import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../lib/feedback-context";
import { NotificationItem } from "../../lib/types";
import {
  Bell,
  CheckCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Send,
} from "lucide-react";

interface NotificationsPageProps {
  onSelectDocument: (documentNumber: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onSelectDocument,
}) => {
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filterUnread, setFilterUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.notifications.list({
        is_read: filterUnread ? false : undefined,
        page,
        limit: 15,
      });
      setNotifications(res.items);
      setTotal(res.total);
      setUnreadCount(res.unreadCount);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || "Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  }, [page, filterUnread]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (!notif.is_read) {
        await api.notifications.markRead(notif.id);
      }
      if (notif.document_number) {
        onSelectDocument(notif.document_number);
      }
    } catch {
      if (notif.document_number) {
        onSelectDocument(notif.document_number);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllRead();
      await fetchNotifications();
      toast.success("Semua notifikasi berhasil ditandai telah dibaca.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menandai semua notifikasi dibaca");
    }
  };

  const getNotificationTitle = (notif: NotificationItem) => {
    if (notif.title && notif.title.trim()) return notif.title;
    switch (notif.event_type) {
      case "submitted":
        return "Pengajuan Dokumen Baru";
      case "checker_comment":
        return "Catatan Baru dari Pemeriksa";
      case "revision_requested":
        return "Permintaan Revisi Dokumen";
      case "checker_rejected":
        return "Dokumen Ditolak oleh Checker";
      case "forwarded":
        return "Dokumen Diteruskan ke Departemen";
      case "dept_response":
        return "Respon Baru Departemen";
      case "dept_added":
        return "Departemen Ditambahkan ke Alur";
      case "final_approved":
        return "Dokumen Disetujui Penuh";
      case "final_rejected":
        return "Dokumen Ditolak Final";
      case "canceled":
        return "Pengajuan Dokumen Dibatalkan";
      case "draft_deleted":
        return "Draf Dokumen Dihapus";
      default:
        return "Pemberitahuan Sistem";
    }
  };

  const getNotificationSummary = (notif: NotificationItem) => {
    if (notif.message && notif.message.trim()) return notif.message;
    const docNo = notif.document_number || "Dokumen";
    const docTitle = notif.document_title || "";
    const docRef = docTitle ? `${docNo} (${docTitle})` : docNo;

    switch (notif.event_type) {
      case "submitted":
        return `Dokumen ${docRef} telah diajukan untuk pemeriksaan atasan (Checker).`;
      case "checker_comment":
        return `Atasan langsung memberikan catatan pada dokumen ${docRef}.`;
      case "revision_requested":
        return `Dokumen ${docRef} memerlukan perbaikan/revisi dari pemohon.`;
      case "checker_rejected":
        return `Pengajuan dokumen ${docRef} telah ditolak oleh atasan langsung (Checker).`;
      case "forwarded":
        return `Dokumen ${docRef} telah diverifikasi oleh Checker dan diteruskan untuk persetujuan departemen.`;
      case "dept_response":
        return `Terdapat respon baru pada alur persetujuan dokumen ${docRef}.`;
      case "dept_added":
        return `Departemen Anda telah ditambahkan ke alur persetujuan dokumen ${docRef}.`;
      case "final_approved":
        return `Kabar baik! Seluruh departemen terkait telah menyetujui dokumen ${docRef}.`;
      case "final_rejected":
        return `Dokumen ${docRef} telah ditolak dalam tahap keputusan departemen.`;
      case "canceled":
        return `Pengajuan dokumen ${docRef} telah dibatalkan oleh pemohon.`;
      case "draft_deleted":
        return `Draf pengajuan dokumen ${docRef} telah dihapus oleh pemohon.`;
      default:
        return `Terdapat aktivitas atau pembaruan status pada dokumen ${docRef}.`;
    }
  };

  const getEventMeta = (eventType: string) => {
    switch (eventType) {
      case "final_approved":
        return {
          icon: CheckCircle2,
          color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        };
      case "forwarded":
      case "submitted":
        return {
          icon: Send,
          color: "text-[#555ad5] bg-[#f0effe] border-[#dadafa]",
        };
      case "revision_requested":
      case "checker_comment":
        return {
          icon: MessageSquare,
          color: "text-amber-600 bg-amber-50 border-amber-200",
        };
      case "checker_rejected":
      case "final_rejected":
        return {
          icon: XCircle,
          color: "text-rose-600 bg-rose-50 border-rose-200",
        };
      case "canceled":
      case "draft_deleted":
        return {
          icon: AlertCircle,
          color: "text-slate-600 bg-slate-100 border-slate-200",
        };
      default:
        return {
          icon: Bell,
          color: "text-[#555ad5] bg-[#f0effe] border-[#dadafa]",
        };
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return (
      new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      new Date(dateStr).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " WIB"
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header matching Screenshot 33 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1">
            Kotak Masuk
          </span>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
            Notifikasi
          </h1>
          <p className="text-xs text-[#717684] mt-1">
            Riwayat pembaruan status dan pengumuman sistem DigiPost.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#e9ebf0] bg-white hover:bg-slate-50 text-[#212634] text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#555ad5]" />
            <span>Tandai semua dibaca</span>
          </button>
        )}
      </div>

      {/* Main Full-Width Notification Card matching Screenshot 33 */}
      <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#212634]">
              Daftar notifikasi
            </h2>
            <p className="text-xs text-[#717684] mt-0.5">
              Semua peringatan dan riwayat perubahan dokumen
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFilterUnread(!filterUnread);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterUnread
                  ? "bg-[#555ad5] text-white"
                  : "bg-[#f0effe] text-[#555ad5] hover:bg-[#e4e2fd]"
              }`}
            >
              {filterUnread
                ? "Tampilkan Semua"
                : `Hanya Belum Dibaca (${unreadCount})`}
            </button>
          </div>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-[#717684]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#555ad5] mr-2" />
            <span className="text-xs font-medium">Memuat notifikasi...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchNotifications}
              className="mt-3 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-medium cursor-pointer"
            >
              Coba lagi
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-[#717684]">
            <Bell className="w-10 h-10 mx-auto mb-2 text-[#8a90a2] stroke-1" />
            <p className="font-semibold text-[#212634] text-sm">
              Tidak ada notifikasi baru
            </p>
            <p className="text-xs text-[#717684] mt-1">
              {filterUnread
                ? "Semua notifikasi sudah Anda baca."
                : "Pemberitahuan perubahan status dan komentar akan muncul di sini."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e9ebf0] -mx-6">
            {notifications.map((notif) => {
              const notifTitle = getNotificationTitle(notif);
              const notifSummary = getNotificationSummary(notif);
              const eventMeta = getEventMeta(notif.event_type);
              const EventIcon = eventMeta.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-6 py-4 flex items-center justify-between gap-4 transition cursor-pointer ${
                    notif.is_read
                      ? "bg-white hover:bg-[#fbfbfc]"
                      : "bg-[#f8f9fe] hover:bg-[#f0effe]/40"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Event Icon badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${eventMeta.color}`}
                    >
                      <EventIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-xs ${
                            notif.is_read
                              ? "font-bold text-[#212634]"
                              : "font-extrabold text-[#1e1b4b]"
                          }`}
                        >
                          {notifTitle}
                        </h3>
                        {!notif.is_read && (
                          <span className="px-1.5 py-0.5 bg-[#f0effe] text-[#555ad5] text-[10px] font-bold rounded">
                            Baru
                          </span>
                        )}
                        {notif.document_number && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-medium rounded border border-slate-200">
                            {notif.document_number}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#4b5563] leading-relaxed">
                        {notifSummary}
                      </p>

                      {notif.document_title && (
                        <div className="text-[11px] font-medium text-[#717684] truncate">
                          Dokumen:{" "}
                          <span className="text-[#212634]">
                            {notif.document_title}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-[#8a90a2] pt-0.5">
                        <span>{formatDateTime(notif.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Button */}
                  {notif.document_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(notif);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0effe] hover:bg-[#e4e2fd] text-[#555ad5] text-xs font-semibold transition shrink-0 cursor-pointer"
                    >
                      <span>Lihat dokumen</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#e9ebf0] text-xs text-[#717684]">
            <span>
              Menampilkan halaman{" "}
              <strong className="text-[#212634]">{page}</strong> dari{" "}
              <strong className="text-[#212634]">{totalPages}</strong> (total{" "}
              {total} notifikasi)
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-[#e9ebf0] bg-white text-[#212634] hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-[#e9ebf0] bg-white text-[#212634] hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
