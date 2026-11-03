import React from "react";
import { DigiPostLogo } from "./DigiPostLogo";

interface AuthLayoutProps {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  eyebrow = "DigiPost / AKSES AKUN",
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* Left Panel (Lavender Branding) */}
      <div className="lg:w-1/2 bg-[#ededfd] p-8 sm:p-12 lg:p-16 flex flex-col justify-between shrink-0">
        <div>
          <DigiPostLogo />
        </div>

        <div className="my-auto py-12 max-w-lg">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#7175ad]">
            Document Approval Workspace
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#2a2e63] leading-[1.18] mt-3">
            Dokumen tertata.
            <br />
            Keputusan terarah.
          </h1>
          <p className="text-sm text-[#52568a] mt-4 leading-relaxed max-w-md">
            Satu ruang untuk menyusun, meninjau, dan memantau persetujuan
            dokumen di setiap departemen.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <div className="bg-white/80 backdrop-blur-xs border border-white px-3.5 py-2 rounded-xl text-xs font-semibold text-[#404473] shadow-xs">
              <span className="text-[#7175ad] font-bold mr-1.5">01</span> Susun
              dokumen
            </div>
            <div className="bg-white/80 backdrop-blur-xs border border-white px-3.5 py-2 rounded-xl text-xs font-semibold text-[#404473] shadow-xs">
              <span className="text-[#7175ad] font-bold mr-1.5">02</span> Tinjau
            </div>
            <div className="bg-white/80 backdrop-blur-xs border border-white px-3.5 py-2 rounded-xl text-xs font-semibold text-[#404473] shadow-xs">
              <span className="text-[#7175ad] font-bold mr-1.5">03</span>{" "}
              Setujui
            </div>
          </div>
        </div>

        <div className="text-xs text-[#8286b8]">
          &copy; 2026 DigiPost &middot; Sistem Persetujuan Dokumen Internal
        </div>
      </div>

      {/* Right Panel (White Form Container) */}
      <div className="lg:w-1/2 bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1">
              {eyebrow}
            </span>
            <h2 className="text-2xl font-bold text-[#212634] tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-[#717684] mt-1">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
