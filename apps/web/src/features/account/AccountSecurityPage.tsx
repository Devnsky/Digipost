import React from "react";
import { useAuth } from "../../lib/auth-context";
import {
  UserProfileCard,
  ChangePasswordCard,
  ActiveSessionCard,
} from "./components";

export const AccountSecurityPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block mb-1">
          Pengaturan
        </span>
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
          Akun &amp; keamanan
        </h1>
        <p className="text-xs text-[#717684] mt-1">
          Kelola kredensial akun, ganti password, dan pantau sesi aktif Anda.
        </p>
      </div>

      {/* Two Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Form Ganti Password */}
        <ChangePasswordCard username={user?.username} />

        {/* Right Column: Profil Pengguna & Sesi Aktif */}
        <div className="space-y-6">
          <UserProfileCard user={user} />
          <ActiveSessionCard />
        </div>
      </div>
    </div>
  );
};
