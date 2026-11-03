import React, { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { AuthLayout } from "../../components/AuthLayout";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const MustChangePasswordModal: React.FC = () => {
  const { user, changePassword, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user || !user.must_change_password) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 10) {
      setError("Password baru minimal 10 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (newPassword === oldPassword) {
      setError("Password baru harus berbeda dari password lama.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Gagal mengubah password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <AuthLayout
        title="Atur password pertama"
        subtitle="Gunakan password baru untuk mengamankan akun Anda."
      >
        {success ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-bold">Password Berhasil Diperbarui!</p>
            <p>
              Sesi Anda telah dicabut untuk keamanan. Mengalihkan ke halaman
              masuk...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#212634] mb-1.5">
                Password saat ini
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e9ebf0] rounded-xl text-xs focus:ring-2 focus:ring-[#555ad5] focus:outline-none text-[#212634]"
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
                onClick={logout}
                className="text-xs text-[#555ad5] hover:underline cursor-pointer"
              >
                Kembali ke login
              </button>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-[#f3f4fd] border border-[#e9ebf0] text-xs text-[#52568a] leading-relaxed">
              Akun disediakan administrator. Tidak ada registrasi mandiri.
            </div>
          </form>
        )}
      </AuthLayout>
    </div>
  );
};
