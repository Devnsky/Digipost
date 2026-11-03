import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantDashboardView } from "../../apps/web/src/features/dashboard/components/AssistantDashboardView";
import {
  User,
  DashboardStats,
  DocumentListItem,
} from "../../apps/web/src/types";

describe("AssistantDashboardView Component", () => {
  const mockUser: User = {
    id: 1,
    username: "ahmad.assistant",
    full_name: "Ahmad Dahlan",
    email: "ahmad@digipost.local",
    employee_no: "EMP-001",
    role: "assistant",
    must_change_password: false,
    is_active: true,
  };

  const mockStats: DashboardStats = {
    myDocuments: {
      total: 12,
      draft: 3,
      pending: 4,
      approved: 4,
      rejected: 1,
      canceled: 0,
    },
    checkerQueue: 0,
    deptDocuments: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      canceled: 0,
    },
    oldestPending: [],
  };

  const mockDocs: DocumentListItem[] = [
    {
      id: 101,
      document_number: "DOC-2026-001",
      title: "Pengadaan Perangkat Server",
      status: "pending",
      review_stage: null,
      version: 1,
      created_at: "2026-11-01T08:00:00Z",
    },
  ];

  const noop = () => {};

  it("renders welcome greeting, metric summary cards, and documents list", () => {
    const html = renderToStaticMarkup(
      <AssistantDashboardView
        user={mockUser}
        stats={mockStats}
        documents={mockDocs}
        totalDocs={1}
        statusTab="all"
        setStatusTab={noop}
        searchQuery=""
        setSearchQuery={noop}
        recentLogs={[]}
        loading={false}
        error=""
        handleSearchSubmit={noop}
        onNavigate={noop}
        onSelectDocument={noop}
      />,
    );

    expect(html).toContain("Ahmad");
    expect(html).toContain("Pengadaan Perangkat Server");
    expect(html).toContain("DOC-2026-001");
    expect(html).toContain("Total dokumen");
    expect(html).toContain("Pending");
    expect(html).toContain("Approved");
  });

  it("renders empty state when there are no documents matching filter", () => {
    const html = renderToStaticMarkup(
      <AssistantDashboardView
        user={mockUser}
        stats={mockStats}
        documents={[]}
        totalDocs={0}
        statusTab="all"
        setStatusTab={noop}
        searchQuery=""
        setSearchQuery={noop}
        recentLogs={[]}
        loading={false}
        error=""
        handleSearchSubmit={noop}
        onNavigate={noop}
        onSelectDocument={noop}
      />,
    );

    expect(html).toContain("Tidak ada dokumen");
  });
});
