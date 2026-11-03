import React from "react";
import { FileText, Eye, Download, Upload } from "lucide-react";
import {
  DocumentDetailResponse,
  DocumentVersion,
  AllowedActions,
} from "../../../lib/types";
import { api } from "../../../lib/api";

interface DocumentInfoCardProps {
  doc: DocumentDetailResponse["document"];
  currentVersionObj: DocumentVersion | null;
  allowedActions: AllowedActions;
  openPreview: (ver: DocumentVersion) => void;
  onOpenUploadModal: () => void;
  formatDate: (dateStr?: string) => string;
  formatDateTime: (dateStr?: string) => string;
  formatFileSize: (bytes: number) => string;
}

export const DocumentInfoCard: React.FC<DocumentInfoCardProps> = ({
  doc,
  currentVersionObj,
  allowedActions,
  openPreview,
  onOpenUploadModal,
  formatDate,
  formatDateTime,
  formatFileSize,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
      <div>
        <h2 className="text-sm font-bold text-[#212634]">Informasi dokumen</h2>
        <p className="text-xs text-[#717684] mt-0.5">
          Data pemohon, atasan pemeriksa, dan berkas lampiran
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="p-3.5 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a90a2] block">
            Pemohon (Applicant)
          </span>
          <span className="text-xs font-bold text-[#212634] block mt-1">
            {doc.applicant_name}
          </span>
          <span className="text-[11px] text-[#717684] block mt-0.5">
            {doc.applicant_department_name} &middot;{" "}
            {doc.applicant_employee_no || "-"}
          </span>
        </div>

        <div className="p-3.5 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a90a2] block">
            Checker (Atasan Langsung)
          </span>
          <span className="text-xs font-bold text-[#212634] block mt-1">
            {doc.checker_name || "Belum Ditentukan"}
          </span>
          <span className="text-[11px] text-[#717684] block mt-0.5">
            {doc.checker_department_name || "-"}
          </span>
        </div>

        <div className="p-3.5 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a90a2] block">
            Tanggal Pengajuan
          </span>
          <span className="text-xs font-bold text-[#212634] block mt-1">
            {formatDateTime(doc.created_at)}
          </span>
          <span className="text-[11px] text-[#717684] block mt-0.5">
            {doc.submitted_at
              ? `Disubmit: ${formatDateTime(doc.submitted_at)}`
              : "Draft"}
          </span>
        </div>

        <div className="p-3.5 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a90a2] block">
            Versi Berkas Terkini
          </span>
          <span className="text-xs font-bold text-[#212634] block mt-1">
            Versi {currentVersionObj ? currentVersionObj.version_no : doc.version}
          </span>
          <span className="text-[11px] text-[#717684] block mt-0.5">
            {currentVersionObj?.file_name || "Tidak ada berkas"}
          </span>
        </div>
      </div>

      {doc.description && (
        <div className="p-4 bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a90a2] block mb-1">
            Deskripsi / Urgensi Dokumen
          </span>
          <p className="text-xs text-[#212634] leading-relaxed whitespace-pre-wrap">
            {doc.description}
          </p>
        </div>
      )}

      {/* Berkas Lampiran Terbaru Section */}
      {currentVersionObj && (
        <div className="border border-[#e9ebf0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f0effe] text-[#555ad5] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#212634] flex items-center gap-2">
                <span>{currentVersionObj.file_name}</span>
                <span className="px-1.5 py-0.2 bg-[#f0effe] text-[#555ad5] rounded text-[10px] font-mono">
                  v{currentVersionObj.version_no}
                </span>
              </div>
              <div className="text-[11px] text-[#717684] mt-0.5">
                {formatFileSize(currentVersionObj.file_size)} &middot; Diunggah
                oleh {currentVersionObj.uploaded_by_name} &middot;{" "}
                {formatDate(currentVersionObj.uploaded_at)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openPreview(currentVersionObj)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat PDF</span>
            </button>

            <a
              href={api.files.downloadUrl(doc.id, currentVersionObj.id)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e9ebf0] bg-white hover:bg-slate-50 text-[#212634] text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#717684]" />
              <span>Unduh</span>
            </a>

            {allowedActions.can_edit && (
              <button
                onClick={onOpenUploadModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e9ebf0] bg-white hover:bg-slate-50 text-[#212634] text-xs font-semibold transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#717684]" />
                <span>Revisi berkas</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
