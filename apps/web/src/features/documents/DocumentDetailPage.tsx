import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast, useConfirm } from "../../lib/feedback-context";
import {
  DocumentDetailResponse,
  Department,
  DocumentVersion,
} from "../../lib/types";
import {
  formatDate,
  formatDateTime,
  formatFileSize,
} from "../../lib/formatters";
import { StatusBadge } from "../../components/StatusBadge";
import { Modal } from "../../components/Modal";
import { DocumentPreviewModal } from "./modals/DocumentPreviewModal";
import { AddDepartmentModal } from "./modals/AddDepartmentModal";
import { CancelDocumentModal } from "./modals/CancelDocumentModal";
import { RequestRevisionModal } from "./modals/RequestRevisionModal";
import { ApproveForwardModal } from "./modals/ApproveForwardModal";
import { DeptDecisionModal } from "./modals/DeptDecisionModal";
import { DocumentNoticeBanner } from "./components/DocumentNoticeBanner";
import { DocumentInfoCard } from "./components/DocumentInfoCard";
import { DocumentDepartmentsCard } from "./components/DocumentDepartmentsCard";
import { DocumentDiscussionCard } from "./components/DocumentDiscussionCard";
import { DocumentActionsCard } from "./components/DocumentActionsCard";
import { DocumentTimelineCard } from "./components/DocumentTimelineCard";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";

export function useParams<
  T extends Record<string, string> = { documentNumber: string },
>(): Partial<T> {
  if (typeof window === "undefined") return {} as Partial<T>;
  const match = window.location.pathname.match(/^\/documents\/([^/]+)$/);
  if (match && match[1] !== "create") {
    return {
      documentNumber: decodeURIComponent(match[1]),
    } as unknown as Partial<T>;
  }
  return {} as Partial<T>;
}

interface DocumentDetailPageProps {
  documentNumber?: string;
  onBack: () => void;
}

export const DocumentDetailPage: React.FC<DocumentDetailPageProps> = ({
  documentNumber: propDocumentNumber,
  onBack,
}) => {
  const { documentNumber: paramDocNumber } =
    useParams<{ documentNumber: string }>();
  const documentNumber = propDocumentNumber || paramDocNumber || "";
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<DocumentDetailResponse | null>(null);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [selectedDeptToAdd, setSelectedDeptToAdd] = useState<number | "">("");

  // Checker modals
  const [isCheckerApproveModalOpen, setIsCheckerApproveModalOpen] =
    useState(false);
  const [isRequestRevisionModalOpen, setIsRequestRevisionModalOpen] =
    useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [isCheckerRejectModalOpen, setIsCheckerRejectModalOpen] =
    useState(false);
  const [checkerRejectNote, setCheckerRejectNote] = useState("");

  // Cancel modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Dept reject modal
  const [isDeptRejectModalOpen, setIsDeptRejectModalOpen] = useState(false);
  const [rejectDeptId, setRejectDeptId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [isChangingDeptDecision, setIsChangingDeptDecision] = useState(false);

  // Response input state
  const [responseBody, setResponseBody] = useState("");

  // Preview state
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(
    null,
  );
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const fetchDetail = useCallback(async () => {
    if (!documentNumber) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.documents.getDetail(documentNumber);
      setData(res);
      setEditTitle(res.document.title);
      setEditDescription(res.document.description || "");
    } catch (err: any) {
      setError(err.message || "Gagal memuat detail dokumen");
    } finally {
      setLoading(false);
    }
  }, [documentNumber]);

  useEffect(() => {
    fetchDetail();
    api.departments
      .list()
      .then(setAllDepartments)
      .catch(() => {});
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-[#717684]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#555ad5]" />
          <p className="text-xs font-semibold">Memuat detail dokumen...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#e9ebf0] max-w-lg mx-auto mt-8">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-[#212634]">
          Akses Ditolak atau Dokumen Tidak Ditemukan
        </h2>
        <p className="text-xs text-[#717684] mt-1 max-w-md mx-auto">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#555ad5] text-white rounded-xl text-xs font-semibold hover:bg-[#484ec7] transition cursor-pointer"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const {
    document: doc,
    departments,
    versions,
    responses,
    logs,
    allowedActions,
  } = data;

  const currentVersionObj =
    versions && versions.length > 0 ? versions[0] : null;

  // --- Handlers ---
  const handleEditMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.documents.updateMetadata(doc.id, {
        title: editTitle,
        description: editDescription,
        expected_version: doc.version,
      });
      setIsEditModalOpen(false);
      await fetchDetail();
      toast.success("Metadata dokumen berhasil diperbarui.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah metadata");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("expected_version", String(doc.version));
      await api.documents.uploadVersion(doc.id, formData);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      await fetchDetail();
      toast.success("Versi berkas baru berhasil diunggah.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah versi baru");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitToChecker = async () => {
    const isConfirmed = await confirm({
      title: "Ajukan Dokumen ke Checker",
      message:
        "Apakah Anda yakin ingin mengajukan dokumen ini ke atasan langsung (Checker)? Dokumen akan dikunci untuk diedit dan masuk ke antrean verifikasi atasan.",
      confirmText: "Ajukan Dokumen",
      cancelText: "Batal",
      variant: "primary",
    });
    if (!isConfirmed) return;
    setActionLoading(true);
    try {
      await api.documents.submit(doc.id, doc.version);
      await fetchDetail();
      toast.success("Dokumen berhasil diajukan ke atasan langsung (Checker).");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengajukan dokumen");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    const isConfirmed = await confirm({
      title: "Hapus Draft Pengajuan",
      message:
        "Apakah Anda yakin ingin menghapus draft pengajuan ini secara permanen? Seluruh berkas dan riwayat draft akan dihapus.",
      confirmText: "Hapus Draft",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!isConfirmed) return;
    setActionLoading(true);
    try {
      await api.documents.deleteDraft(doc.id, doc.version);
      toast.success("Draft pengajuan berhasil dihapus.");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus draft");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPending = async () => {
    setActionLoading(true);
    try {
      await api.documents.cancel(doc.id, doc.version);
      setIsCancelModalOpen(false);
      await fetchDetail();
      toast.success("Pengajuan dokumen berhasil dibatalkan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal membatalkan pengajuan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckerApprove = async () => {
    setActionLoading(true);
    try {
      await api.workflow.checkerDecide(doc.id, {
        action: "approve",
        expected_version: doc.version,
      });
      setIsCheckerApproveModalOpen(false);
      await fetchDetail();
      toast.success(
        "Dokumen disetujui Checker dan diteruskan ke departemen tujuan.",
      );
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses persetujuan checker");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckerRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNote.trim()) {
      toast.warning("Catatan revisi wajib diisi!");
      return;
    }
    setActionLoading(true);
    try {
      await api.workflow.checkerDecide(doc.id, {
        action: "revision",
        note: revisionNote.trim(),
        expected_version: doc.version,
      });
      setIsRequestRevisionModalOpen(false);
      setRevisionNote("");
      await fetchDetail();
      toast.success("Permintaan revisi berhasil dikirim ke pemohon.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim permintaan revisi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckerReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.workflow.checkerDecide(doc.id, {
        action: "reject",
        note: checkerRejectNote.trim() || undefined,
        expected_version: doc.version,
      });
      setIsCheckerRejectModalOpen(false);
      setCheckerRejectNote("");
      await fetchDetail();
      toast.success("Dokumen berhasil ditolak (final).");
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses penolakan dokumen");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeptApprove = async (deptId: number) => {
    const isConfirmed = await confirm({
      title: "Persetujuan Departemen",
      message:
        "Konfirmasi: Apakah Anda yakin ingin MENYETUJUI pengajuan dokumen ini atas nama departemen Anda?",
      confirmText: "Setujui Dokumen",
      cancelText: "Batal",
      variant: "success",
    });
    if (!isConfirmed) return;
    setActionLoading(true);
    try {
      await api.workflow.deptDecision(doc.id, deptId, {
        decision: "approved",
        expected_version: doc.version,
      });
      await fetchDetail();
      setIsChangingDeptDecision(false);
      toast.success("Persetujuan departemen berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan keputusan departemen");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeptReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectDeptId) return;
    setActionLoading(true);
    try {
      if (rejectNote.trim()) {
        await api.workflow
          .deptResponse(doc.id, rejectDeptId, rejectNote.trim())
          .catch(() => {});
      }
      await api.workflow.deptDecision(doc.id, rejectDeptId, {
        decision: "rejected",
        expected_version: doc.version,
      });
      setIsDeptRejectModalOpen(false);
      setRejectDeptId(null);
      setRejectNote("");
      await fetchDetail();
      setIsChangingDeptDecision(false);
      toast.success("Penolakan departemen berhasil dicatat.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan penolakan departemen");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptToAdd) return;
    setActionLoading(true);
    try {
      if (doc.status === "draft") {
        await api.documents.addDepartmentDraft(
          doc.id,
          Number(selectedDeptToAdd),
          doc.version,
        );
      } else {
        await api.workflow.addDepartmentPending(
          doc.id,
          Number(selectedDeptToAdd),
          doc.version,
        );
      }
      setIsAddDeptModalOpen(false);
      setSelectedDeptToAdd("");
      await fetchDetail();
      toast.success("Departemen tujuan berhasil ditambahkan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan departemen");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDraftDept = async (deptId: number) => {
    const isConfirmed = await confirm({
      title: "Hapus Departemen Tujuan",
      message: "Hapus departemen tujuan ini dari daftar draft pengajuan?",
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!isConfirmed) return;
    setActionLoading(true);
    try {
      await api.documents.removeDepartmentDraft(doc.id, deptId, doc.version);
      await fetchDetail();
      toast.success("Departemen tujuan berhasil dihapus.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus departemen");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseBody.trim()) return;
    if (
      !allowedActions.can_checker_decide &&
      !allowedActions.managed_department_id
    ) {
      toast.error(
        "Anda tidak memiliki kewenangan untuk mengirim komentar pada tahap ini.",
      );
      return;
    }
    setActionLoading(true);
    try {
      if (allowedActions.can_checker_decide) {
        await api.workflow.checkerComment(doc.id, responseBody.trim());
      } else if (allowedActions.managed_department_id) {
        await api.workflow.deptResponse(
          doc.id,
          allowedActions.managed_department_id,
          responseBody.trim(),
        );
      }
      setResponseBody("");
      await fetchDetail();
      toast.success("Komentar berhasil dikirim.");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim komentar");
    } finally {
      setActionLoading(false);
    }
  };

  const openPreview = async (ver: DocumentVersion) => {
    setPreviewVersion(ver);
    setPreviewError("");
    setDocxHtml(null);

    const ext = ver.file_name.split(".").pop()?.toLowerCase();
    if (ext === "docx" || ext === "doc") {
      setPreviewLoading(true);
      try {
        const res = await api.files.getDocxPreview(doc.id, ver.id);
        setDocxHtml(res.html);
      } catch (err: any) {
        setPreviewError(err.message || "Gagal memuat pratinjau DOCX.");
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  // Helper for manager decision in current dept
  const myDeptObj =
    departments.find(
      (d) =>
        (allowedActions.managed_department_id &&
          Number(d.department_id) ===
            Number(allowedActions.managed_department_id)) ||
        (user?.id && Number(d.manager_id) === Number(user.id)),
    ) || null;

  const targetDeptId =
    allowedActions.managed_department_id ||
    (myDeptObj ? Number(myDeptObj.department_id) : null);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Navigation & Header matching Screenshots */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e9ebf0] bg-white text-xs font-semibold text-[#212634] hover:bg-slate-50 transition cursor-pointer mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke daftar dokumen</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block">
              {user?.role === "dept_manager"
                ? "Workspace / Dokumen Departemen / Detail"
                : user?.role === "checker"
                  ? "Pemeriksaan / Pemeriksaan Atasan / Detail"
                  : "Workspace / Dokumen Saya / Detail"}
            </span>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
              {doc.title}
            </h1>
            <p className="text-xs text-[#717684] mt-1">
              Diajukan oleh{" "}
              <strong className="text-[#212634]">{doc.applicant_name}</strong>{" "}
              &middot; No:{" "}
              <span className="font-mono">{doc.document_number}</span> &middot;
              v{doc.version} &middot; {formatDate(doc.created_at)}
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <StatusBadge status={doc.status} reviewStage={doc.review_stage} />
          </div>
        </div>
      </div>

      {/* Notice Strip matching screenshots */}
      <DocumentNoticeBanner doc={doc} responses={responses} />

      {/* Role Conflict Warning Banner if detected */}
      {allowedActions.is_checker_dept_conflict && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">
              Peringatan Benturan Peran (Checker Sekaligus Manager Departemen)
            </p>
            <p className="mt-0.5 text-amber-700 leading-relaxed">
              Anda tercatat sebagai Checker (atasan langsung) sekaligus Manager
              departemen tujuan dokumen ini. Sistem tidak memberikan persetujuan
              ganda instan; Anda memeriksa dalam kapasitas Checker terlebih
              dahulu, kemudian memutuskan persetujuan departemen secara terpisah
              setelah dokumen diteruskan.
            </p>
          </div>
        </div>
      )}

      {/* Two-Column Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (~68% on Desktop) */}
        <div className="lg:col-span-8 space-y-6">
          <DocumentInfoCard
            doc={doc}
            currentVersionObj={currentVersionObj}
            allowedActions={allowedActions}
            openPreview={openPreview}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            formatDate={formatDate}
            formatDateTime={formatDateTime}
            formatFileSize={formatFileSize}
          />

          <DocumentDepartmentsCard
            doc={doc}
            departments={departments}
            allowedActions={allowedActions}
            onOpenAddDeptModal={() => setIsAddDeptModalOpen(true)}
            onRemoveDraftDept={handleRemoveDraftDept}
            formatDateTime={formatDateTime}
          />

          <DocumentDiscussionCard
            responses={responses}
            allowedActions={allowedActions}
            responseBody={responseBody}
            setResponseBody={setResponseBody}
            onSendResponse={handleSendResponse}
            actionLoading={actionLoading}
            formatDateTime={formatDateTime}
          />
        </div>

        {/* Right Column (~32% on Desktop) */}
        <div className="lg:col-span-4 space-y-6">
          <DocumentActionsCard
            doc={doc}
            allowedActions={allowedActions}
            actionLoading={actionLoading}
            myDeptObj={myDeptObj}
            targetDeptId={targetDeptId}
            isChangingDeptDecision={isChangingDeptDecision}
            setIsChangingDeptDecision={setIsChangingDeptDecision}
            onSubmitToChecker={handleSubmitToChecker}
            onOpenEditModal={() => setIsEditModalOpen(true)}
            onOpenCancelModal={() => setIsCancelModalOpen(true)}
            onOpenCheckerApproveModal={() => setIsCheckerApproveModalOpen(true)}
            onOpenRequestRevisionModal={() =>
              setIsRequestRevisionModalOpen(true)
            }
            onOpenCheckerRejectModal={() => setIsCheckerRejectModalOpen(true)}
            onDeptApprove={handleDeptApprove}
            onOpenDeptRejectModal={(deptId) => {
              setRejectDeptId(deptId);
              setIsDeptRejectModalOpen(true);
            }}
            onDeleteDraft={handleDeleteDraft}
          />

          <DocumentTimelineCard logs={logs} formatDateTime={formatDateTime} />
        </div>
      </div>

      {/* --- DEDICATED SCREENSHOT MODALS --- */}

      {/* 1. Modal Pratinjau Berkas (Screenshot 15) */}
      <DocumentPreviewModal
        isOpen={!!previewVersion}
        onClose={() => setPreviewVersion(null)}
        documentId={doc.id}
        previewVersion={previewVersion}
        previewLoading={previewLoading}
        previewError={previewError}
        docxHtml={docxHtml}
        formatFileSize={formatFileSize}
      />

      {/* 2. Modal Tambah Departemen (Screenshot 18) */}
      <AddDepartmentModal
        isOpen={isAddDeptModalOpen}
        onClose={() => setIsAddDeptModalOpen(false)}
        onSubmit={handleAddDepartment}
        selectedDeptToAdd={selectedDeptToAdd}
        setSelectedDeptToAdd={setSelectedDeptToAdd}
        allDepartments={allDepartments}
        currentDepartments={departments}
        userId={user?.id}
        actionLoading={actionLoading}
      />

      {/* 3. Modal Batalkan Dokumen (Screenshot 19) */}
      <CancelDocumentModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelPending}
        documentTitle={doc.title}
        actionLoading={actionLoading}
      />

      {/* 4. Modal Minta Revisi Dokumen (Screenshot 26) */}
      <RequestRevisionModal
        isOpen={isRequestRevisionModalOpen}
        onClose={() => setIsRequestRevisionModalOpen(false)}
        onSubmit={handleCheckerRevision}
        revisionNote={revisionNote}
        setRevisionNote={setRevisionNote}
        actionLoading={actionLoading}
      />

      {/* 5. Modal Setujui & Teruskan Dokumen (Screenshot 27) */}
      <ApproveForwardModal
        isOpen={isCheckerApproveModalOpen}
        onClose={() => setIsCheckerApproveModalOpen(false)}
        onConfirm={handleCheckerApprove}
        departmentNames={departments.map((d) => d.name)}
        actionLoading={actionLoading}
      />

      {/* 5b. Modal Tolak Pengajuan Dokumen oleh Checker */}
      <Modal
        isOpen={isCheckerRejectModalOpen}
        onClose={() => setIsCheckerRejectModalOpen(false)}
        title="Tolak Pengajuan Dokumen"
        maxWidth="md"
      >
        <form onSubmit={handleCheckerReject} className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed">
            <strong>Peringatan:</strong> Penolakan dokumen oleh Checker bersifat{" "}
            <strong>final</strong>. Dokumen akan berstatus ditolak dan alur
            persetujuan dihentikan.
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#212634] mb-1.5">
              Alasan Penolakan (Opsional)
            </label>
            <textarea
              rows={3}
              value={checkerRejectNote}
              onChange={(e) => setCheckerRejectNote(e.target.value)}
              placeholder="Tuliskan catatan alasan penolakan untuk pemohon..."
              className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#e9ebf0]">
            <button
              type="button"
              onClick={() => setIsCheckerRejectModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#e9ebf0] bg-white text-[#212634] text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? "Memproses..." : "Tolak Dokumen"}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal Konfirmasi Tolak Persetujuan Dept (Screenshot 31) */}
      <DeptDecisionModal
        isOpen={isDeptRejectModalOpen}
        onClose={() => setIsDeptRejectModalOpen(false)}
        onSubmit={handleDeptReject}
        rejectNote={rejectNote}
        setRejectNote={setRejectNote}
        actionLoading={actionLoading}
      />

      {/* 7. Modal Edit Metadata Dokumen */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Metadata Dokumen"
        maxWidth="md"
      >
        <form onSubmit={handleEditMetadata} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#212634] mb-1.5">
              Judul Dokumen <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#212634] mb-1.5">
              Deskripsi Dokumen
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#e9ebf0]">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#e9ebf0] bg-white text-[#212634] text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              Simpan perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. Modal Unggah Versi Baru */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Unggah Versi Baru Dokumen"
        maxWidth="md"
      >
        <form onSubmit={handleUploadVersion} className="space-y-4">
          <p className="text-xs text-[#717684]">
            Unggah berkas dokumen yang telah diperbaiki. Versi baru akan
            tercatat otomatis sebagai versi berikutnya (v{doc.version + 1}).
          </p>
          <input
            type="file"
            required
            accept=".pdf,.docx,.doc"
            onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
            className="w-full text-xs text-[#212634] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#f0effe] file:text-[#555ad5] hover:file:bg-[#e4e2fd] cursor-pointer"
          />
          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#e9ebf0]">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#e9ebf0] bg-white text-[#212634] text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading || !uploadFile}
              className="px-4 py-2 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              Unggah berkas baru
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
