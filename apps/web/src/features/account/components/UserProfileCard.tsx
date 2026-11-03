import React from "react";
import { User as UserIcon } from "lucide-react";
import { User } from "../../../lib/types";

interface UserProfileCardProps {
  user: User | null;
}

const ROLE_LABELS: Record<string, string> = {
  assistant: "Asisten / Pemohon",
  checker: "Pemeriksa (Checker)",
  dept_manager: "Manager Departemen",
  admin: "Administrator Sistem",
};

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ user }) => {
  const roleLabel =
    user?.role && ROLE_LABELS[user.role]
      ? ROLE_LABELS[user.role]
      : user?.role || "-";

  return (
    <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f0effe] text-[#555ad5] flex items-center justify-center">
          <UserIcon className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#212634]">Profil pengguna</h2>
          <p className="text-xs text-[#717684]">
            Data identitas dalam sistem organisasi
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-1 text-xs">
        <div className="flex items-center justify-between p-3 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[#717684]">Nama Lengkap:</span>
          <span className="font-bold text-[#212634]">
            {user?.full_name || "-"}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[#717684]">Username / NIK:</span>
          <span className="font-mono text-[#212634]">
            {user?.username || "-"} &middot; {user?.employee_no || "-"}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[#717684]">Peran Sistem:</span>
          <span className="font-semibold text-[#555ad5]">{roleLabel}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[#717684]">Departemen:</span>
          <span className="font-semibold text-[#212634]">
            {user?.department_name || "-"} ({user?.department_code || "-"})
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[#717684]">Atasan Langsung:</span>
          <span className="font-semibold text-[#212634]">
            {user?.manager_name || "Tidak ada (Pucuk Pimpinan)"}
          </span>
        </div>
      </div>
    </div>
  );
};
