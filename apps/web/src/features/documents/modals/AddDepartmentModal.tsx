import React from "react";
import { Modal } from "../../../components/Modal";
import { Department } from "../../../lib/types";

interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedDeptToAdd: number | "";
  setSelectedDeptToAdd: (deptId: number | "") => void;
  allDepartments: Department[];
  currentDepartments: { department_id: number; name: string }[];
  userId?: number;
  actionLoading: boolean;
}

export const AddDepartmentModal: React.FC<AddDepartmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDeptToAdd,
  setSelectedDeptToAdd,
  allDepartments,
  currentDepartments,
  userId,
  actionLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Departemen Tujuan"
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-[#717684] leading-relaxed">
          Departemen baru yang ditambahkan wajib memberikan persetujuan sebelum
          dokumen berstatus Approved sesuai aturan agregasi Opsi A.
        </p>

        <div>
          <label className="block text-xs font-semibold text-[#212634] mb-1.5">
            Pilih Departemen
          </label>
          <select
            required
            value={selectedDeptToAdd}
            onChange={(e) =>
              setSelectedDeptToAdd(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 cursor-pointer"
          >
            <option value="">-- Pilih Departemen --</option>
            {allDepartments
              .filter(
                (d) =>
                  !currentDepartments.some(
                    (cur) => cur.department_id === d.id,
                  ) && Number(d.manager_id) !== userId,
              )
              .map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code}) &mdash; Mgr:{" "}
                  {dept.manager_name || "Belum ditentukan"}
                </option>
              ))}
          </select>
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
            disabled={actionLoading || !selectedDeptToAdd}
            className="px-4 py-2 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            Tambah sekarang
          </button>
        </div>
      </form>
    </Modal>
  );
};
