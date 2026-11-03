import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { DocumentListItem } from "../../lib/types";
import { StatusBadge } from "../../components/StatusBadge";
import {
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowRight,
} from "lucide-react";

interface MyDocumentsPageProps {
  onNavigate: (path: string) => void;
  onSelectDocument: (id: number) => void;
}

export const MyDocumentsPage: React.FC<MyDocumentsPageProps> = ({
  onNavigate,
  onSelectDocument,
}) => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.documents.getMyDocuments({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit: 10,
      });
      setDocuments(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message || "Gagal memuat daftar dokumen");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments();
  };

  const statusTabs = [
    { label: "Semua", value: "" },
    { label: "Draft", value: "draft" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Canceled", value: "canceled" },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateProgress = (doc: DocumentListItem) => {
    const depts = doc.departments || [];
    const totalDepts = depts.length;
    const approvedDepts = depts.filter((d) => d.decision === "approved").length;

    if (doc.status === "draft") {
      if (doc.review_stage === "checker") {
        return {
          text: "Pemeriksaan atasan",
          percent: 15,
          color: "bg-amber-500",
        };
      }
      return {
        text: "Belum diajukan",
        percent: 0,
        color: "bg-slate-300",
      };
    }

    if (doc.status === "approved") {
      return {
        text: `${totalDepts}/${totalDepts} selesai (100%)`,
        percent: 100,
        color: "bg-emerald-500",
      };
    }

    if (doc.status === "rejected") {
      return {
        text: "Ditolak",
        percent:
          totalDepts > 0 ? Math.round((approvedDepts / totalDepts) * 100) : 0,
        color: "bg-rose-500",
      };
    }

    if (doc.status === "canceled") {
      return {
        text: "Dibatalkan",
        percent: 0,
        color: "bg-slate-400",
      };
    }

    // Pending status
    if (totalDepts === 0) {
      return { text: "Menunggu proses", percent: 0, color: "bg-[#555ad5]" };
    }
    const percent = Math.round((approvedDepts / totalDepts) * 100);
    return {
      text: `${approvedDepts}/${totalDepts} selesai (${percent}%)`,
      percent,
      color: "bg-[#555ad5]",
    };
  };

  // Sort displayed documents in client if needed
  const sortedDocuments = [...documents].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="space-y-6">
      {/* Page Header matching Screenshot 07 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1">
            Workspace / Dokumen Saya
          </span>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
            Dokumen saya
          </h1>
          <p className="text-xs text-[#717684] mt-1">
            Daftar seluruh dokumen yang Anda ajukan dan status persetujuannya.
          </p>
        </div>
        <button
          onClick={() => onNavigate("/create")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat dokumen</span>
        </button>
      </div>

      {/* Main Full-Width Table Card */}
      <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#212634]">Daftar dokumen</h2>
            <p className="text-xs text-[#717684] mt-0.5">
              Pantau status dan langkah berikutnya
            </p>
          </div>
          <span className="text-xs text-[#717684] font-medium">
            {total} dokumen
          </span>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 border-b border-[#e9ebf0] overflow-x-auto pb-px text-xs">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3.5 py-2 font-semibold transition whitespace-nowrap cursor-pointer border-b-2 ${
                  isActive
                    ? "border-[#555ad5] text-[#555ad5]"
                    : "border-transparent text-[#717684] hover:text-[#212634]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 w-full"
          >
            <Search className="w-3.5 h-3.5 text-[#8a90a2] absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau nomor dokumen..."
              className="w-full pl-9 pr-4 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
            />
          </form>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <label className="text-xs text-[#717684] whitespace-nowrap font-medium">
              Urutkan:
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              className="bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl px-3 py-2 text-xs text-[#212634] focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 cursor-pointer"
            >
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-[#717684]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#555ad5] mr-2" />
            <span className="text-xs font-medium">Memuat dokumen...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchDocuments}
              className="mt-3 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-medium cursor-pointer"
            >
              Coba lagi
            </button>
          </div>
        ) : sortedDocuments.length === 0 ? (
          <div className="p-12 text-center text-[#717684]">
            <FileText className="w-10 h-10 mx-auto mb-2 text-[#8a90a2] stroke-1" />
            <p className="font-semibold text-[#212634] text-sm">
              Belum ada dokumen pada kategori ini
            </p>
            <p className="text-xs text-[#717684] mt-1">
              {searchQuery || statusFilter
                ? "Tidak ada dokumen yang cocok dengan filter atau kata kunci pencarian."
                : "Mulai buat pengajuan dokumen baru untuk memulai proses persetujuan."}
            </p>
            {statusFilter && (
              <button
                onClick={() => {
                  setStatusFilter("");
                  setSearchQuery("");
                  setPage(1);
                }}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#f0effe] text-[#555ad5] text-xs font-semibold hover:bg-[#e4e2fd] transition cursor-pointer"
              >
                Tampilkan semua dokumen
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-[#e9ebf0] text-[10px] font-bold uppercase tracking-wider text-[#8a90a2]">
                  <th className="py-3 px-6">Nama dokumen</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Persetujuan</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ebf0]">
                {sortedDocuments.map((doc) => {
                  const progress = calculateProgress(doc);
                  const deptNames =
                    doc.departments && doc.departments.length > 0
                      ? doc.departments.map((d) => d.name || d.code).join(", ")
                      : "Belum ditentukan";

                  return (
                    <tr key={doc.id} className="hover:bg-[#fbfbfc] transition">
                      {/* Nama Dokumen */}
                      <td className="py-3.5 px-6">
                        <div
                          onClick={() => onSelectDocument(doc.id)}
                          className="font-bold text-[#212634] hover:text-[#555ad5] transition cursor-pointer line-clamp-1"
                          title={doc.title}
                        >
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-[#8a90a2] mt-0.5 line-clamp-1">
                          {doc.document_number} &middot; {deptNames} &middot;{" "}
                          {formatDate(doc.created_at)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={doc.status}
                          reviewStage={doc.review_stage}
                        />
                      </td>

                      {/* Persetujuan Progress */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-[11px] font-medium text-[#717684]">
                          {progress.text}
                        </div>
                        <div className="w-28 h-1.5 bg-[#f0f1f5] rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full ${progress.color} transition-all duration-300`}
                            style={{
                              width: `${Math.max(5, progress.percent)}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Aksi Button matching Screenshot */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectDocument(doc.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0effe] hover:bg-[#e4e2fd] text-[#555ad5] text-xs font-semibold transition cursor-pointer"
                        >
                          <span>Lihat dokumen</span>
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

        {/* Pagination Bar */}
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
    </div>
  );
};
