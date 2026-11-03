import React from "react";
import {
  User,
  DashboardStats,
  DocumentListItem,
  NotificationItem,
} from "../../../lib/types";
import { StatusBadge } from "../../../components/StatusBadge";
import {
  FileText,
  Clock,
  CheckSquare,
  FileEdit,
  Plus,
  ArrowUpRight,
  Search,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

export interface AssistantDashboardViewProps {
  user: User | null;
  stats: DashboardStats | null;
  documents: DocumentListItem[];
  totalDocs: number;
  statusTab: string;
  setStatusTab: (tab: string | ((prev: string) => string)) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  recentLogs: NotificationItem[];
  loading: boolean;
  error: string;
  handleSearchSubmit: (e: React.FormEvent) => void;
  onNavigate: (path: string) => void;
  onSelectDocument: (documentNumber: string) => void;
}

import {
  getFirstName,
  formatNumber,
  formatDate,
  formatDateTime,
} from "../../../lib/formatters";

export const AssistantDashboardView: React.FC<AssistantDashboardViewProps> = ({
  user,
  stats,
  documents,
  totalDocs,
  statusTab,
  setStatusTab,
  searchQuery,
  setSearchQuery,
  recentLogs,
  loading,
  error,
  handleSearchSubmit,
  onNavigate,
  onSelectDocument,
}) => {
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
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
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
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
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
            <div className="w-7 h-7 rounded-lg bg-[#f0effe] text-[#555ad5] flex items-center justify-center">
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
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
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
                          onClick={() => onSelectDocument(doc.document_number)}
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
                          onClick={() => onSelectDocument(doc.document_number)}
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
                    onClick={() =>
                      item.document_number &&
                      onSelectDocument(item.document_number)
                    }
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
