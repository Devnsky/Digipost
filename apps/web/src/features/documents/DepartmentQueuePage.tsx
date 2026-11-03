import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { DocumentListItem, DashboardStats, Department } from "../../lib/types";
import { formatNumber, formatDate } from "../../lib/formatters";
import { StatusBadge } from "../../components/StatusBadge";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  FileText,
  ArrowRight,
  AlertTriangle,
  FileEdit,
  Ban,
  X,
} from "lucide-react";

interface DepartmentQueuePageProps {
  onSelectDocument: (id: number) => void;
}

export const DepartmentQueuePage: React.FC<DepartmentQueuePageProps> = ({
  onSelectDocument,
}) => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applicantDeptId, setApplicantDeptId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, statsRes] = await Promise.all([
        api.documents.getDepartmentQueue({
          status: statusFilter || undefined,
          search: searchQuery || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          applicant_department_id: applicantDeptId
            ? Number(applicantDeptId)
            : undefined,
          page,
          limit: 10,
        }),
        api.documents.getStats(),
      ]);
      setDocuments(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setStats(statsRes);

      if (departments.length === 0) {
        try {
          const depts = await api.departments.list();
          setDepartments(depts);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat dokumen departemen");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    statusFilter,
    searchQuery,
    dateFrom,
    dateTo,
    applicantDeptId,
    departments.length,
  ]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQueue();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setApplicantDeptId("");
    setStatusFilter("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery || dateFrom || dateTo || applicantDeptId || statusFilter,
  );

  const statusTabs = [
    { label: "Semua", value: "" },
    { label: "Draft (Checker)", value: "draft" },
    { label: "Menunggu Keputusan", value: "pending" },
    { label: "Disetujui", value: "approved" },
    { label: "Ditolak", value: "rejected" },
    { label: "Dibatalkan", value: "canceled" },
  ];

  const mgr = stats?.managerStats || {
    draft: 0,
    pending: Number(stats?.deptDocuments?.pending) || 0,
    approved: Number(stats?.deptDocuments?.approved) || 0,
    rejected: Number(stats?.deptDocuments?.rejected) || 0,
    canceled: 0,
    total: Number(stats?.deptDocuments?.total) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1">
            Persetujuan &amp; Evaluasi
          </span>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
            Dokumen Departemen
          </h1>
          <p className="text-xs text-[#717684] mt-1">
            Daftar seluruh dokumen pengajuan yang relevan dengan kewenangan
            pemeriksaan atasan (Checker) dan persetujuan departemen Anda.
          </p>
        </div>
      </div>

      {/* 5 Stat Cards in a row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: DRAFT (Checker) */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "draft" ? "" : "draft");
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
            statusFilter === "draft"
              ? "bg-[#f0effe] border-[#555ad5] ring-2 ring-[#555ad5]/20"
              : "bg-white border-[#e9ebf0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
              Draft (Checker)
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileEdit className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#212634]">
              {formatNumber(mgr.draft)}
            </div>
            <div className="text-[10px] text-[#8a90a2] mt-0.5">
              Pemeriksaan bawahan
            </div>
          </div>
        </div>

        {/* Card 2: Perlu Keputusan (Pending) */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "pending" ? "" : "pending");
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
            statusFilter === "pending"
              ? "bg-[#eff6ff] border-blue-500 ring-2 ring-blue-500/20"
              : "bg-white border-[#e9ebf0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
              Pending
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#212634]">
              {formatNumber(mgr.pending)}
            </div>
            <div className="text-[10px] text-[#8a90a2] mt-0.5">
              Menunggu persetujuan
            </div>
          </div>
        </div>

        {/* Card 3: Disetujui (Approved) */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "approved" ? "" : "approved");
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
            statusFilter === "approved"
              ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-white border-[#e9ebf0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
              Disetujui
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#212634]">
              {formatNumber(mgr.approved)}
            </div>
            <div className="text-[10px] text-[#8a90a2] mt-0.5">
              Disetujui departemen
            </div>
          </div>
        </div>

        {/* Card 4: Ditolak (Rejected) */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "rejected" ? "" : "rejected");
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
            statusFilter === "rejected"
              ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-white border-[#e9ebf0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
              Ditolak
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#212634]">
              {formatNumber(mgr.rejected)}
            </div>
            <div className="text-[10px] text-[#8a90a2] mt-0.5">
              Ditolak (Terminal Opsi A)
            </div>
          </div>
        </div>

        {/* Card 5: Dibatalkan (Canceled) */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "canceled" ? "" : "canceled");
            setPage(1);
          }}
          className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
            statusFilter === "canceled"
              ? "bg-slate-100 border-slate-400 ring-2 ring-slate-400/20"
              : "bg-white border-[#e9ebf0] hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
              Dibatalkan
            </span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Ban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-[#212634]">
              {formatNumber(mgr.canceled)}
            </div>
            <div className="text-[10px] text-[#8a90a2] mt-0.5">
              Dibatalkan pemohon
            </div>
          </div>
        </div>
      </div>

      {/* Main Full-Width Table Card */}
      <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#212634]">
              {statusFilter === "draft"
                ? "Antrean Pemeriksaan Draft (Checker)"
                : "Daftar Dokumen Departemen"}
            </h2>
            <p className="text-xs text-[#717684] mt-0.5">
              Tinjau dokumen dan berikan keputusan resmi atas nama divisi Anda
            </p>
          </div>
          <span className="text-xs text-[#717684] font-medium">
            {total} dokumen
          </span>
        </div>

        {/* Filters Bar: Search, Date From & To, Applicant Department */}
        <div className="pt-1 pb-2 border-b border-[#f0f2f5] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <form
              onSubmit={handleSearchSubmit}
              className="md:col-span-4 relative"
            >
              <Search className="w-3.5 h-3.5 text-[#8a90a2] absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau nomor dokumen..."
                className="w-full pl-9 pr-3 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
              />
            </form>

            <div className="md:col-span-4 flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                title="Tanggal mulai"
                className="w-full px-2.5 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-[11px] text-[#212634] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
              />
              <span className="text-xs text-[#8a90a2]">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                title="Tanggal akhir"
                className="w-full px-2.5 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-[11px] text-[#212634] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={applicantDeptId}
                onChange={(e) => {
                  setApplicantDeptId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition cursor-pointer"
              >
                <option value="">Departemen Pemohon (Semua)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.code} - {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <div className="md:col-span-1 flex items-center justify-end">
                <button
                  onClick={handleClearFilters}
                  title="Reset Filter"
                  className="p-2 text-[#717684] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer flex items-center justify-center w-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer text-xs ${
                    isActive
                      ? "bg-[#555ad5] text-white shadow-xs"
                      : "text-[#717684] hover:bg-slate-100 hover:text-[#212634]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-[#717684]">
            <RefreshCw className="w-5 h-5 animate-spin text-[#555ad5] mr-2" />
            <span className="text-xs font-medium">
              Memuat antrean departemen...
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
            <FileText className="w-10 h-10 mx-auto mb-2 text-[#8a90a2] stroke-1" />
            <p className="font-semibold text-[#212634] text-sm">
              Tidak ada dokumen pada antrean
            </p>
            <p className="text-xs text-[#717684] mt-1">
              {hasActiveFilters
                ? "Tidak ada dokumen yang cocok dengan filter atau kata kunci pencarian."
                : "Belum ada dokumen yang masuk ke antrean kewenangan Anda."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-3 px-3 py-1.5 text-xs font-medium text-[#555ad5] bg-[#f0effe] rounded-lg hover:bg-[#e4e2fd] transition cursor-pointer"
              >
                Reset filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[#e9ebf0] text-[10px] font-bold uppercase tracking-wider text-[#8a90a2]">
                  <th className="py-3 px-6">Nama dokumen</th>
                  <th className="py-3 px-4">Pemohon &amp; asal</th>
                  <th className="py-3 px-4">Status keputusan</th>
                  <th className="py-3 px-4">Agregasi Opsi A</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ebf0]">
                {documents.map((doc) => {
                  const depts = doc.departments || [];
                  const approvedCount = depts.filter(
                    (d) => d.decision === "approved",
                  ).length;
                  const totalDepts = depts.length;
                  const percent =
                    totalDepts > 0
                      ? Math.round((approvedCount / totalDepts) * 100)
                      : 0;

                  return (
                    <tr key={doc.id} className="hover:bg-[#fbfbfc] transition">
                      <td className="py-3.5 px-6">
                        <div
                          onClick={() => onSelectDocument(doc.id)}
                          className="font-bold text-[#212634] hover:text-[#555ad5] transition cursor-pointer line-clamp-1"
                        >
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-[#8a90a2] mt-0.5">
                          {doc.document_number} &middot;{" "}
                          {formatDate(doc.created_at)}
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

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {doc.status === "draft" ? (
                          <span className="text-[11px] text-amber-700 font-medium">
                            Tahap Checker
                          </span>
                        ) : (
                          <>
                            <div className="text-[11px] font-medium text-[#717684]">
                              {approvedCount}/{totalDepts} disetujui ({percent}
                              %)
                            </div>
                            <div className="w-24 h-1.5 bg-[#f0f1f5] rounded-full overflow-hidden mt-1.5">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  doc.status === "approved"
                                    ? "bg-emerald-500"
                                    : doc.status === "rejected"
                                      ? "bg-rose-500"
                                      : "bg-[#555ad5]"
                                }`}
                                style={{ width: `${Math.max(5, percent)}%` }}
                              />
                            </div>
                          </>
                        )}
                      </td>

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
