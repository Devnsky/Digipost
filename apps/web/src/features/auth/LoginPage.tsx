import React, { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { AuthLayout } from "../../components/AuthLayout";
import { AlertCircle } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // UI status
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if session was expired from URL
  const isSessionExpired =
    typeof window !== "undefined" &&
    window.location.search.includes("expired=true");

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

  return (
    <AuthLayout
      title="Selamat datang kembali."
      subtitle="Masuk untuk mengelola persetujuan dokumen."
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Session expired notice */}
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

        {/* Notice box */}
        <div className="mt-6 p-3.5 rounded-xl bg-[#f3f4fd] border border-[#e9ebf0] text-xs text-[#52568a] leading-relaxed">
          Akun disediakan administrator.
        </div>
      </form>
    </AuthLayout>
  );
};
