import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import {
  FileText,
  LayoutDashboard,
  FolderClosed,
  Inbox,
  Building2,
  PlusCircle,
  Bell,
  LogOut,
  KeyRound,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Modal } from "./Modal";

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentPath,
  onNavigate,
}) => {
  const { user, logout } = useAuth();
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [checkerCount, setCheckerCount] = useState<number>(0);
  const [deptCount, setDeptCount] = useState<number>(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Self change password states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchBadgeCounts = async () => {
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
    return () => clearInterval(interval);
  }, [currentPath]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 10) {
      setPasswordError("Password baru minimal 10 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok.");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.auth.changePassword(oldPassword, newPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || "Gagal mengubah password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Dokumen Saya",
      path: "/documents",
      icon: FolderClosed,
    },
    {
      name: "Antrean Checker",
      path: "/checker-queue",
      icon: Inbox,
      badge: checkerCount > 0 ? checkerCount : undefined,
      badgeColor: "bg-amber-500 text-white",
      roles: ["checker", "dept_manager", "admin"],
    },
    {
      name: "Dokumen Departemen",
      path: "/department-queue",
      icon: Building2,
      badge: deptCount > 0 ? deptCount : undefined,
      badgeColor: "bg-blue-600 text-white",
      roles: ["dept_manager", "admin"],
    },
    {
      name: "Buat Pengajuan",
      path: "/create",
      icon: PlusCircle,
      highlight: true,
    },
    {
      name: "Notifikasi",
      path: "/notifications",
      icon: Bell,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
      badgeColor: "bg-rose-500 text-white",
    },
  ].filter((item) => {
    if (!item.roles) return true;
    const userRole = user?.role || "assistant";
    return item.roles.includes(userRole) || userRole === "admin";
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onNavigate("/")}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                  DigiPost
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 border-l border-slate-200 pl-2">
                  Persetujuan Dokumen
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              onClick={() => onNavigate("/notifications")}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  {user?.full_name?.charAt(0) || "U"}
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-semibold text-slate-800 line-clamp-1">
                    {user?.full_name}
                  </div>
                  <div className="text-slate-500 text-[11px] line-clamp-1">
                    {user?.department_name ? `${user.department_name} • ` : ""}
                    {user?.role || "Pengguna"}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 z-20 text-xs">
                    <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                      <div className="font-semibold text-slate-800">
                        {user?.full_name}
                      </div>
                      <div className="text-slate-500">{user?.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsChangePasswordModalOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      Ganti Password
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      Keluar (Logout)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="sticky top-24 space-y-1.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : item.highlight
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-indigo-600" : ""}`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        item.badgeColor || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 bg-white p-4 shadow-xl z-10 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-3">
                <span className="font-bold text-slate-800">Menu Navigasi</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1 flex-1">
                {navItems.map((item) => {
                  const isActive = currentPath === item.path;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigate(item.path);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        title="Ganti Password Akun"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordSuccess ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
              Password berhasil diubah. Memperbarui sesi...
            </div>
          ) : (
            <>
              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password Lama
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password Baru (Min. 10 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {passwordLoading ? "Menyimpan..." : "Perbarui Password"}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
