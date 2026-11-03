import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentNoticeBanner } from "../../apps/web/src/features/documents/components/DocumentNoticeBanner";
import { DocumentDetailResponse, ResponseItem } from "../../apps/web/src/types";

describe("DocumentNoticeBanner Component", () => {
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
    checker_name: "Head of IT",
  };

  it("renders draft banner for applicant when review_stage is applicant without revision notes", () => {
    const html = renderToStaticMarkup(
      <DocumentNoticeBanner doc={baseDoc} responses={[]} />,
    );
    expect(html).toContain("Draft (Applicant)");
    expect(html).toContain("sebelum mengajukan ke Checker");
  });

  it("renders checker queue banner when review_stage is checker", () => {
    const doc = {
      ...baseDoc,
      review_stage: "checker" as const,
    };
    const html = renderToStaticMarkup(
      <DocumentNoticeBanner doc={doc} responses={[]} />,
    );
    expect(html).toContain("pemeriksaan atasan langsung");
    expect(html).toContain("Head of IT");
  });

  it("renders revision requested banner when applicant draft has revision notes", () => {
    const responses: ResponseItem[] = [
      {
        id: 101,
        author_id: 2,
        author_role: "checker",
        author_name: "Head of IT",
        type: "revision_request",
        body: "Mohon lengkapi estimasi biaya",
        visible_to_dept: false,
        created_at: "2026-11-01T09:00:00Z",
      },
    ];
    const html = renderToStaticMarkup(
      <DocumentNoticeBanner doc={baseDoc} responses={responses} />,
    );
    expect(html).toContain("Checker meminta revisi terhadap dokumen ini");
    expect(html).toContain("Periksa catatan revisi");
  });

  it("renders pending banner explaining Opsi A consensus", () => {
    const doc = {
      ...baseDoc,
      status: "pending" as const,
      review_stage: null,
    };
    const html = renderToStaticMarkup(
      <DocumentNoticeBanner doc={doc} responses={[]} />,
    );
    expect(html).toContain("Opsi A");
    expect(html).toContain("seluruh departemen harus menyetujui");
  });

  it("renders approved final banner", () => {
    const doc = {
      ...baseDoc,
      status: "approved" as const,
      review_stage: null,
    };
    const html = renderToStaticMarkup(
      <DocumentNoticeBanner doc={doc} responses={[]} />,
    );
    expect(html).toContain("Disetujui secara final");
    expect(html).toContain("stempel validasi sistem");
  });

  it("renders rejected final banner", () => {
    const doc = {
      ...baseDoc,
      status: "rejected" as const,
      review_stage: null,
    };
    const html = renderToStaticMarkup(
      <DocumentNoticeBanner doc={doc} responses={[]} />,
    );
    expect(html).toContain("Ditolak secara final");
    expect(html).toContain("dihentikan secara permanen");
  });

  it("renders canceled banner when applicant canceled document", () => {
    const doc = {
      ...baseDoc,
      status: "canceled" as const,
      review_stage: null,
    };
    const html = renderToStaticMarkup(
      <DocumentNoticeBanner doc={doc} responses={[]} />,
    );
    expect(html).toContain("Dibatalkan");
    expect(html).toContain("oleh pemohon");
  });
});
