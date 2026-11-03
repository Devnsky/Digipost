import React from "react";
import { HelpCircle } from "lucide-react";
import { ApprovalLogItem } from "../../../lib/types";

interface DocumentTimelineCardProps {
  logs: ApprovalLogItem[];
  formatDateTime: (dateStr?: string) => string;
}

export const DocumentTimelineCard: React.FC<DocumentTimelineCardProps> = ({
  logs,
  formatDateTime,
}) => {
  return (
    <>
      {/* Riwayat & Jejak Audit */}
      <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#212634]">
            Riwayat &amp; jejak audit
          </h2>
          <p className="text-xs text-[#717684] mt-0.5">
            Catatan kronologis mutasi sistem
          </p>
        </div>

        <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e9ebf0]">
          {logs.map((lg) => (
            <div key={lg.id} className="relative group">
              <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#555ad5] border-2 border-white ring-2 ring-[#f0effe]" />
              <div className="text-xs font-bold text-[#212634]">
                {lg.action}
              </div>
              <div className="text-[11px] text-[#717684] mt-0.5">
                Oleh <strong className="text-[#212634]">{lg.actor_name}</strong>
              </div>
              {lg.note && (
                <div className="mt-1 p-2 bg-[#fbfbfc] border border-[#e9ebf0] rounded-lg text-[11px] text-[#212634] italic">
                  &ldquo;{lg.note}&rdquo;
                </div>
              )}
              <div className="text-[10px] text-[#8a90a2] mt-0.5">
                {formatDateTime(lg.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hak Akses Sesuai Tahap */}
      <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#555ad5]" />
          <h2 className="text-sm font-bold text-[#212634]">
            Hak akses sesuai tahap
          </h2>
        </div>
        <p className="text-xs text-[#717684] leading-relaxed">
          Otorisasi DigiPost berbasis relasi organisasi nyata:
        </p>
        <ul className="text-xs text-[#717684] space-y-2 list-disc list-inside">
          <li>
            <strong className="text-[#212634]">Applicant:</strong> Mengedit dan
            mengajukan saat draft; membatalkan saat pending.
          </li>
          <li>
            <strong className="text-[#212634]">Checker:</strong> Atasan langsung
            yang menyetujui atau meminta revisi tahap 1.
          </li>
          <li>
            <strong className="text-[#212634]">Dept Manager:</strong> Memberikan
            keputusan multi-dept sesuai aturan agregasi Opsi A.
          </li>
        </ul>
      </div>
    </>
  );
};
