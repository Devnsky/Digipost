import React, { useState } from "react";
import { ShieldCheck, LogOut, Clock, Laptop } from "lucide-react";
import { useAuth } from "../../../lib/auth-context";

export const ActiveSessionCard: React.FC = () => {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f0effe] text-[#555ad5] flex items-center justify-center">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#212634]">
            Sesi aktif &amp; keamanan
          </h2>
          <p className="text-xs text-[#717684]">
            Status sesi login dan otentikasi browser
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-1 text-xs">
        <div className="flex items-center justify-between p-3 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-[#717684]" />
            <span className="text-[#717684]">Status Perangkat:</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sesi Aktif
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[#717684]">Metode Otentikasi:</span>
          <span className="font-semibold text-[#212634]">
            Cookie HTTP-only (Session Token)
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#717684]" />
            <span className="text-[#717684]">Kebijakan Sesi:</span>
          </div>
          <span className="font-medium text-[#212634] text-right">
            Auto-logout saat inaktif
          </span>
        </div>
      </div>

      <div className="p-3 bg-[#f8f9fe] border border-[#e0e2fa] rounded-xl text-[11px] text-[#717684]">
        <p>
          Demi keamanan data organisasi, selalu keluar dari akun Anda apabila
          menggunakan perangkat komputer bersama atau jaringan publik.
        </p>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>
            {loggingOut ? "Mengakhiri sesi..." : "Keluar dari sesi ini"}
          </span>
        </button>
      </div>
    </div>
  );
};
