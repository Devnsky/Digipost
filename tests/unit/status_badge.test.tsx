import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StatusBadge,
  DecisionBadge,
} from "../../apps/web/src/components/StatusBadge";

describe("StatusBadge Component", () => {
  it("renders 'Menunggu pemeriksaan atasan' when draft and review_stage is checker", () => {
    const html = renderToStaticMarkup(
      <StatusBadge status="draft" reviewStage="checker" />,
    );
    expect(html).toContain("Menunggu pemeriksaan atasan");
    expect(html).toContain("bg-[#f0effe]");
  });

  it("renders 'Draft' when draft and review_stage is applicant", () => {
    const html = renderToStaticMarkup(
      <StatusBadge status="draft" reviewStage="applicant" />,
    );
    expect(html).toContain("Draft");
    expect(html).not.toContain("Revisi diminta");
  });

  it("renders 'Revisi diminta' sub-badge when hasRevision is true", () => {
    const html = renderToStaticMarkup(
      <StatusBadge status="draft" reviewStage="applicant" hasRevision={true} />,
    );
    expect(html).toContain("Draft");
    expect(html).toContain("Revisi diminta");
  });

  it("renders 'Pending' badge correctly", () => {
    const html = renderToStaticMarkup(<StatusBadge status="pending" />);
    expect(html).toContain("Pending");
    expect(html).toContain("bg-[#fef3c7]");
  });

  it("renders 'Approved' badge correctly", () => {
    const html = renderToStaticMarkup(<StatusBadge status="approved" />);
    expect(html).toContain("Approved");
    expect(html).toContain("bg-[#ecfdf5]");
  });

  it("renders 'Rejected' badge correctly", () => {
    const html = renderToStaticMarkup(<StatusBadge status="rejected" />);
    expect(html).toContain("Rejected");
    expect(html).toContain("bg-[#fef2f2]");
  });

  it("renders 'Canceled' badge correctly", () => {
    const html = renderToStaticMarkup(<StatusBadge status="canceled" />);
    expect(html).toContain("Canceled");
    expect(html).toContain("bg-[#f3f4f6]");
  });
});

describe("DecisionBadge Component", () => {
  it("renders 'Approved' for approved decision", () => {
    const html = renderToStaticMarkup(<DecisionBadge decision="approved" />);
    expect(html).toContain("Approved");
    expect(html).toContain("bg-[#ecfdf5]");
  });

  it("renders 'Rejected' for rejected decision", () => {
    const html = renderToStaticMarkup(<DecisionBadge decision="rejected" />);
    expect(html).toContain("Rejected");
    expect(html).toContain("bg-[#fef2f2]");
  });

  it("renders 'Belum memutuskan' for null decision", () => {
    const html = renderToStaticMarkup(<DecisionBadge decision={null} />);
    expect(html).toContain("Belum memutuskan");
    expect(html).toContain("bg-[#f3f4f6]");
  });
});
