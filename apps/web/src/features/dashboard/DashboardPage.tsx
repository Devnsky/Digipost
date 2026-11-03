import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api";
import {
  DashboardStats,
  DocumentListItem,
  Department,
} from "../../lib/types";
import { StatusBadge } from "../../components/StatusBadge";
import {
  FileText,
  Clock,
  CheckSquare,
  FileEdit,
  Plus,
  ArrowUpRight,
  Search,
  RefreshCw,
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
} from "lucide-react";

interface DashboardPageProps {
  onNavigate: (path: string) => void;
  onSelectDocument: (id: number) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectDocument,
}) => {
  const { user } = useAuth();
  const isManager = user?.role === "dept_manager" || user?.role === "checker";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [totalDocs, setTotalDocs] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // Filter states
  const [statusTab, setStatusTab] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applicantDeptId, setApplicantDeptId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isManager) {
        const [statsRes, queueRes] = await Promise.all([
          api.documents.getStats(),
          api.documents.getDepartmentQueue({
            status: statusTab || undefined,
            search: searchQuery || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            applicant_department_id: applicantDeptId
              ? Number(applicantDeptId)
              : undefined,
            page,
            limit: 10,
          }),
        ]);
        setStats(statsRes);
        setDocuments(queueRes.items);
        setTotalDocs(queueRes.total);
        setTotalPages(queueRes.totalPages);

        if (departments.length === 0) {
          try {
            const depts = await api.departments.list();
            setDepartments(depts);
          } catch {
            // non-fatal
          }
        }
      } else {
        const [statsRes, docsRes, notifsRes] = await Promise.all([
          api.documents.getStats(),
          api.documents.getMyDocuments({
            status: statusTab || undefined,
            search: searchQuery || undefined,
            limit: 10,
          }),
          api.notifications.list({ limit: 5 }),
        ]);
        setStats(statsRes);
        setDocuments(docsRes.items);
        setTotalDocs(docsRes.total);
        setRecentLogs(notifsRes.items);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data ringkasan");
    } finally {
      setLoading(false);
    }
  }, [
    isManager,
    statusTab,
    searchQuery,
    dateFrom,
    dateTo,
    applicantDeptId,
    page,
    departments.length,
  ]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadDashboardData();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setApplicantDeptId("");
    setStatusTab("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery || dateFrom || dateTo || applicantDeptId || statusTab,
  );

  const getFirstName = (fullName?: string) => {
    if (!fullName) return "";
    return fullName.split(" ")[0];
  };

  const formatNumber = (num: string | number | undefined) => {
    const val = Number(num) || 0;
    return val < 10 ? `0${val}` : `${val}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-[#717684]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#555ad5]" />
          <p className="text-xs font-semibold">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // MANAGER VIEW (Wireframe WIREFRAME(manager).drawio.xml)
  // 5 Status Cards: DRAFT, PENDING, APPROVED, REJECTED, CANCELED
  // Filter by document ID, date, department
  // Columns: Document ID, Date Published, Applicant Dept, Applicant Name, Status, Action
  // STRICTLY NO "Buat Dokumen" anywhere
  // ===========================================================================
  if (isManager) {
    const mgr = stats?.managerStats || {
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      canceled: 0,
      total: 0,
    };

    const statusTabsList = [
      { label: "Semua", value: "" },
      { label: "Draft (Checker)", value: "draft" },
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Canceled", value: "canceled" },
    ];

    return (
      <div className="space-y-6">
        {/* Header - Wireframe Role = Manager: Title DASHBOARD, No Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1">
              Workspace / Dashboard
            </span>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-[#717684] mt-1">
              Selamat datang, {user?.full_name}. Pantau dan evaluasi dokumen
              departemen Anda serta antrean pemeriksaan atasan.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* 5 Status Cards matching WIREFRAME(manager) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: DRAFT */}
          <div
            onClick={() => {
              setStatusTab(statusTab === "draft" ? "" : "draft");
              setPage(1);
            }}
            className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
              statusTab === "draft"
                ? "bg-[#f0effe] border-[#555ad5] ring-2 ring-[#555ad5]/20"
                : "bg-white border-[#e9ebf0] hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
                Draft
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileEdit className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#212634]">
                {formatNumber(mgr.draft)}
              </div>
              <div className="text-[10px] text-[#8a90a2] mt-0.5">
                Pemeriksaan Checker
              </div>
            </div>
          </div>

          {/* Card 2: PENDING */}
          <div
            onClick={() => {
              setStatusTab(statusTab === "pending" ? "" : "pending");
              setPage(1);
            }}
            className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
              statusTab === "pending"
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
              <div className="text-2xl sm:text-3xl font-extrabold text-[#212634]">
                {formatNumber(mgr.pending)}
              </div>
              <div className="text-[10px] text-[#8a90a2] mt-0.5">
                Menunggu persetujuan
              </div>
            </div>
          </div>

          {/* Card 3: APPROVED */}
          <div
            onClick={() => {
              setStatusTab(statusTab === "approved" ? "" : "approved");
              setPage(1);
            }}
            className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
              statusTab === "approved"
                ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                : "bg-white border-[#e9ebf0] hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
                Approved
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#212634]">
                {formatNumber(mgr.approved)}
              </div>
              <div className="text-[10px] text-[#8a90a2] mt-0.5">
                Disetujui departemen
              </div>
            </div>
          </div>

          {/* Card 4: REJECTED */}
          <div
            onClick={() => {
              setStatusTab(statusTab === "rejected" ? "" : "rejected");
              setPage(1);
            }}
            className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
              statusTab === "rejected"
                ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20"
                : "bg-white border-[#e9ebf0] hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
                Rejected
              </span>
              <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#212634]">
                {formatNumber(mgr.rejected)}
              </div>
              <div className="text-[10px] text-[#8a90a2] mt-0.5">
                Ditolak departemen
              </div>
            </div>
          </div>

          {/* Card 5: CANCELED */}
          <div
            onClick={() => {
              setStatusTab(statusTab === "canceled" ? "" : "canceled");
              setPage(1);
            }}
            className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer flex flex-col justify-between ${
              statusTab === "canceled"
                ? "bg-slate-100 border-slate-400 ring-2 ring-slate-400/20"
                : "bg-white border-[#e9ebf0] hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#717684]">
                Canceled
              </span>
              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <Ban className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#212634]">
                {formatNumber(mgr.canceled)}
              </div>
              <div className="text-[10px] text-[#8a90a2] mt-0.5">
                Dibatalkan pemohon
              </div>
            </div>
          </div>
        </div>

        {/* Main Document Table Section */}
        <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
          {/* Header Title matching wireframe: All Latest Documents intended for my Dept. */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#212634]">
                {statusTab === "draft"
                  ? "Antrean Pemeriksaan Draft (Checker)"
                  : "All Latest Documents intended for my Dept."}
              </h2>
              <p className="text-xs text-[#717684] mt-0.5">
                {statusTab === "draft"
                  ? "Draft bawahan langsung yang memerlukan pemeriksaan sebelum diteruskan ke departemen."
                  : "Daftar dokumen masuk dari berbagai departemen yang relevan dengan kewenangan Anda."}
              </p>
            </div>
            <span className="text-xs text-[#717684] font-medium shrink-0">
              {totalDocs} dokumen ditemukan
            </span>
          </div>

          {/* Filter Bar matching wireframe: Search by Document ID, Filter by Date, Filter by Department */}
          <div className="pt-1 pb-2 border-b border-[#f0f2f5] space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              {/* Search by Document ID / Name */}
              <form
                onSubmit={handleSearchSubmit}
                className="md:col-span-4 relative"
              >
                <Search className="w-3.5 h-3.5 text-[#8a90a2] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Document ID..."
                  className="w-full pl-9 pr-3 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
                />
              </form>

              {/* Filter by Date: From and To */}
              <div className="md:col-span-4 flex items-center gap-1.5">
                <div className="relative flex-1">
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
                </div>
                <span className="text-xs text-[#8a90a2]">-</span>
                <div className="relative flex-1">
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
              </div>

              {/* Filter by Department */}
              <div className="md:col-span-3">
                <select
                  value={applicantDeptId}
                  onChange={(e) => {
                    setApplicantDeptId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition cursor-pointer"
                >
                  <option value="">Filter by Department (Semua)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters button if active */}
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
              {statusTabsList.map((tab) => {
                const isActive = statusTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setStatusTab(tab.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer text-xs ${
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

          {/* Table Content matching wireframe columns:
              document ID | date published | Applicant Dept. | Applicant Name | document status | view */}
          {loading ? (
            <div className="flex items-center justify-center p-12 text-[#717684]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#555ad5] mr-2" />
              <span className="text-xs font-medium">Memuat data dokumen...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center text-[#717684]">
              <FileText className="w-10 h-10 mx-auto mb-2 text-[#8a90a2] stroke-1" />
              <p className="font-semibold text-[#212634] text-sm">
                Tidak ada dokumen ditemukan
              </p>
              <p className="text-xs text-[#717684] mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Tidak ada dokumen yang cocok dengan filter atau kata kunci pencarian Anda."
                  : "Belum ada dokumen yang memerlukan perhatian Anda saat ini."}
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
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#e9ebf0] text-[10px] font-bold uppercase tracking-wider text-[#8a90a2]">
                    <th className="py-3 px-6">Document ID</th>
                    <th className="py-3 px-4">Date Published</th>
                    <th className="py-3 px-4">Applicant Dept.</th>
                    <th className="py-3 px-4">Applicant Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9ebf0]">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-[#fbfbfc] transition group"
                    >
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div
                          onClick={() => onSelectDocument(doc.id)}
                          className="font-bold text-[#212634] hover:text-[#555ad5] transition cursor-pointer"
                        >
                          {doc.document_number}
                        </div>
                        <div className="text-[11px] text-[#717684] truncate max-w-[240px]">
                          {doc.title}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-[#717684]">
                        {formatDate(doc.created_at)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {doc.applicant_department}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#212634]">
                        {doc.applicant_name}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={doc.status}
                          reviewStage={doc.review_stage}
                        />
                      </td>

                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectDocument(doc.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#f0effe] hover:bg-[#e4e2fd] text-[#555ad5] text-xs font-semibold transition cursor-pointer"
                        >
                          <span>Lihat</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
                {totalDocs} dokumen)
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
  }

  // ===========================================================================
  // ASSISTANT VIEW (Screenshot 06 / WIREFRAME(assistant))
  // Retains "Dokumen Saya", "Buat Dokumen", 4 Stat Cards, and Alur Persetujuan
  // ===========================================================================
  const my = stats?.myDocuments || {
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    canceled: 0,
  };
  const actionNeeded = Number(my.draft) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1">
            Workspace / Dokumen Saya
          </span>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
            Selamat datang, {getFirstName(user?.full_name)}.
          </h1>
          <p className="text-xs text-[#717684] mt-1">
            Kelola pengajuan dan pantau persetujuan dokumen Anda.
          </p>
        </div>
        <button
          onClick={() => onNavigate("/documents/create")}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat dokumen</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* 4 Stat Cards in a row for Assistant */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Dokumen */}
        <div className="bg-white p-5 rounded-2xl border border-[#e9ebf0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-[#717684]">
              Total dokumen
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#f0effe] text-[#555ad5] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#212634]">
              {formatNumber(my.total)}
            </div>
            <div className="text-[11px] text-[#8a90a2] mt-1">
              Dalam ruang kerja Anda
            </div>
          </div>
        </div>

        {/* Card 2: Perlu Tindakan */}
        <div className="bg-white p-5 rounded-2xl border border-[#e9ebf0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-[#717684]">
              Perlu tindakan
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#fef3c7] text-[#b45309] flex items-center justify-center">
              <FileEdit className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#212634]">
              {formatNumber(actionNeeded)}
            </div>
            <div className="text-[11px] text-[#8a90a2] mt-1">
              Draft &amp; permintaan revisi
            </div>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-white p-5 rounded-2xl border border-[#e9ebf0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-[#717684]">Pending</span>
            <div className="w-7 h-7 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#212634]">
              {formatNumber(my.pending)}
            </div>
            <div className="text-[11px] text-[#8a90a2] mt-1">
              Dalam persetujuan departemen
            </div>
          </div>
        </div>

        {/* Card 4: Approved */}
        <div className="bg-white p-5 rounded-2xl border border-[#e9ebf0] shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-[#717684]">Approved</span>
            <div className="w-7 h-7 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-[#212634]">
              {formatNumber(my.approved)}
            </div>
            <div className="text-[11px] text-[#8a90a2] mt-1">
              Seluruh departemen menyetujui
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Daftar Dokumen Card */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#212634]">
                Daftar dokumen
              </h2>
              <p className="text-xs text-[#717684] mt-0.5">
                Pantau status dan langkah berikutnya
              </p>
            </div>
            <span className="text-xs text-[#717684] font-medium">
              {totalDocs} dokumen
            </span>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 border-b border-[#e9ebf0] overflow-x-auto pb-px text-xs">
            {[
              { label: "Semua", value: "" },
              { label: "Draft", value: "draft" },
              { label: "Pending", value: "pending" },
              { label: "Approved", value: "approved" },
              { label: "Rejected", value: "rejected" },
              { label: "Canceled", value: "canceled" },
            ].map((tab) => {
              const isActive = statusTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusTab(tab.value)}
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

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#8a90a2] absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau nomor dokumen..."
              className="w-full pl-9 pr-4 py-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
            />
          </form>

          {/* Table Content */}
          {loading ? (
            <div className="flex items-center justify-center p-8 text-[#717684]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#555ad5] mr-2" />
              <span className="text-xs font-medium">Memuat dokumen...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-[#717684]">
              <FileText className="w-8 h-8 mx-auto mb-2 text-[#8a90a2] stroke-1" />
              <p className="font-semibold text-[#212634] text-xs">
                Tidak ada dokumen
              </p>
              <p className="text-[11px] text-[#717684] mt-0.5">
                {searchQuery || statusTab
                  ? "Tidak ada dokumen yang cocok dengan filter."
                  : "Mulai buat dokumen baru untuk memulai proses persetujuan."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-[#e9ebf0] text-[10px] font-bold uppercase tracking-wider text-[#8a90a2]">
                    <th className="py-2.5 px-6">Nama dokumen</th>
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9ebf0]">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-[#fbfbfc] transition group"
                    >
                      <td className="py-3 px-6">
                        <div
                          onClick={() => onSelectDocument(doc.id)}
                          className="font-semibold text-[#212634] group-hover:text-[#555ad5] transition cursor-pointer line-clamp-1"
                        >
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-[#8a90a2] mt-0.5">
                          {doc.document_number} &middot;{" "}
                          {doc.applicant_department}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#717684] whitespace-nowrap">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={doc.status}
                          reviewStage={doc.review_stage}
                        />
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectDocument(doc.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f0effe] hover:bg-[#e4e2fd] text-[#555ad5] text-xs font-semibold transition cursor-pointer"
                        >
                          <span>Lihat</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2 text-[11px] text-[#8a90a2]">
            Klik dokumen untuk melihat detail dan tindakan yang tersedia.
          </div>
        </div>

        {/* Right Column: Aktivitas Terbaru & Panduan */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-[#e9ebf0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#212634]">
                Aktivitas terbaru
              </h2>
              <button
                onClick={() => onNavigate("/notifications")}
                className="text-[#8a90a2] hover:text-[#555ad5] transition"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-[#8a90a2] italic">
                Belum ada aktivitas.
              </p>
            ) : (
              <div className="space-y-3.5">
                {recentLogs.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectDocument(item.document_id)}
                    className="flex items-start gap-2.5 text-xs cursor-pointer group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#555ad5] shrink-0 mt-1.5" />
                    <div className="min-w-0">
                      <div className="font-semibold text-[#212634] group-hover:text-[#555ad5] transition truncate">
                        {item.title || "Pemberitahuan Dokumen"}
                      </div>
                      <div className="text-[11px] text-[#717684] line-clamp-1 mt-0.5">
                        {item.message ||
                          item.document_title ||
                          "Pembaruan aktivitas dokumen"}
                      </div>
                      <div className="text-[10px] text-[#8a90a2] mt-0.5">
                        {formatDateTime(item.created_at)} &middot;{" "}
                        <span className="text-[#555ad5] font-medium">
                          Lihat detail
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#f3f4fd] rounded-2xl border border-[#e4e6fb] p-5 shadow-xs space-y-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7175ad] block mb-1">
                Alur Persetujuan
              </span>
              <h3 className="text-sm font-bold text-[#212634]">
                Dari draft ke keputusan.
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-[#555ad5] font-bold text-[11px] shrink-0">
                  01
                </span>
                <div>
                  <strong className="text-[#212634] block">
                    Susun &amp; ajukan
                  </strong>
                  <span className="text-[#5a5e8c] text-[11px]">
                    Assistant menyiapkan dokumen.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#555ad5] font-bold text-[11px] shrink-0">
                  02
                </span>
                <div>
                  <strong className="text-[#212634] block">
                    Pemeriksaan atasan
                  </strong>
                  <span className="text-[#5a5e8c] text-[11px]">
                    Checker meninjau dan meneruskan.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-[#555ad5] font-bold text-[11px] shrink-0">
                  03
                </span>
                <div>
                  <strong className="text-[#212634] block">
                    Keputusan departemen
                  </strong>
                  <span className="text-[#5a5e8c] text-[11px]">
                    Seluruh departemen memberi keputusan.
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#7175ad] leading-relaxed pt-2 border-t border-[#e2e4f7]">
              Status akhir ditetapkan setelah seluruh departemen memutuskan.
              Tidak ada batas waktu persetujuan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
