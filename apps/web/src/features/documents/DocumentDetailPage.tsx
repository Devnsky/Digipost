import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast, useConfirm } from "../../lib/feedback-context";
import {
  DocumentDetailResponse,
  Department,
  DocumentVersion,
} from "../../lib/types";
import { StatusBadge, DecisionBadge } from "../../components/StatusBadge";
import { Modal } from "../../components/Modal";
import { DocumentPreviewModal } from "./modals/DocumentPreviewModal";
import { AddDepartmentModal } from "./modals/AddDepartmentModal";
import { CancelDocumentModal } from "./modals/CancelDocumentModal";
import { RequestRevisionModal } from "./modals/RequestRevisionModal";
import { ApproveForwardModal } from "./modals/ApproveForwardModal";
import { DeptDecisionModal } from "./modals/DeptDecisionModal";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Eye,
  MessageSquare,
  Send,
  Edit,
  Trash2,
  Ban,
  RefreshCw,
  Plus,
  Lock,
  X,
  HelpCircle,
  AlertCircle,
  Info,
} from "lucide-react";

interface DocumentDetailPageProps {
  documentId: number;
  onBack: () => void;
}

export const DocumentDetailPage: React.FC<DocumentDetailPageProps> = ({
  documentId,
  onBack,
}) => {
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
    setLoading(true);
    setError("");
    try {
      const res = await api.documents.getDetail(documentId);
      setData(res);
      setEditTitle(res.document.title);
      setEditDescription(res.document.description || "");
    } catch (err: any) {
      setError(err.message || "Gagal memuat detail dokumen");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return (
      new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      new Date(dateStr).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " WIB"
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

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
      toast.success("Dokumen disetujui Checker dan diteruskan ke departemen tujuan.");
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

  // Determine Notice Banner Content & Tone matching screenshots
  const renderNoticeBanner = () => {
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
      // Draft Applicant
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
            dapat memperbarui informasi atau berkas lampiran sebelum mengajukan
            ke Checker untuk persetujuan tingkat pertama.
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
              Workspace / Dokumen Saya / Detail
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
      {renderNoticeBanner()}

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
          {/* Card 1: Informasi Dokumen */}
          <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#212634]">
                Informasi dokumen
              </h2>
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
                  Versi {doc.version}
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
                      {formatFileSize(currentVersionObj.file_size)} &middot;
                      Diunggah oleh {currentVersionObj.uploaded_by_name}{" "}
                      &middot; {formatDate(currentVersionObj.uploaded_at)}
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
                      onClick={() => setIsUploadModalOpen(true)}
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

          {/* Card 2: Departemen Tujuan */}
          <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#212634]">
                  Departemen tujuan
                </h2>
                <p className="text-xs text-[#717684] mt-0.5">
                  Seluruh departemen berikut wajib menyetujui sesuai aturan Opsi
                  A
                </p>
              </div>

              {(allowedActions.can_add_dept ||
                (doc.status === "draft" && allowedActions.can_edit)) && (
                <button
                  onClick={() => setIsAddDeptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0effe] hover:bg-[#e4e2fd] text-[#555ad5] text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah departemen</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="border-b border-[#e9ebf0] text-[10px] font-bold uppercase tracking-wider text-[#8a90a2]">
                    <th className="py-3 px-6">Departemen</th>
                    <th className="py-3 px-4">Manajer</th>
                    <th className="py-3 px-4">Status Keputusan</th>
                    <th className="py-3 px-4">Waktu</th>
                    {doc.status === "draft" && allowedActions.can_edit && (
                      <th className="py-3 px-6 text-right">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9ebf0]">
                  {departments.map((dept) => (
                    <tr
                      key={dept.department_id}
                      className="hover:bg-[#fbfbfc] transition"
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-[#212634]">
                          {dept.name}
                        </div>
                        <div className="text-[11px] font-mono text-[#8a90a2] mt-0.5">
                          {dept.code}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#717684]">
                        {dept.manager_name || "Manajer Departemen"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <DecisionBadge decision={dept.decision} />
                      </td>
                      <td className="py-3.5 px-4 text-[#717684] whitespace-nowrap">
                        {dept.decided_at
                          ? formatDateTime(dept.decided_at)
                          : "-"}
                      </td>
                      {doc.status === "draft" && allowedActions.can_edit && (
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() =>
                              handleRemoveDraftDept(dept.department_id)
                            }
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Hapus departemen dari draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Thread Komentar & Respon */}
          <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#212634]">
                Thread komentar &amp; tanggapan
              </h2>
              <p className="text-xs text-[#717684] mt-0.5">
                Diskusi resmi, catatan revisi, dan tanggapan departemen terkait
              </p>
            </div>

            {/* List of responses */}
            <div className="space-y-3 pt-1">
              {responses.length === 0 ? (
                <div className="p-8 text-center text-[#717684] bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#8a90a2] stroke-1" />
                  <p className="text-xs font-semibold text-[#212634]">
                    Belum ada tanggapan atau catatan
                  </p>
                  <p className="text-[11px] text-[#717684] mt-0.5">
                    Komentar Checker dan respon manajer departemen akan muncul
                    di sini.
                  </p>
                </div>
              ) : (
                responses.map((resp) => {
                  const isRevision = resp.type === "revision_request";
                  const isComment = resp.type === "comment";

                  return (
                    <div
                      key={resp.id}
                      className={`p-4 rounded-xl border transition ${
                        isRevision
                          ? "bg-amber-50/50 border-amber-200"
                          : isComment
                            ? "bg-[#f0effe]/40 border-[#555ad5]/20"
                            : "bg-[#fbfbfc] border-[#e9ebf0]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#f0effe] text-[#555ad5] font-bold text-[10px] flex items-center justify-center">
                            {resp.author_name
                              ? resp.author_name[0].toUpperCase()
                              : "U"}
                          </div>
                          <span className="text-xs font-bold text-[#212634]">
                            {resp.author_name}
                          </span>
                          {resp.department_name && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {resp.department_name}
                            </span>
                          )}
                          {isRevision && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Permintaan Revisi
                            </span>
                          )}
                          {isComment && (
                            <span className="px-1.5 py-0.5 rounded bg-[#f0effe] text-[#555ad5] text-[10px] font-semibold">
                              Catatan Checker
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#8a90a2]">
                          {formatDateTime(resp.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-[#212634] leading-relaxed pl-8 whitespace-pre-wrap">
                        {resp.body}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Response Form if permitted */}
            {allowedActions.can_respond && (
              <form
                onSubmit={handleSendResponse}
                className="pt-2 border-t border-[#e9ebf0] space-y-3"
              >
                <label className="block text-xs font-semibold text-[#212634]">
                  Tulis Tanggapan Resmi
                </label>
                <textarea
                  rows={3}
                  value={responseBody}
                  onChange={(e) => setResponseBody(e.target.value)}
                  placeholder="Ketik tanggapan atau catatan departemen Anda mengenai dokumen ini..."
                  className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading || !responseBody.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim tanggapan</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column (~32% on Desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Tindakan Dokumen */}
          <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#212634]">
                Tindakan dokumen
              </h2>
              <p className="text-xs text-[#717684] mt-0.5">
                Aksi yang dapat Anda lakukan saat ini
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Applicant Actions on Draft/Applicant */}
              {allowedActions.can_submit && (
                <button
                  onClick={handleSubmitToChecker}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ajukan ke Checker</span>
                </button>
              )}

              {allowedActions.can_edit && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#e9ebf0] bg-white hover:bg-slate-50 text-[#212634] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Edit className="w-3.5 h-3.5 text-[#717684]" />
                  <span>Edit informasi dokumen</span>
                </button>
              )}

              {/* Applicant Action on Pending: Cancel */}
              {allowedActions.can_cancel && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Batalkan dokumen</span>
                </button>
              )}

              {/* Checker Actions on Draft/Checker */}
              {allowedActions.can_checker_decide && (
                <>
                  <button
                    onClick={() => setIsCheckerApproveModalOpen(true)}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Setujui &amp; teruskan</span>
                  </button>

                  <button
                    onClick={() => setIsRequestRevisionModalOpen(true)}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#fef3c7] hover:bg-[#fde68a] text-[#b45309] border border-[#fcd34d] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Kembalikan untuk revisi</span>
                  </button>
                </>
              )}

              {/* Dept Manager Actions on Pending */}
              {allowedActions.can_dept_decide && targetDeptId && (
                <>
                  {/* If decision already made and not in editing mode, display status card & "Ubah Keputusan" button */}
                  {myDeptObj?.decision && !isChangingDeptDecision ? (
                    <div className="space-y-2.5">
                      <div
                        className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                          myDeptObj.decision === "approved"
                            ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                            : "bg-rose-50/80 border-rose-200 text-rose-800"
                        }`}
                      >
                        {myDeptObj.decision === "approved" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold leading-tight">
                            {myDeptObj.decision === "approved"
                              ? "Keputusan: Telah Disetujui"
                              : "Keputusan: Telah Ditolak"}
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                            {myDeptObj.decision === "approved"
                              ? "Departemen Anda telah menyetujui pengajuan dokumen ini."
                              : "Departemen Anda telah menolak pengajuan dokumen ini."}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsChangingDeptDecision(true)}
                        disabled={actionLoading}
                        className="w-full py-2 px-3 rounded-xl border border-[#e9ebf0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#4b5563] hover:text-[#212634] transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#717684]" />
                        <span>Ubah Keputusan</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* If not decided yet, or currently rejected: show Setujui button */}
                      {(!myDeptObj?.decision ||
                        myDeptObj.decision === "rejected") && (
                        <button
                          onClick={() => handleDeptApprove(targetDeptId)}
                          disabled={actionLoading}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>
                            {myDeptObj?.decision === "rejected"
                              ? "Ubah keputusan: Setujui Dokumen"
                              : "Setujui dokumen"}
                          </span>
                        </button>
                      )}

                      {/* If not decided yet, or currently approved: show Tolak button */}
                      {(!myDeptObj?.decision ||
                        myDeptObj.decision === "approved") && (
                        <button
                          onClick={() => {
                            setRejectDeptId(targetDeptId);
                            setIsDeptRejectModalOpen(true);
                          }}
                          disabled={actionLoading}
                          className="w-full py-2.5 px-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>
                            {myDeptObj?.decision === "approved"
                              ? "Ubah keputusan: Tolak Dokumen"
                              : "Tolak dokumen"}
                          </span>
                        </button>
                      )}

                      {myDeptObj?.decision && (
                        <button
                          type="button"
                          onClick={() => setIsChangingDeptDecision(false)}
                          className="w-full py-1.5 text-center text-xs text-[#717684] hover:text-[#212634] transition cursor-pointer"
                        >
                          Batal ubah keputusan
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Delete Draft Action */}
              {allowedActions.can_delete && (
                <button
                  onClick={handleDeleteDraft}
                  disabled={actionLoading}
                  className="w-full py-2 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus draft</span>
                </button>
              )}

              {/* Terminal Locked Card if Approved / Rejected / Canceled */}
              {(doc.status === "approved" ||
                doc.status === "rejected" ||
                doc.status === "canceled") && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
                  <Lock className="w-5 h-5 mx-auto text-[#8a90a2]" />
                  <p className="text-xs font-bold text-[#212634]">
                    Terkunci &middot; Final
                  </p>
                  <p className="text-[11px] text-[#717684] leading-relaxed">
                    Dokumen ini telah mencapai status akhir. Alur persetujuan
                    telah selesai dan tidak dapat diubah kembali.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Riwayat & Jejak Audit */}
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
                    Oleh{" "}
                    <strong className="text-[#212634]">{lg.actor_name}</strong>
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

          {/* Card 3: Hak Akses Sesuai Tahap */}
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
                <strong className="text-[#212634]">Applicant:</strong> Mengedit
                dan mengajukan saat draft; membatalkan saat pending.
              </li>
              <li>
                <strong className="text-[#212634]">Checker:</strong> Atasan
                langsung yang menyetujui atau meminta revisi tahap 1.
              </li>
              <li>
                <strong className="text-[#212634]">Dept Manager:</strong>{" "}
                Memberikan keputusan multi-dept sesuai aturan agregasi Opsi A.
              </li>
            </ul>
          </div>
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
