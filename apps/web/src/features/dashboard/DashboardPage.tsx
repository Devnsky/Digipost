import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api";
import {
  DashboardStats,
  DocumentListItem,
  Department,
  NotificationItem,
} from "../../lib/types";
import { RefreshCw } from "lucide-react";
import { ManagerDashboardView } from "./components/ManagerDashboardView";
import { AssistantDashboardView } from "./components/AssistantDashboardView";

interface DashboardPageProps {
  onNavigate: (path: string) => void;
  onSelectDocument: (documentNumber: string) => void;
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
  const [recentLogs, setRecentLogs] = useState<NotificationItem[]>([]);

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

  if (isManager) {
    return (
      <ManagerDashboardView
        user={user}
        stats={stats}
        documents={documents}
        totalDocs={totalDocs}
        totalPages={totalPages}
        page={page}
        setPage={setPage}
        statusTab={statusTab}
        setStatusTab={setStatusTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        applicantDeptId={applicantDeptId}
        setApplicantDeptId={setApplicantDeptId}
        departments={departments}
        loading={loading}
        error={error}
        hasActiveFilters={hasActiveFilters}
        handleSearchSubmit={handleSearchSubmit}
        handleClearFilters={handleClearFilters}
        onSelectDocument={onSelectDocument}
      />
    );
  }

  return (
    <AssistantDashboardView
      user={user}
      stats={stats}
      documents={documents}
      totalDocs={totalDocs}
      statusTab={statusTab}
      setStatusTab={setStatusTab}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      recentLogs={recentLogs}
      loading={loading}
      error={error}
      handleSearchSubmit={handleSearchSubmit}
      onNavigate={onNavigate}
      onSelectDocument={onSelectDocument}
    />
  );
};
