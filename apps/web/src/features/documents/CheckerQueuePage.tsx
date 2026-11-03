import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { DocumentListItem, DashboardStats } from "../../lib/types";
import {
  formatNumber,
  formatDate,
  formatDateTime,
} from "../../lib/formatters";
import { StatusBadge } from "../../components/StatusBadge";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  FileEdit,
  ArrowRight,
  HelpCircle,
  CheckSquare,
} from "lucide-react";

interface CheckerQueuePageProps {
  onSelectDocument: (documentNumber: string) => void;
}

export const CheckerQueuePage: React.FC<CheckerQueuePageProps> = ({
  onSelectDocument,
}) => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, statsRes, notifsRes] = await Promise.all([
        api.documents.getCheckerQueue({
          search: searchQuery || undefined,
          page,
          limit: 10,
        }),
        api.documents.getStats(),
        api.notifications.list({ limit: 5 }),
      ]);
      setDocuments(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStats(statsRes);
      setRecentActivities(notifsRes.items || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat antrean checker");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQueue();
  };

  const pendingCount = total;

  return (
    <div className="space-y-6">
      {/* Page Header matching Screenshot 24 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1">
            Pemeriksaan Tingkat Pertama
          </span>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
            Pemeriksaan atasan
          </h1>
          <p className="text-xs text-[#717684] mt-1">
            Daftar dokumen staf yang menunggu pemeriksaan dan keputusan Anda
            sebagai atasan langsung.
          </p>
        </div>
      </div>

      {/* 4 Stat Cards in a row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Menunggu ditinjau */}
        <div className="bg-white p-5 rounded-2xl border border-[#e9ebf0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-[#717684]">
              Menunggu ditinjau
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#fef3c7] text-[#b45309] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#212634]">
              {formatNumber(pendingCount)}
            </div>
            <div className="text-[11px] text-[#8a90a2] mt-1">
              Staf langsung Anda
            </div>
          </div>
        </div>

        {/* Card 2: Perlu revisi */}
        <div className="bg-white p-5 rounded-2xl border border-[#e9ebf0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-[#717684]">
              Perlu tindakan
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f0effe] text-[#555ad5] flex items-center justify-center">
              <FileEdit className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#212634]">
              {formatNumber(pendingCount > 0 ? 1 : 0)}
            </div>
            <div className="text-[11px] text-[#8a90a2] mt-1">
              Prioritas pemeriksaan
            </div>
          </div>
        </div>

        {/* Card 3: Disetujui diteruskan */}
        <div className="bg-white p-5 rounded-2xl border border-[#e9ebf0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-[#717684]">
              Diteruskan
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#212634]">
              {formatNumber(
                stats?.myDocuments.pending
                  ? Number(stats?.myDocuments.pending)
                  : 0,
              )}
            </div>
            <div className="text-[11px] text-[#8a90a2] mt-1">
              Sedang di multi-dept
            </div>
          </div>
        </div>

        {/* Card 4: Total selesai */}
        <div className="bg-white p-5 rounded-2xl border border-[#e9ebf0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-[#717684]">
              Total disetujui
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#212634]">
              {formatNumber(
                stats?.myDocuments.approved
                  ? Number(stats?.myDocuments.approved)
                  : 0,
              )}
            </div>
            <div className="text-[11px] text-[#8a90a2] mt-1">
              Final disetujui
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout matching Screenshot 24 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dokumen untuk ditinjau Card (~68% width on desktop) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#212634]">
                Dokumen untuk ditinjau
              </h2>
              <p className="text-xs text-[#717684] mt-0.5">
                Pengajuan yang memerlukan verifikasi kelayakan sebelum
                diteruskan
              </p>
            </div>
            <span className="text-xs text-[#717684] font-medium">
              {total} dokumen
            </span>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#8a90a2] absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau nomor dokumen staf..."
              className="w-full pl-9 pr-4 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
            />
          </form>

          {/* Table Content */}
          {loading ? (
            <div className="flex items-center justify-center p-12 text-[#717684]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#555ad5] mr-2" />
              <span className="text-xs font-medium">
                Memuat antrean dokumen...
              </span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 text-xs">
              <p className="font-semibold">{error}</p>
              <button
                onClick={fetchQueue}
                className="mt-3 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-medium cursor-pointer"
              >
                Coba lagi
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center text-[#717684]">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-[#8a90a2] stroke-1" />
              <p className="font-semibold text-[#212634] text-sm">
                Semua pengajuan telah diperiksa
              </p>
              <p className="text-xs text-[#717684] mt-1">
                Tidak ada dokumen staf yang menunggu pemeriksaan saat ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-[#e9ebf0] text-[10px] font-bold uppercase tracking-wider text-[#8a90a2]">
                    <th className="py-3 px-6">Nama dokumen</th>
                    <th className="py-3 px-4">Pemohon</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9ebf0]">
                  {documents.map((doc) => {
                    const deptNames =
                      doc.departments && doc.departments.length > 0
                        ? doc.departments
                            .map((d) => d.name || d.code)
                            .join(", ")
                        : "Belum ditentukan";

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-[#fbfbfc] transition"
                      >
                        <td className="py-3.5 px-6">
                          <div
                            onClick={() => onSelectDocument(doc.document_number)}
                            className="font-bold text-[#212634] hover:text-[#555ad5] transition cursor-pointer line-clamp-1"
                          >
                            {doc.title}
                          </div>
                          <div className="text-[11px] text-[#8a90a2] mt-0.5 line-clamp-1">
                            {doc.document_number} &middot; Tujuan: {deptNames}{" "}
                            &middot; {formatDate(doc.created_at)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[#212634]">
                            {doc.applicant_name}
                          </div>
                          <div className="text-[11px] text-[#717684]">
                            {doc.applicant_department}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge
                            status={doc.status}
                            reviewStage={doc.review_stage}
                          />
                        </td>

                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => onSelectDocument(doc.document_number)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0effe] hover:bg-[#e4e2fd] text-[#555ad5] text-xs font-semibold transition cursor-pointer"
                          >
                            <span>Tinjau dokumen</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#e9ebf0] text-xs text-[#717684]">
              <span>
                Menampilkan halaman{" "}
                <strong className="text-[#212634]">{page}</strong> dari{" "}
                <strong className="text-[#212634]">{totalPages}</strong> (total{" "}
                {total} dokumen)
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

        {/* Right Column (~32% width on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Aktivitas terbaru */}
          <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#212634]">
              Aktivitas terbaru
            </h2>
            <div className="space-y-3.5">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-[#717684] italic">
                  Belum ada aktivitas tercatat.
                </p>
              ) : (
                recentActivities.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="text-xs border-b border-[#e9ebf0] pb-3 last:border-0 last:pb-0"
                  >
                    <p className="font-bold text-[#212634]">
                      {item.title || "Aktivitas Dokumen"}
                    </p>
                    <p className="text-[11px] text-[#717684] mt-0.5 line-clamp-2">
                      {item.message ||
                        item.body ||
                        item.document_title ||
                        "Pembaruan aktivitas dokumen"}
                    </p>
                    <p className="text-[10px] text-[#8a90a2] mt-1">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 2: Panduan Alur Checker */}
          <div className="bg-[#f8f9fe] rounded-2xl border border-[#e0e2fa] p-6 space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#555ad5]" />
              <h2 className="text-sm font-bold text-[#212634]">
                Alur persetujuan
              </h2>
            </div>
            <p className="text-xs text-[#717684] leading-relaxed">
              Sebagai Checker, Anda memegang tanggung jawab pemeriksaan tingkat
              pertama:
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#555ad5] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="text-[#212634]">
                  <strong>Verifikasi berkas:</strong> Pastikan dokumen staf
                  lengkap dan sesuai standar.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#555ad5] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="text-[#212634]">
                  <strong>Keputusan:</strong> Setujui &amp; teruskan ke
                  departemen tujuan, atau minta revisi.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#555ad5] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="text-[#212634]">
                  <strong>Multi-departemen:</strong> Seluruh departemen tujuan
                  wajib memberikan persetujuan sebelum dokumen disahkan.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
