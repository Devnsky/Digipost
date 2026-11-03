import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth-context";
import { LoginPage } from "../features/auth/LoginPage";
import { MustChangePasswordModal } from "../features/auth/MustChangePasswordModal";
import { AppShell } from "../components/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { MyDocumentsPage } from "../features/documents/MyDocumentsPage";
import { CheckerQueuePage } from "../features/documents/CheckerQueuePage";
import { DepartmentQueuePage } from "../features/documents/DepartmentQueuePage";
import { CreateDocumentPage } from "../features/documents/CreateDocumentPage";
import { DocumentDetailPage } from "../features/documents/DocumentDetailPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { AccountSecurityPage } from "../features/account/AccountSecurityPage";
import { RefreshCw, ShieldAlert } from "lucide-react";

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(
    window.location.pathname || "/",
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    () => {
      const match = window.location.pathname.match(/^\/documents\/(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    },
  );

  // Track previous authenticated user ID to reset navigation on login/logout/user-switch
  const prevUserIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (isLoading) return;
    const currentUserId = user ? user.id : null;

    if (prevUserIdRef.current === undefined) {
      // Initial session load / page refresh: keep current URL
      prevUserIdRef.current = currentUserId;
      return;
    }

    if (prevUserIdRef.current !== currentUserId) {
      // User identity changed (logged in, logged out, or switched account):
      // Reset navigation state and URL cleanly to the root dashboard
      window.history.replaceState({}, "", "/");
      setCurrentPath("/");
      setSelectedDocumentId(null);
      prevUserIdRef.current = currentUserId;
    }
  }, [user, isLoading]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      const match = path.match(/^\/documents\/(\d+)$/);
      if (match) {
        setSelectedDocumentId(parseInt(match[1], 10));
      } else {
        setSelectedDocumentId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    const match = path.match(/^\/documents\/(\d+)$/);
    if (match) {
      setSelectedDocumentId(parseInt(match[1], 10));
    } else {
      setSelectedDocumentId(null);
    }
  };

  const openDocumentDetail = (id: number) => {
    setSelectedDocumentId(id);
    navigateTo(`/documents/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#717684]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#555ad5]" />
          <span className="text-xs font-semibold tracking-wide">
            Memuat DigiPost...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAssistant = user?.role === "assistant" || user?.role === "admin";

  const getBreadcrumbs = (): string[] => {
    if (selectedDocumentId) {
      return [
        "Workspace",
        isAssistant ? "Dokumen saya" : "Dokumen Departemen",
        "Detail",
      ];
    }
    switch (currentPath) {
      case "/documents":
        return [
          "Workspace",
          isAssistant ? "Dokumen saya" : "Dokumen Departemen",
        ];
      case "/create":
      case "/documents/create":
        return ["Workspace", "Dokumen saya", "Buat dokumen"];
      case "/checker-queue":
        return ["Pemeriksaan", "Pemeriksaan atasan"];
      case "/department-queue":
        return ["Persetujuan", "Dokumen Departemen"];
      case "/notifications":
        return ["Kotak masuk", "Notifikasi"];
      case "/account-security":
        return ["Pengaturan", "Akun & keamanan"];
      case "/":
      default:
        return ["Workspace", isAssistant ? "Ringkasan" : "Dashboard"];
    }
  };

  const renderContent = () => {
    if (selectedDocumentId) {
      return (
        <DocumentDetailPage
          documentId={selectedDocumentId}
          onBack={() =>
            navigateTo(isAssistant ? "/documents" : "/department-queue")
          }
        />
      );
    }

    const userRole = user?.role || "assistant";
    const canAccessChecker = ["checker", "dept_manager", "admin"].includes(
      userRole,
    );
    const canAccessDept = ["dept_manager", "admin", "checker"].includes(
      userRole,
    );

    const AccessDeniedView = ({
      title,
      message,
    }: {
      title: string;
      message: string;
    }) => (
      <div className="bg-white rounded-2xl border border-[#e9ebf0] p-12 text-center max-w-lg mx-auto mt-12 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#212634] mb-2">{title}</h3>
        <p className="text-xs text-[#717684] leading-relaxed mb-6">{message}</p>
        <button
          onClick={() => navigateTo("/")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );

    switch (currentPath) {
      case "/documents":
        if (!isAssistant) {
          return <DepartmentQueuePage onSelectDocument={openDocumentDetail} />;
        }
        return (
          <MyDocumentsPage
            onNavigate={navigateTo}
            onSelectDocument={openDocumentDetail}
          />
        );
      case "/checker-queue":
        if (!canAccessChecker) {
          return (
            <AccessDeniedView
              title="Akses Ditolak (403 Forbidden)"
              message="Menu Pemeriksaan Atasan hanya dapat diakses oleh pengguna dengan peran Checker, Dept Manager, atau Administrator."
            />
          );
        }
        return <CheckerQueuePage onSelectDocument={openDocumentDetail} />;
      case "/department-queue":
        if (!canAccessDept) {
          return (
            <AccessDeniedView
              title="Akses Ditolak (403 Forbidden)"
              message="Menu Persetujuan Departemen hanya dapat diakses oleh Kepala/Manajer Departemen atau Administrator."
            />
          );
        }
        return <DepartmentQueuePage onSelectDocument={openDocumentDetail} />;
      case "/create":
      case "/documents/create":
        if (!isAssistant) {
          return (
            <AccessDeniedView
              title="Akses Ditolak (403 Forbidden)"
              message="Fitur membuat dan mengajukan dokumen hanya tersedia untuk Assistant. Akun Manager, termasuk ketika bertindak sebagai Checker, tidak memiliki fitur tersebut."
            />
          );
        }
        return (
          <CreateDocumentPage
            onNavigate={navigateTo}
            onSelectDocument={openDocumentDetail}
          />
        );
      case "/notifications":
        return <NotificationsPage onSelectDocument={openDocumentDetail} />;
      case "/account-security":
        return <AccountSecurityPage />;
      case "/":
      default:
        return (
          <DashboardPage
            onNavigate={navigateTo}
            onSelectDocument={openDocumentDetail}
          />
        );
    }
  };

  return (
    <>
      <MustChangePasswordModal />
      <AppShell
        currentPath={currentPath}
        onNavigate={navigateTo}
        breadcrumb={getBreadcrumbs()}
      >
        {renderContent()}
      </AppShell>
    </>
  );
};
