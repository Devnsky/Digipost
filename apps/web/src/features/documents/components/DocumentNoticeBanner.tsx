import React from "react";
import {
  Info,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Ban,
} from "lucide-react";
import { DocumentDetailResponse, ResponseItem } from "../../../lib/types";

interface DocumentNoticeBannerProps {
  doc: DocumentDetailResponse["document"];
  responses: ResponseItem[];
}

export const DocumentNoticeBanner: React.FC<DocumentNoticeBannerProps> = ({
  doc,
  responses,
}) => {
  if (doc.status === "draft") {
    if (doc.review_stage === "checker") {
      return (
        <div className="bg-[#f3f4fd] border border-[#e0e2fa] p-4 rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-[#555ad5] shrink-0 mt-0.5" />
          <p className="text-xs text-[#3a3e84] leading-relaxed">
            Dokumen sedang dalam antrean pemeriksaan atasan langsung (Checker:{" "}
            <strong>{doc.checker_name || "Atasan"}</strong>). Anda tidak dapat
            mengubah data hingga Checker memutuskan persetujuan atau revisi.
          </p>
        </div>
      );
    }

    const hasRevisionNote = responses.some(
      (r) => r.type === "revision_request",
    );
    if (hasRevisionNote) {
      return (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Checker meminta revisi terhadap dokumen ini.</strong>{" "}
            Periksa catatan revisi pada thread komentar di bawah, lakukan
            perbaikan data atau unggah berkas baru, lalu ajukan kembali ke
            atasan.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-[#f3f4fd] border border-[#e0e2fa] p-4 rounded-xl flex items-start gap-3">
        <Info className="w-4 h-4 text-[#555ad5] shrink-0 mt-0.5" />
        <p className="text-xs text-[#3a3e84] leading-relaxed">
          Dokumen ini masih berstatus <strong>Draft (Applicant)</strong>. Anda
          dapat memperbarui informasi atau berkas lampiran sebelum mengajukan ke
          Checker untuk persetujuan tingkat pertama.
        </p>
      </div>
    );
  }

  if (doc.status === "pending") {
    return (
      <div className="bg-[#f3f4fd] border border-[#e0e2fa] p-4 rounded-xl flex items-start gap-3">
        <Info className="w-4 h-4 text-[#555ad5] shrink-0 mt-0.5" />
        <p className="text-xs text-[#3a3e84] leading-relaxed">
          Dokumen telah disetujui oleh Checker dan saat ini dalam tahap
          peninjauan oleh Seluruh Departemen Tujuan. Sesuai prinsip{" "}
          <strong>Opsi A</strong>, seluruh departemen harus menyetujui agar
          dokumen sah.
        </p>
      </div>
    );
  }

  if (doc.status === "approved") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          Dokumen telah <strong>Disetujui secara final</strong> oleh seluruh
          departemen tujuan. Berkas resmi telah dicap stempel validasi sistem
          DigiPost.
        </p>
      </div>
    );
  }

  if (doc.status === "rejected") {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <p className="text-xs text-rose-800 leading-relaxed">
          Pengajuan dokumen <strong>Ditolak secara final</strong> oleh salah
          satu departemen tujuan. Seluruh proses alur persetujuan telah
          dihentikan secara permanen.
        </p>
      </div>
    );
  }

  if (doc.status === "canceled") {
    return (
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
        <Ban className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 leading-relaxed">
          Pengajuan dokumen telah <strong>Dibatalkan</strong> oleh pemohon.
          Seluruh proses alur persetujuan dihentikan.
        </p>
      </div>
    );
  }

  return null;
};
