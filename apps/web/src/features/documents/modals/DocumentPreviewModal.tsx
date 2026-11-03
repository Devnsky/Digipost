import React from "react";
import { Modal } from "../../../components/Modal";
import { Printer, RefreshCw } from "lucide-react";
import DOMPurify from "dompurify";
import { api } from "../../../lib/api";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  previewVersion: {
    id: number;
    version_no: number;
    file_size: number;
  } | null;
  previewLoading: boolean;
  previewError: string;
  docxHtml: string | null;
  formatFileSize: (bytes: number) => string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentId,
  previewVersion,
  previewLoading,
  previewError,
  docxHtml,
  formatFileSize,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Lampiran Berkas"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs py-1 border-b border-[#e9ebf0]">
          <span className="text-[#717684]">
            Versi dokumen:{" "}
            <strong className="text-[#212634]">
              v{previewVersion?.version_no}
            </strong>{" "}
            &middot;{" "}
            {previewVersion ? formatFileSize(previewVersion.file_size) : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (previewVersion) {
                  window.open(
                    api.files.previewUrl(documentId, previewVersion.id, true),
                    "_blank",
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e9ebf0] bg-white hover:bg-slate-50 text-[#212634] font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#717684]" />
              <span>Cetak PDF Resmi</span>
            </button>
          </div>
        </div>

        <div className="min-h-[500px] flex flex-col justify-center bg-slate-100 rounded-xl overflow-hidden border border-[#e9ebf0]">
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#717684]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#555ad5] mb-2" />
              <p className="text-xs font-semibold">
                Memuat pratinjau dokumen...
              </p>
            </div>
          ) : previewError ? (
            <div className="p-8 text-center text-rose-600 text-xs">
              <p className="font-semibold">{previewError}</p>
              <a
                href={
                  previewVersion
                    ? api.files.downloadUrl(documentId, previewVersion.id)
                    : "#"
                }
                download
                className="mt-3 inline-block px-4 py-2 bg-[#555ad5] text-white rounded-lg font-semibold"
              >
                Unduh Berkas untuk Membukanya
              </a>
            </div>
          ) : docxHtml ? (
            <div className="p-6 bg-white max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(docxHtml),
                }}
              />
            </div>
          ) : previewVersion ? (
            <iframe
              src={api.files.previewUrl(documentId, previewVersion.id, false)}
              className="w-full h-[650px] bg-white border-0"
              title="Document Preview"
            />
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
