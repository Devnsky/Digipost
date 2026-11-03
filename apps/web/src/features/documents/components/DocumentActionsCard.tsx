import React from "react";
import {
  Send,
  Edit,
  Ban,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Trash2,
  Lock,
} from "lucide-react";
import {
  DocumentDetailResponse,
  DocumentDepartment,
  AllowedActions,
} from "../../../lib/types";

interface DocumentActionsCardProps {
  doc: DocumentDetailResponse["document"];
  allowedActions: AllowedActions;
  actionLoading: boolean;
  myDeptObj: DocumentDepartment | null;
  targetDeptId: number | null;
  isChangingDeptDecision: boolean;
  setIsChangingDeptDecision: (val: boolean) => void;
  onSubmitToChecker: () => void;
  onOpenEditModal: () => void;
  onOpenCancelModal: () => void;
  onOpenCheckerApproveModal: () => void;
  onOpenRequestRevisionModal: () => void;
  onDeptApprove: (deptId: number) => void;
  onOpenDeptRejectModal: (deptId: number) => void;
  onDeleteDraft: () => void;
}

export const DocumentActionsCard: React.FC<DocumentActionsCardProps> = ({
  doc,
  allowedActions,
  actionLoading,
  myDeptObj,
  targetDeptId,
  isChangingDeptDecision,
  setIsChangingDeptDecision,
  onSubmitToChecker,
  onOpenEditModal,
  onOpenCancelModal,
  onOpenCheckerApproveModal,
  onOpenRequestRevisionModal,
  onDeptApprove,
  onOpenDeptRejectModal,
  onDeleteDraft,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
      <div>
        <h2 className="text-sm font-bold text-[#212634]">Tindakan dokumen</h2>
        <p className="text-xs text-[#717684] mt-0.5">
          Aksi yang dapat Anda lakukan saat ini
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        {/* Applicant Actions on Draft/Applicant */}
        {allowedActions.can_submit && (
          <button
            onClick={onSubmitToChecker}
            disabled={actionLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ajukan ke Checker</span>
          </button>
        )}

        {allowedActions.can_edit && (
          <button
            onClick={onOpenEditModal}
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
            onClick={onOpenCancelModal}
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
              onClick={onOpenCheckerApproveModal}
              disabled={actionLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Setujui &amp; teruskan</span>
            </button>

            <button
              onClick={onOpenRequestRevisionModal}
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
                {(!myDeptObj?.decision ||
                  myDeptObj.decision === "rejected") && (
                  <button
                    onClick={() => onDeptApprove(targetDeptId)}
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

                {(!myDeptObj?.decision ||
                  myDeptObj.decision === "approved") && (
                  <button
                    onClick={() => onOpenDeptRejectModal(targetDeptId)}
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
            onClick={onDeleteDraft}
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
              Dokumen ini telah mencapai status akhir. Alur persetujuan telah
              selesai dan tidak dapat diubah kembali.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
