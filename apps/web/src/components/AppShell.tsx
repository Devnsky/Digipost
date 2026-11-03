import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth-context";
import { useToast, useConfirm } from "../lib/feedback-context";
import { api } from "../lib/api";
import { DigiPostLogo } from "./DigiPostLogo";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Bell,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Building,
  Menu,
  X,
} from "lucide-react";
import { Modal } from "./Modal";

interface AppShellProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  breadcrumb?: string[];
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentPath,
  onNavigate,
  breadcrumb = ["Workspace", "Dokumen saya"],
}) => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [checkerCount, setCheckerCount] = useState<number>(0);
  const [deptCount, setDeptCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Profile Popover / Dropdown states & hover timer
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleProfileMouseEnter = () => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
      profileTimeoutRef.current = null;
    }
    setIsProfileOpen(true);
  };

  const handleProfileMouseLeave = () => {
    profileTimeoutRef.current = setTimeout(() => {
      setIsProfileOpen(false);
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    setMobileMenuOpen(false);
    const isConfirmed = await confirm({
      title: "Konfirmasi Keluar",
      message:
        "Apakah Anda yakin ingin keluar dari akun DigiPost? Sesi aktif Anda pada perangkat ini akan diakhiri.",
      confirmText: "Ya, Keluar",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!isConfirmed) return;

    toast.info("Anda telah berhasil keluar dari akun.");
    onNavigate("/");
    logout();
  };

  const fetchBadgeCounts = async () => {
    if (typeof document !== "undefined" && document.hidden) {
      return; // Do not fetch in background when tab is hidden or minimized
    }
    try {
      const notifs = await api.notifications.list({ is_read: false, limit: 1 });
      setUnreadNotifCount(notifs.unreadCount);

      const stats = await api.documents.getStats();
      setCheckerCount(stats.checkerQueue);
      setDeptCount(Number(stats.deptDocuments.pending) || 0);
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBadgeCounts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentPath]);

  // Format today's date in Indonesian
  const formattedToday = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userRole = (user?.role || "assistant") as string;
  const isManager = userRole === "dept_manager" || userRole === "checker";

  const roleMetaMap: Record<string, { label: string; badgeClass: string }> = {
    assistant: {
      label: "Assistant",
      badgeClass: "bg-slate-100 text-slate-700 border-[#e2e8f0]",
    },
    checker: {
      label: "Checker",
      badgeClass: "bg-[#f0effe] text-[#555ad5] border-[#dadafa]",
    },
    dept_manager: {
      label: "Dept Manager",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    admin: {
      label: "Admin",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    },
  };
  const roleMeta = roleMetaMap[userRole] || {
    label: userRole,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const navItems = isManager
    ? [
        {
          name: "Dashboard",
          path: "/",
          icon: LayoutDashboard,
          group: "main",
        },
        {
          name: "Dokumen Departemen",
          path: "/department-queue",
          icon: Building2,
          badge:
            deptCount + checkerCount > 0 ? deptCount + checkerCount : undefined,
          group: "main",
        },
        {
          name: "Notifikasi",
          path: "/notifications",
          icon: Bell,
          badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
          group: "main",
        },
        {
          name: "Akun & keamanan",
          path: "/account-security",
          icon: ShieldCheck,
          group: "settings",
        },
      ]
    : [
        {
          name: "Ringkasan",
          path: "/",
          icon: LayoutDashboard,
          group: "main",
        },
        {
          name: "Dokumen saya",
          path: "/documents",
          icon: FileText,
          group: "main",
        },
        {
          name: "Notifikasi",
          path: "/notifications",
          icon: Bell,
          badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
          group: "main",
        },
        {
          name: "Akun & keamanan",
          path: "/account-security",
          icon: ShieldCheck,
          group: "settings",
        },
      ];

  const mainNav = navItems.filter((i) => i.group === "main");
  const settingsNav = navItems.filter((i) => i.group === "settings");

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex text-[#212634]">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-[240px] bg-white border-r border-[#e9ebf0] flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30">
        <div>
          {/* Logo */}
          <div
            className="p-5 pb-3 cursor-pointer"
            onClick={() => onNavigate("/")}
            title="Ke Dashboard"
          >
            <DigiPostLogo />
          </div>

          {/* Internal Workspace Box */}
          <div className="mx-4 mb-5 p-3 rounded-xl border border-[#e9ebf0] bg-white flex items-center gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-[#f0effe] flex items-center justify-center text-[#555ad5] shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#212634] leading-tight">
                Internal Workspace
              </div>
              <div className="text-[10px] text-[#717684] truncate">
                Document management
              </div>
            </div>
          </div>

          {/* Menu Utama */}
          <div className="mb-2">
            <span className="px-5 text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1.5">
              Menu Utama
            </span>
            <div className="space-y-0.5 px-3">
              {mainNav.map((item) => {
                const isActive =
                  currentPath === item.path ||
                  (item.path === "/documents" &&
                    currentPath.startsWith("/documents/"));
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => onNavigate(item.path)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-[#f0effe] text-[#555ad5]"
                        : "text-[#4b5563] hover:bg-[#f7f8fc] hover:text-[#212634]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${isActive ? "text-[#555ad5]" : "text-[#717684]"}`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#e0e7ff] text-[#555ad5]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pengaturan */}
          <div>
            <span className="px-5 text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mt-4 mb-1.5">
              Pengaturan
            </span>
            <div className="space-y-0.5 px-3">
              {settingsNav.map((item) => {
                const isActive = currentPath === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => onNavigate(item.path)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-[#f0effe] text-[#555ad5]"
                        : "text-[#4b5563] hover:bg-[#f7f8fc] hover:text-[#212634]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${isActive ? "text-[#555ad5]" : "text-[#717684]"}`}
                      />
                      <span>{item.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Sidebar: Panduan */}
        <div className="p-3 border-t border-[#e9ebf0]">
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#52568a] hover:text-[#555ad5] hover:bg-[#f0effe] rounded-xl transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#555ad5]" />
            <span>Panduan alur dokumen</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-[240px] flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-[68px] bg-white border-b border-[#e9ebf0] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-[#717684] hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#717684]">
              {breadcrumb.map((crumb, idx) => (
                <React.Fragment key={crumb}>
                  {idx > 0 && <span className="text-[#c2c6d2]">/</span>}
                  <span
                    className={
                      idx === breadcrumb.length - 1
                        ? "font-semibold text-[#212634]"
                        : ""
                    }
                  >
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-xs text-[#717684]">
              {formattedToday}
            </span>
            <button
              onClick={() => onNavigate("/notifications")}
              className="relative p-1.5 text-[#717684] hover:text-[#555ad5] rounded-lg transition"
              title="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>
            {/* Profile Circle & Dropdown Popover */}
            <div
              ref={profileRef}
              className="relative"
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleProfileMouseLeave}
            >
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                aria-label="Informasi profil dan akun"
                title={user?.full_name || "Profil"}
                className={`w-8 h-8 rounded-full bg-[#f0effe] text-[#555ad5] font-bold text-xs flex items-center justify-center border transition cursor-pointer select-none ${
                  isProfileOpen
                    ? "border-[#555ad5] ring-2 ring-[#555ad5]/20 shadow-xs"
                    : "border-[#dadafa] hover:border-[#555ad5]"
                }`}
              >
                {getInitials(user?.full_name)}
              </button>

              {/* Profile Card Popover (appears on hover or click) */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-[#e9ebf0] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseEnter={handleProfileMouseEnter}
                  onMouseLeave={handleProfileMouseLeave}
                >
                  {/* Account Information - moved from bottom left */}
                  <div className="flex items-center justify-between gap-2.5 p-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#f0effe] text-[#555ad5] font-bold text-xs flex items-center justify-center shrink-0 border border-[#dadafa]">
                        {getInitials(user?.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-bold text-[#212634] truncate"
                          title={user?.full_name}
                        >
                          {user?.full_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleMeta.badgeClass}`}
                          >
                            {roleMeta.label}
                          </span>
                          <span
                            className="text-[10px] text-[#717684] truncate"
                            title={
                              user?.department_code ||
                              user?.department_name ||
                              ""
                            }
                          >
                            {user?.department_code ||
                              user?.department_name ||
                              ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions / Navigation */}
                  <div className="pt-2 border-t border-[#f0f2f5] mt-2 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onNavigate("/account-security");
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-[#4b5563] hover:bg-[#f7f8fc] hover:text-[#212634] transition cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#717684]" />
                      <span>Akun & Keamanan</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-8 min-w-0 flex flex-col justify-between">
          <div>{children}</div>

          {/* Footer */}
          <footer className="pt-12 pb-4 text-[11px] text-[#8a90a2] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#e9ebf0] mt-12">
            <div>&copy; 2026 DigiPost &middot; Document Approval Workspace</div>
          </footer>
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white p-4 shadow-xl z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#e9ebf0] mb-3">
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate("/");
                  }}
                  title="Ke Dashboard"
                >
                  <DigiPostLogo />
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-[#717684] hover:text-[#212634]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1">
                {mainNav.concat(settingsNav).map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate(item.path);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                      currentPath === item.path
                        ? "bg-[#f0effe] text-[#555ad5]"
                        : "text-[#4b5563] hover:bg-[#f7f8fc]"
                    }`}
                  >
                    <span>{item.name}</span>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#e0e7ff] text-[#555ad5]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-[#e9ebf0]">
              <div className="flex items-center justify-between gap-2.5 px-2.5 py-2 mb-2 bg-[#f7f8fc] rounded-xl border border-[#e9ebf0]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#f0effe] text-[#555ad5] font-bold text-xs flex items-center justify-center shrink-0">
                    {getInitials(user?.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#212634] truncate">
                      {user?.full_name}
                    </div>
                    <div className="text-[10px] text-[#717684] truncate">
                      {roleMeta.label}
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 rounded-xl hover:bg-rose-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal (screenshot 36) */}
      <Modal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        title=""
        maxWidth="lg"
      >
        <div className="space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7175ad]">
            Panduan Alur Dokumen &middot; DigiPost
          </span>
          <h2 className="text-xl font-bold text-[#212634]">
            Dari draft ke keputusan.
          </h2>
          <p className="text-xs text-[#52568a] leading-relaxed">
            DigiPost menerapkan alur verifikasi dua tingkat: pemeriksaan atasan
            langsung (*Maker-Checker*) dan persetujuan multi-departemen
            (*Agregasi Opsi A*).
          </p>

          <div className="space-y-2.5 pt-2 text-xs text-[#4b5563]">
            <div className="p-3 rounded-xl bg-[#f7f8fc] border border-[#e9ebf0]">
              <strong className="text-[#212634]">01. Susun & Ajukan:</strong>{" "}
              Pemohon membuat draf dokumen, menentukan minimal satu departemen
              tujuan, dan mengunggah berkas. Status berada di `draft/applicant`.
            </div>
            <div className="p-3 rounded-xl bg-[#f7f8fc] border border-[#e9ebf0]">
              <strong className="text-[#212634]">
                02. Pemeriksaan Atasan:
              </strong>{" "}
              Atasan langsung memeriksa dokumen (`draft/checker`). Checker dapat
              menyetujui (meneruskan ke departemen), meminta revisi, atau
              menolak.
            </div>
            <div className="p-3 rounded-xl bg-[#f7f8fc] border border-[#e9ebf0]">
              <strong className="text-[#212634]">
                03. Persetujuan Departemen (Opsi A):
              </strong>{" "}
              Seluruh departemen tujuan harus menyetujui agar dokumen berstatus
              `approved`. Status tetap `pending` sampai seluruh departemen
              memutuskan.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#f0effe] border border-[#dadafa] text-xs text-[#404473]">
            <strong>Aturan Status Final:</strong> Keputusan terakhir mengunci
            status dokumen menjadi terminal (`approved` atau `rejected`). Tidak
            ada revisi atau resubmit dokumen yang telah ditolak.
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={() => setIsGuideModalOpen(false)}
              className="px-5 py-2 bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
