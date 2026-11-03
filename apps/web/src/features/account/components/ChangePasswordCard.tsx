import React, { useState, useContext } from "react";
import { KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "../../../lib/api";
import { AuthContext } from "../../../lib/auth-context";

interface ChangePasswordCardProps {
  username?: string;
}

export const ChangePasswordCard: React.FC<ChangePasswordCardProps> = ({
  username,
}) => {
  const auth = useContext(AuthContext);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    if (newPassword.length < 10) {
      setError("Password baru minimal 10 karakter.");
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);

    if (!hasLetter || !hasDigit) {
      setError("Password baru wajib memuat kombinasi huruf dan angka.");
      return;
    }

    if (username && newPassword.toLowerCase() === username.toLowerCase()) {
      setError("Password tidak boleh sama dengan username.");
      return;
    }

    if (newPassword === oldPassword) {
      setError("Password baru harus berbeda dari password saat ini.");
      return;
    }

    setLoading(true);
    try {
      if (auth?.changePassword) {
        await auth.changePassword(oldPassword, newPassword);
      } else {
        await api.auth.changePassword(oldPassword, newPassword);
      }
      setSuccess(
        "Password Anda berhasil diperbarui! Mengalihkan ke halaman masuk...",
      );
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Gagal mengubah password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f0effe] text-[#555ad5] flex items-center justify-center">
          <KeyRound className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#212634]">Ganti password</h2>
          <p className="text-xs text-[#717684]">
            Perbarui password akun Anda secara berkala
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-[#212634] mb-1.5">
            Password saat ini <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Masukkan password saat ini"
            className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#212634] mb-1.5">
            Password baru <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 10 karakter kombinasi"
            className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#212634] mb-1.5">
            Konfirmasi password baru <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi password baru"
            className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
          />
        </div>

        <div className="p-3 bg-[#f8f9fe] border border-[#e0e2fa] rounded-xl text-[11px] text-[#717684] space-y-1">
          <span className="font-semibold text-[#212634] block">
            Ketentuan password:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-[#717684]">
            <li>Minimal 10 karakter</li>
            <li>Memuat kombinasi huruf (a-z, A-Z) dan angka (0-9)</li>
            <li>Tidak sama dengan username atau password saat ini</li>
          </ul>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Menyimpan password..." : "Simpan password baru"}
          </button>
        </div>
      </form>
    </div>
  );
};
