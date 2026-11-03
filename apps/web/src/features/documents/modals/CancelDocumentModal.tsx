import React from "react";
import { Modal } from "../../../components/Modal";
import { AlertTriangle } from "lucide-react";

interface CancelDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentTitle: string;
  actionLoading: boolean;
}

export const CancelDocumentModal: React.FC<CancelDocumentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documentTitle,
  actionLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batalkan Pengajuan Dokumen"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800 leading-relaxed">
            <strong className="block font-bold">
              Peringatan: Tindakan ini permanen!
            </strong>
            Pengajuan dokumen akan dihentikan secara permanen bagi seluruh
            departemen. Status dokumen akan berubah menjadi{" "}
            <strong>Canceled</strong> dan tidak dapat diproses lagi.
          </div>
        </div>

        <p className="text-xs text-[#717684]">
          Apakah Anda yakin ingin membatalkan dokumen{" "}
          <strong>{documentTitle}</strong>?
        </p>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-[#e9ebf0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#e9ebf0] bg-white text-[#212634] text-xs font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Kembali
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {actionLoading ? "Membatalkan..." : "Ya, batalkan pengajuan"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
