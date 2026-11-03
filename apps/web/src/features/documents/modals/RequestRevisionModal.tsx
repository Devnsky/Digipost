import React from "react";
import { Modal } from "../../../components/Modal";

interface RequestRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  revisionNote: string;
  setRevisionNote: (note: string) => void;
  actionLoading: boolean;
}

export const RequestRevisionModal: React.FC<RequestRevisionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  revisionNote,
  setRevisionNote,
  actionLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Minta Revisi Dokumen"
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-[#717684] leading-relaxed">
          Dokumen akan dikembalikan ke pemohon berstatus <strong>Draft</strong>{" "}
          dengan catatan revisi yang Anda berikan. Pemohon akan menerima
          notifikasi untuk memperbaiki berkas.
        </p>

        <div>
          <label className="block text-xs font-semibold text-[#212634] mb-1.5">
            Catatan Revisi untuk Pemohon{" "}
            <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="Tuliskan bagian mana yang perlu diperbaiki oleh pemohon..."
            className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition resize-none"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-[#e9ebf0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#e9ebf0] bg-white text-[#212634] text-xs font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={actionLoading || !revisionNote.trim()}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {actionLoading ? "Mengirim..." : "Kirim permintaan revisi"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
