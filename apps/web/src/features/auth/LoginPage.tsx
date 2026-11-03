import React, { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api";
import { AuthLayout } from "../../components/AuthLayout";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI status
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if session was expired from URL
  const isSessionExpired = window.location.search.includes("expired=true");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/");
      }
    } catch (err: any) {
      setError(
        err.message || "Login gagal. Periksa kembali username dan password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setError(err.message || "Gagal memproses permintaan reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword.length < 10) {
      setError("Password baru minimal 10 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resetPassword(resetToken, newPassword);
      setSuccessMessage(res.message);
      setTimeout(() => {
        setMode("login");
        setSuccessMessage(
          "Password berhasil direset. Silakan login dengan password baru.",
        );
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Gagal mereset password.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Forgot Password View (Screenshot 02)
  if (mode === "forgot") {
    return (
      <AuthLayout
        title="Lupa password?"
        subtitle="Masukkan email terdaftar untuk meminta tautan reset."
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#212634] mb-1.5">
              Email terdaftar
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
              className="w-full px-3.5 py-2.5 bg-white border border-[#e9ebf0] rounded-xl text-xs focus:ring-2 focus:ring-[#555ad5] focus:outline-none text-[#212634]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#555ad5] hover:bg-[#484ec7] text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Mengirim..." : "Kirim tautan reset"}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccessMessage("");
              }}
              className="text-xs text-[#555ad5] hover:underline cursor-pointer"
            >
              Kembali ke login
            </button>
          </div>

          {/* Notice box matching screenshot 02 */}
          <div className="mt-6 p-3.5 rounded-xl bg-[#f3f4fd] border border-[#e9ebf0] text-xs text-[#52568a] leading-relaxed">
            Token reset berlaku 30 menit dan hanya sekali pakai. Permintaan baru
            membatalkan tautan sebelumnya.
          </div>
        </form>
      </AuthLayout>
    );
  }

  // 2. Reset Password Token View (Screenshot 04)
  if (mode === "reset") {
    return (
      <AuthLayout
        title="Reset password"
        subtitle="Gunakan password baru untuk mengamankan akun Anda."
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#212634] mb-1.5">
              Token reset
            </label>
            <input
              type="text"
              required
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Masukkan token reset dari email"
              className="w-full px-3.5 py-2.5 bg-white border border-[#e9ebf0] rounded-xl text-xs focus:ring-2 focus:ring-[#555ad5] focus:outline-none text-[#212634] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#212634] mb-1.5">
              Password baru
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan password baru"
              className="w-full px-3.5 py-2.5 bg-white border border-[#e9ebf0] rounded-xl text-xs focus:ring-2 focus:ring-[#555ad5] focus:outline-none text-[#212634]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#212634] mb-1.5">
              Konfirmasi password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="w-full px-3.5 py-2.5 bg-white border border-[#e9ebf0] rounded-xl text-xs focus:ring-2 focus:ring-[#555ad5] focus:outline-none text-[#212634]"
            />
            <p className="text-[11px] text-[#717684] mt-1">
              Minimal 10 karakter, kombinasi huruf dan angka.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#555ad5] hover:bg-[#484ec7] text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Menyimpan..." : "Simpan password"}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="text-xs text-[#555ad5] hover:underline cursor-pointer"
            >
              Kembali ke login
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  // 3. Login Utama View (Screenshots 01 & 05)
  return (
    <AuthLayout
      title="Selamat datang kembali."
      subtitle="Masuk untuk mengelola persetujuan dokumen."
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Session expired notice matching screenshot 05 */}
        {isSessionExpired && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Sesi Anda telah kedaluwarsa atau dicabut. Silakan masuk kembali
              untuk melanjutkan.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#212634] mb-1.5">
            Username
          </label>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Masukkan username"
            className="w-full px-3.5 py-2.5 bg-white border border-[#e9ebf0] rounded-xl text-xs focus:ring-2 focus:ring-[#555ad5] focus:outline-none text-[#212634]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#212634] mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password"
            className="w-full px-3.5 py-2.5 bg-white border border-[#e9ebf0] rounded-xl text-xs focus:ring-2 focus:ring-[#555ad5] focus:outline-none text-[#212634]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#555ad5] hover:bg-[#484ec7] text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setError("");
            }}
            className="text-xs text-[#555ad5] hover:underline cursor-pointer"
          >
            Lupa password?
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("reset");
              setError("");
            }}
            className="text-[11px] text-[#717684] hover:text-[#212634]"
          >
            Punya token reset?
          </button>
        </div>

        {/* Notice box matching screenshot 01 */}
        <div className="mt-6 p-3.5 rounded-xl bg-[#f3f4fd] border border-[#e9ebf0] text-xs text-[#52568a] leading-relaxed">
          Akun disediakan administrator. Tidak ada registrasi mandiri.
        </div>
      </form>
    </AuthLayout>
  );
};
