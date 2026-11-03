import React from "react";
import { Modal } from "../../../components/Modal";

interface ApproveForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  departmentNames: string[];
  actionLoading: boolean;
}

export const ApproveForwardModal: React.FC<ApproveForwardModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  departmentNames,
  actionLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Setujui & Teruskan Dokumen"
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-[#717684] leading-relaxed">
          Dokumen telah memenuhi kriteria pemeriksaan atasan dan akan diteruskan
          ke seluruh departemen tujuan (
          <strong>{departmentNames.join(", ")}</strong>) untuk proses persetujuan
          multi-departemen (Opsi A).
        </p>

        <div className="p-4 bg-[#f3f4fd] border border-[#e0e2fa] rounded-xl text-xs text-[#3a3e84]">
          Setelah diteruskan, status dokumen akan berubah menjadi{" "}
          <strong>Pending</strong>.
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
            type="button"
            disabled={actionLoading}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {actionLoading ? "Memproses..." : "Setujui & teruskan"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

