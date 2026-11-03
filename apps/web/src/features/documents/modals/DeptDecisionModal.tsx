import React from "react";
import { Modal } from "../../../components/Modal";
import { AlertTriangle } from "lucide-react";

interface DeptDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  rejectNote: string;
  setRejectNote: (note: string) => void;
  actionLoading: boolean;
}

export const DeptDecisionModal: React.FC<DeptDecisionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  rejectNote,
  setRejectNote,
  actionLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Tolak Persetujuan"
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 leading-relaxed">
            <strong className="block font-bold">
              PERHATIAN: Aturan Agregasi Opsi A!
            </strong>
            Penolakan oleh departemen Anda akan dicatat. Sesuai aturan{" "}
            <strong>Agregasi Opsi A</strong>, dokumen tetap berstatus pending
            hingga seluruh departemen memutuskan atau jika keputusan diubah
            kembali sebelum status final.
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#212634] mb-1.5">
            Catatan Penolakan (Akan tercatat di thread tanggapan)
          </label>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Tuliskan alasan penolakan departemen Anda..."
            className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition resize-none"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-[#e9ebf0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#e9ebf0] bg-white text-[#212634] text-xs font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Kembali
          </button>
          <button
            type="submit"
            disabled={actionLoading}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {actionLoading ? "Menolak..." : "Ya, tolak dokumen"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
