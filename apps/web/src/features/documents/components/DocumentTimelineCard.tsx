import React from "react";
import { ApprovalLogItem } from "../../../lib/types";
import { formatAuditAction } from "../../../lib/formatters";

interface DocumentTimelineCardProps {
  logs: ApprovalLogItem[];
  formatDateTime: (dateStr?: string) => string;
}

export const DocumentTimelineCard: React.FC<DocumentTimelineCardProps> = ({
  logs,
  formatDateTime,
}) => {
  return (
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
              {formatAuditAction(lg.action)}
            </div>
            <div className="text-[11px] text-[#717684] mt-0.5">
              Oleh <strong className="text-[#212634]">{lg.actor_name || "Sistem"}</strong>
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
  );
};
