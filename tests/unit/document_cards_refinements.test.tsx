import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentDiscussionCard } from "../../apps/web/src/features/documents/components/DocumentDiscussionCard";
import { DocumentTimelineCard } from "../../apps/web/src/features/documents/components/DocumentTimelineCard";
import { DocumentInfoCard } from "../../apps/web/src/features/documents/components/DocumentInfoCard";
import { ResponseItem, ApprovalLogItem, DocumentVersion, AllowedActions } from "../../apps/web/src/types";

describe("Document Component Refinements Unit Tests (Audit Putaran 2)", () => {
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
  const dummyFormatter = (d?: string) => d || "-";

  it("DocumentDiscussionCard menampilkan badge 'Tanggapan Departemen' untuk author_role dept_manager", () => {
    const responses: ResponseItem[] = [
      {
        id: 1,
        author_id: 30,
        author_name: "Manager Legal",
        author_role: "dept_manager",
        department_name: "Legal & Compliance",
        type: "comment",
        body: "Dokumen telah kami telaah dan tidak ada klausul berisiko.",
        visible_to_dept: true,
        created_at: "2026-11-03T10:00:00Z",
      },
    ];

    const html = renderToStaticMarkup(
      <DocumentDiscussionCard
        responses={responses}
        allowedActions={defaultActions}
        responseBody=""
        setResponseBody={noop}
        onSendResponse={noop}
        actionLoading={false}
        formatDateTime={dummyFormatter}
      />,
    );

    expect(html).toContain("Tanggapan Departemen");
    expect(html).not.toContain("Catatan Checker");
  });

  it("DocumentDiscussionCard menampilkan badge 'Catatan Checker' untuk author_role checker", () => {
    const responses: ResponseItem[] = [
      {
        id: 2,
        author_id: 20,
        author_name: "Budi Checker",
        author_role: "checker",
        department_name: "Teknologi Informasi",
        type: "comment",
        body: "Periksa kembali lampiran anggaran.",
        visible_to_dept: false,
        created_at: "2026-11-03T09:00:00Z",
      },
    ];

    const html = renderToStaticMarkup(
      <DocumentDiscussionCard
        responses={responses}
        allowedActions={defaultActions}
        responseBody=""
        setResponseBody={noop}
        onSendResponse={noop}
        actionLoading={false}
        formatDateTime={dummyFormatter}
      />,
    );

    expect(html).toContain("Catatan Checker");
    expect(html).not.toContain("Tanggapan Departemen");
  });

  it("DocumentTimelineCard menampilkan 'Sistem' saat actor_name kosong/null pada aksi agregasi", () => {
    const logs: ApprovalLogItem[] = [
      {
        id: 1,
        action: "aggregate",
        from_status: "pending",
        to_status: "approved",
        note: "Semua departemen telah memutuskan",
        created_at: "2026-11-03T12:00:00Z",
        actor_name: "",
      },
    ];

    const html = renderToStaticMarkup(
      <DocumentTimelineCard logs={logs} formatDateTime={dummyFormatter} />,
    );

    expect(html).toContain("Oleh <strong class=\"text-[#212634]\">Sistem</strong>");
  });

  it("DocumentInfoCard menampilkan nomor versi berkas fisik (version_no), bukan optimistic lock doc.version", () => {
    const doc: any = {
      id: 1,
      document_number: "IAC-26110001",
      title: "Dokumen IT",
      applicant_name: "Staff",
      applicant_department_name: "IT",
      version: 5, // Optimistic lock counter = 5
      created_at: "2026-11-01T00:00:00Z",
    };

    const currentVersionObj: DocumentVersion = {
      id: 1,
      version_no: 1, // Physical file version = 1
      file_name: "dokumen_it_v1.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
      checksum: "abc",
      uploaded_at: "2026-11-01T00:00:00Z",
      uploaded_by_name: "Staff",
    };

    const html = renderToStaticMarkup(
      <DocumentInfoCard
        doc={doc}
        currentVersionObj={currentVersionObj}
        allowedActions={defaultActions}
        openPreview={noop}
        onOpenUploadModal={noop}
        formatDate={dummyFormatter}
        formatDateTime={dummyFormatter}
        formatFileSize={() => "1 KB"}
      />,
    );

    // Box Versi Berkas Terkini harus menampilkan Versi 1, bukan Versi 5
    expect(html).toContain("Versi 1");
  });
});

