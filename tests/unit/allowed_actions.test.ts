import { describe, it, expect } from "vitest";
import { computeAllowedActions } from "../../apps/api/src/modules/documents/services/documents-permission.service";

describe("Document Allowed Actions Permission Matrix Unit Tests", () => {
  const baseDoc = {
    id: 101,
    status: "draft",
    review_stage: "applicant",
    applicant_id: 10,
    applicant_department_id: 1,
    checker_id: 20,
  };

  const sampleDepts = [
    { department_id: 2, manager_id: 30, passed_checker: true },
    { department_id: 3, manager_id: 40, passed_checker: true },
  ];

  it("Assistant pemohon berhak mengedit dan menghapus dokumen draft", () => {
    const user = { id: 10, role: "assistant", department_id: 1 };
    const actions = computeAllowedActions({
      user,
      doc: baseDoc,
      intendedDepartments: sampleDepts,
      hasVersions: true,
    });

    expect(actions.can_create).toBe(true);
    expect(actions.can_edit).toBe(true);
    expect(actions.can_submit).toBe(true);
    expect(actions.can_delete).toBe(true);
    expect(actions.can_cancel).toBe(false);
    expect(actions.can_checker_decide).toBe(false);
    expect(actions.can_dept_decide).toBe(false);
  });

  it("Assistant tidak dapat submit jika belum ada versi dokumen yang diunggah", () => {
    const user = { id: 10, role: "assistant", department_id: 1 };
    const actions = computeAllowedActions({
      user,
      doc: baseDoc,
      intendedDepartments: sampleDepts,
      hasVersions: false,
    });

    expect(actions.can_edit).toBe(true);
    expect(actions.can_submit).toBe(false);
  });

  it("Assistant tidak dapat submit jika belum ada departemen tujuan", () => {
    const user = { id: 10, role: "assistant", department_id: 1 };
    const actions = computeAllowedActions({
      user,
      doc: baseDoc,
      intendedDepartments: [],
      hasVersions: true,
    });

    expect(actions.can_edit).toBe(true);
    expect(actions.can_submit).toBe(false);
  });

  it("Assistant pemohon berhak membatalkan dokumen saat berstatus pending", () => {
    const user = { id: 10, role: "assistant", department_id: 1 };
    const pendingDoc = { ...baseDoc, status: "pending", review_stage: null };
    const actions = computeAllowedActions({
      user,
      doc: pendingDoc,
      intendedDepartments: sampleDepts,
      hasVersions: true,
    });

    expect(actions.can_edit).toBe(false);
    expect(actions.can_submit).toBe(false);
    expect(actions.can_delete).toBe(false);
    expect(actions.can_cancel).toBe(true);
    expect(actions.can_print).toBe(true);
  });

  it("Checker yang ditugaskan berhak memeriksa saat status draft dan review_stage checker", () => {
    const user = { id: 20, role: "checker", department_id: 1 };
    const checkerDoc = { ...baseDoc, review_stage: "checker" };
    const actions = computeAllowedActions({
      user,
      doc: checkerDoc,
      intendedDepartments: sampleDepts,
      hasVersions: true,
    });

    expect(actions.can_checker_decide).toBe(true);
    expect(actions.can_edit).toBe(false);
    expect(actions.can_delete).toBe(false);
  });

  it("Dept Manager dari departemen tujuan berhak memberi keputusan saat dokumen pending", () => {
    const user = { id: 30, role: "dept_manager", department_id: 2 };
    const pendingDoc = { ...baseDoc, status: "pending", review_stage: null };
    const actions = computeAllowedActions({
      user,
      doc: pendingDoc,
      intendedDepartments: sampleDepts,
      hasVersions: true,
    });

    expect(actions.can_dept_decide).toBe(true);
    expect(actions.managed_department_id).toBe(2);
    expect(actions.can_checker_decide).toBe(false);
    expect(actions.can_edit).toBe(false);
  });

  it("Manager dari departemen pemilik dokumen berhak menambah departemen tujuan saat pending", () => {
    const ownerManager = { id: 50, role: "dept_manager", department_id: 1 };
    const pendingDoc = { ...baseDoc, status: "pending", review_stage: null };
    const actions = computeAllowedActions({
      user: ownerManager,
      doc: pendingDoc,
      intendedDepartments: sampleDepts,
      hasVersions: true,
    });

    expect(actions.can_add_dept).toBe(true);
    expect(actions.can_dept_decide).toBe(false); // Departemen 1 bukan salah satu tujuan di sampleDepts
  });

  it("Checker yang ditugaskan berhak menambah departemen tujuan saat pending", () => {
    const checkerUser = { id: 20, role: "checker", department_id: 1 };
    const pendingDoc = { ...baseDoc, status: "pending", review_stage: null };
    const actions = computeAllowedActions({
      user: checkerUser,
      doc: pendingDoc,
      intendedDepartments: sampleDepts,
      hasVersions: true,
    });

    expect(actions.can_add_dept).toBe(true);
  });

  it("Dept Manager dari departemen tujuan yang lolos checker berhak menambah departemen tujuan saat pending (TC-06, BR-15)", () => {
    const targetDeptManager = { id: 30, role: "dept_manager", department_id: 2 };
    const pendingDoc = { ...baseDoc, status: "pending", review_stage: null };
    const actions = computeAllowedActions({
      user: targetDeptManager,
      doc: pendingDoc,
      intendedDepartments: sampleDepts,
      hasVersions: true,
    });

    expect(actions.can_add_dept).toBe(true);
    expect(actions.can_dept_decide).toBe(true);
    expect(actions.can_respond).toBe(true);
  });

  it("Dokumen berstatus approved mengunci seluruh aksi mutasi", () => {
    const user = { id: 10, role: "assistant", department_id: 1 };
    const approvedDoc = { ...baseDoc, status: "approved", review_stage: null };
    const actions = computeAllowedActions({
      user,
      doc: approvedDoc,
      intendedDepartments: sampleDepts,
      hasVersions: true,
    });

    expect(actions.can_edit).toBe(false);
    expect(actions.can_submit).toBe(false);
    expect(actions.can_delete).toBe(false);
    expect(actions.can_cancel).toBe(false);
    expect(actions.can_checker_decide).toBe(false);
    expect(actions.can_dept_decide).toBe(false);
    expect(actions.can_add_dept).toBe(false);
    expect(actions.can_print).toBe(true);
  });

  it("is_checker_dept_conflict hanya true jika Checker memimpin salah satu departemen tujuan", () => {
    // Skenario A: Checker (id 20) memimpin departemen 2 yang merupakan salah satu intendedDepartments
    const deptsWithCheckerAsManager = [
      { department_id: 2, manager_id: 20, passed_checker: true },
      { department_id: 3, manager_id: 40, passed_checker: true },
    ];
    const checkerUser = { id: 20, role: "checker", department_id: 1 };
    const actionsConflict = computeAllowedActions({
      user: checkerUser,
      doc: baseDoc,
      intendedDepartments: deptsWithCheckerAsManager,
      hasVersions: true,
    });
    expect(actionsConflict.is_checker_dept_conflict).toBe(true);

    // Skenario B: Checker (id 20) memiliki role dept_manager tetapi departemen yang dipimpin BUKAN tujuan dokumen
    const deptManagerChecker = { id: 20, role: "dept_manager", department_id: 1 };
    const actionsNoConflict = computeAllowedActions({
      user: deptManagerChecker,
      doc: baseDoc,
      intendedDepartments: sampleDepts, // managers: 30 & 40 (tidak ada 20)
      hasVersions: true,
    });
    expect(actionsNoConflict.is_checker_dept_conflict).toBe(false);
  });
});
