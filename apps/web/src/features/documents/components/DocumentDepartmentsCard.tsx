import React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  DocumentDetailResponse,
  DocumentDepartment,
  AllowedActions,
} from "../../../lib/types";
import { DecisionBadge } from "../../../components/StatusBadge";

interface DocumentDepartmentsCardProps {
  doc: DocumentDetailResponse["document"];
  departments: DocumentDepartment[];
  allowedActions: AllowedActions;
  onOpenAddDeptModal: () => void;
  onRemoveDraftDept: (deptId: number) => void;
  formatDateTime: (dateStr?: string) => string;
}

export const DocumentDepartmentsCard: React.FC<
  DocumentDepartmentsCardProps
> = ({
  doc,
  departments,
  allowedActions,
  onOpenAddDeptModal,
  onRemoveDraftDept,
  formatDateTime,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#212634]">
            Departemen tujuan
          </h2>
          <p className="text-xs text-[#717684] mt-0.5">
            Seluruh departemen berikut wajib menyetujui sesuai aturan Opsi A
          </p>
        </div>

        {(allowedActions.can_add_dept ||
          (doc.status === "draft" && allowedActions.can_edit)) && (
          <button
            onClick={onOpenAddDeptModal}
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
                  <div className="font-bold text-[#212634]">{dept.name}</div>
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
                  {dept.decided_at ? formatDateTime(dept.decided_at) : "-"}
                </td>
                {doc.status === "draft" && allowedActions.can_edit && (
                  <td className="py-3.5 px-6 text-right">
                    <button
                      onClick={() => onRemoveDraftDept(dept.department_id)}
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
  );
};
