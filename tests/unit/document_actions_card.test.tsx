import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentActionsCard } from "../../apps/web/src/features/documents/components/DocumentActionsCard";
import {
  DocumentDetailResponse,
  DocumentDepartment,
  AllowedActions,
} from "../../apps/web/src/types";

describe("DocumentActionsCard Component", () => {
  const baseDoc: DocumentDetailResponse["document"] = {
    id: 1,
    document_number: "DOC-2026-001",
    title: "Surat Pengajuan IT",
    status: "draft",
    review_stage: "applicant",
    version: 1,
    created_at: "2026-11-01T08:00:00Z",
    applicant_id: 1,
    applicant_name: "Staff IT",
    applicant_email: "staff@digipost.local",
    checker_id: 2,
  };

  const defaultActions: AllowedActions = {
    can_edit: false,
    can_submit: false,
    can_delete: false,
    can_cancel: false,
    can_checker_decide: false,
    can_dept_decide: false,
    managed_department_id: null,
    can_add_dept: false,
    can_respond: false,
    can_print: false,
    is_checker_dept_conflict: false,
  };

  const noop = () => {};

  it("renders applicant draft actions (submit, edit, delete)", () => {
    const actions: AllowedActions = {
      ...defaultActions,
      can_submit: true,
      can_edit: true,
      can_delete: true,
    };

    const html = renderToStaticMarkup(
      <DocumentActionsCard
        doc={baseDoc}
        allowedActions={actions}
        actionLoading={false}
        myDeptObj={null}
        targetDeptId={null}
        isChangingDeptDecision={false}
        setIsChangingDeptDecision={noop}
        onSubmitToChecker={noop}
        onOpenEditModal={noop}
        onOpenCancelModal={noop}
        onOpenCheckerApproveModal={noop}
        onOpenRequestRevisionModal={noop}
        onDeptApprove={noop}
        onOpenDeptRejectModal={noop}
        onDeleteDraft={noop}
      />,
    );

    expect(html).toContain("Ajukan ke Checker");
    expect(html).toContain("Edit informasi dokumen");
    expect(html).toContain("Hapus draft");
    expect(html).not.toContain("Setujui &amp; teruskan");
  });

  it("renders checker actions (approve & forward, request revision)", () => {
    const doc = { ...baseDoc, review_stage: "checker" as const };
    const actions: AllowedActions = {
      ...defaultActions,
      can_checker_decide: true,
    };

    const html = renderToStaticMarkup(
      <DocumentActionsCard
        doc={doc}
        allowedActions={actions}
        actionLoading={false}
        myDeptObj={null}
        targetDeptId={null}
        isChangingDeptDecision={false}
        setIsChangingDeptDecision={noop}
        onSubmitToChecker={noop}
        onOpenEditModal={noop}
        onOpenCancelModal={noop}
        onOpenCheckerApproveModal={noop}
        onOpenRequestRevisionModal={noop}
        onOpenCheckerRejectModal={noop}
        onDeptApprove={noop}
        onOpenDeptRejectModal={noop}
        onDeleteDraft={noop}
      />,
    );

    expect(html).toContain("Setujui &amp; teruskan");
    expect(html).toContain("Kembalikan untuk revisi");
    expect(html).toContain("Tolak pengajuan");
    expect(html).not.toContain("Ajukan ke Checker");
  });

  it("renders applicant cancel action on pending status", () => {
    const doc = { ...baseDoc, status: "pending" as const, review_stage: null };
    const actions: AllowedActions = {
      ...defaultActions,
      can_cancel: true,
    };

    const html = renderToStaticMarkup(
      <DocumentActionsCard
        doc={doc}
        allowedActions={actions}
        actionLoading={false}
        myDeptObj={null}
        targetDeptId={null}
        isChangingDeptDecision={false}
        setIsChangingDeptDecision={noop}
        onSubmitToChecker={noop}
        onOpenEditModal={noop}
        onOpenCancelModal={noop}
        onOpenCheckerApproveModal={noop}
        onOpenRequestRevisionModal={noop}
        onDeptApprove={noop}
        onOpenDeptRejectModal={noop}
        onDeleteDraft={noop}
      />,
    );

    expect(html).toContain("Batalkan dokumen");
  });

  it("renders department decision buttons when manager has not decided yet", () => {
    const doc = { ...baseDoc, status: "pending" as const, review_stage: null };
    const deptObj: DocumentDepartment = {
      relation_id: 1,
      department_id: 2,
      code: "FIN",
      name: "Finance",
      manager_id: 5,
      passed_checker: true,
      decision: null,
    };
    const actions: AllowedActions = {
      ...defaultActions,
      can_dept_decide: true,
    };

    const html = renderToStaticMarkup(
      <DocumentActionsCard
        doc={doc}
        allowedActions={actions}
        actionLoading={false}
        myDeptObj={deptObj}
        targetDeptId={2}
        isChangingDeptDecision={false}
        setIsChangingDeptDecision={noop}
        onSubmitToChecker={noop}
        onOpenEditModal={noop}
        onOpenCancelModal={noop}
        onOpenCheckerApproveModal={noop}
        onOpenRequestRevisionModal={noop}
        onDeptApprove={noop}
        onOpenDeptRejectModal={noop}
        onDeleteDraft={noop}
      />,
    );

    expect(html).toContain("Setujui dokumen");
    expect(html).toContain("Tolak dokumen");
  });

  it("renders approved decision badge and change decision button when already decided", () => {
    const doc = { ...baseDoc, status: "pending" as const, review_stage: null };
    const deptObj: DocumentDepartment = {
      relation_id: 1,
      department_id: 2,
      code: "FIN",
      name: "Finance",
      manager_id: 5,
      passed_checker: true,
      decision: "approved",
    };
    const actions: AllowedActions = {
      ...defaultActions,
      can_dept_decide: true,
    };

    const html = renderToStaticMarkup(
      <DocumentActionsCard
        doc={doc}
        allowedActions={actions}
        actionLoading={false}
        myDeptObj={deptObj}
        targetDeptId={2}
        isChangingDeptDecision={false}
        setIsChangingDeptDecision={noop}
        onSubmitToChecker={noop}
        onOpenEditModal={noop}
        onOpenCancelModal={noop}
        onOpenCheckerApproveModal={noop}
        onOpenRequestRevisionModal={noop}
        onDeptApprove={noop}
        onOpenDeptRejectModal={noop}
        onDeleteDraft={noop}
      />,
    );

    expect(html).toContain("Keputusan: Telah Disetujui");
    expect(html).toContain("Ubah Keputusan");
  });

  it("renders change decision mode allowing manager to switch to reject", () => {
    const doc = { ...baseDoc, status: "pending" as const, review_stage: null };
    const deptObj: DocumentDepartment = {
      relation_id: 1,
      department_id: 2,
      code: "FIN",
      name: "Finance",
      manager_id: 5,
      passed_checker: true,
      decision: "approved",
    };
    const actions: AllowedActions = {
      ...defaultActions,
      can_dept_decide: true,
    };

    const html = renderToStaticMarkup(
      <DocumentActionsCard
        doc={doc}
        allowedActions={actions}
        actionLoading={false}
        myDeptObj={deptObj}
        targetDeptId={2}
        isChangingDeptDecision={true}
        setIsChangingDeptDecision={noop}
        onSubmitToChecker={noop}
        onOpenEditModal={noop}
        onOpenCancelModal={noop}
        onOpenCheckerApproveModal={noop}
        onOpenRequestRevisionModal={noop}
        onDeptApprove={noop}
        onOpenDeptRejectModal={noop}
        onDeleteDraft={noop}
      />,
    );

    expect(html).toContain("Ubah keputusan: Tolak Dokumen");
    expect(html).toContain("Batal ubah keputusan");
  });

  it("renders locked terminal state for approved, rejected, or canceled documents", () => {
    for (const status of ["approved", "rejected", "canceled"] as const) {
      const doc = { ...baseDoc, status, review_stage: null };
      const html = renderToStaticMarkup(
        <DocumentActionsCard
          doc={doc}
          allowedActions={defaultActions}
          actionLoading={false}
          myDeptObj={null}
          targetDeptId={null}
          isChangingDeptDecision={false}
          setIsChangingDeptDecision={noop}
          onSubmitToChecker={noop}
          onOpenEditModal={noop}
          onOpenCancelModal={noop}
          onOpenCheckerApproveModal={noop}
          onOpenRequestRevisionModal={noop}
          onDeptApprove={noop}
          onOpenDeptRejectModal={noop}
          onDeleteDraft={noop}
        />,
      );

      expect(html).toContain("Terkunci · Final");
      expect(html).toContain("Dokumen ini telah mencapai status akhir");
    }
  });
});
