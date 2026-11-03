import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ManagerDashboardView } from "../../apps/web/src/features/dashboard/components/ManagerDashboardView";
import {
  User,
  DashboardStats,
  DocumentListItem,
  Department,
} from "../../apps/web/src/types";

describe("ManagerDashboardView Component", () => {
  const mockUser: User = {
    id: 5,
    username: "hendra.manager",
    full_name: "Hendra Gunawan",
    email: "hendra@digipost.local",
    role: "dept_manager",
    department_id: 2,
    department_name: "Finance & Accounting",
    department_code: "FIN",
    must_change_password: false,
    is_active: true,
  };

  const mockStats: DashboardStats = {
    myDocuments: {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      canceled: 0,
    },
    checkerQueue: 0,
    deptDocuments: {
      total: 20,
      pending: 5,
      approved: 12,
      rejected: 2,
      canceled: 1,
    },
    oldestPending: [
      {
        document_id: 88,
        document_number: "DOC-2026-088",
        title: "Perjanjian Kerjasama Vendor",
        applicant_name: "Ahmad Staff",
        forwarded_at: "2026-10-25T10:00:00Z",
        pending_days: 9,
        total_depts: 3,
        approved_count: 1,
        rejected_count: 0,
        pending_count: 2,
      },
    ],
  };

  const mockDocs: DocumentListItem[] = [
    {
      id: 88,
      document_number: "DOC-2026-088",
      title: "Perjanjian Kerjasama Vendor",
      status: "pending",
      review_stage: null,
      version: 1,
      created_at: "2026-10-25T08:00:00Z",
    },
  ];

  const mockDepts: Department[] = [
    { id: 1, code: "IT", name: "Information Technology", manager_id: 2 },
    { id: 2, code: "FIN", name: "Finance & Accounting", manager_id: 5 },
  ];

  const noop = () => {};

  it("renders manager executive dashboard with department statistics and document table", () => {
    const html = renderToStaticMarkup(
      <ManagerDashboardView
        user={mockUser}
        stats={mockStats}
        documents={mockDocs}
        totalDocs={1}
        totalPages={1}
        page={1}
        setPage={noop}
        statusTab="all"
        setStatusTab={noop}
        searchQuery=""
        setSearchQuery={noop}
        dateFrom=""
        setDateFrom={noop}
        dateTo=""
        setDateTo={noop}
        applicantDeptId=""
        setApplicantDeptId={noop}
        departments={mockDepts}
        loading={false}
        error=""
        hasActiveFilters={false}
        handleSearchSubmit={noop}
        handleClearFilters={noop}
        onSelectDocument={noop}
      />,
    );

    expect(html).toContain("Dashboard");
    expect(html).toContain("Hendra Gunawan");
    expect(html).toContain("Perjanjian Kerjasama Vendor");
    expect(html).toContain("DOC-2026-088");
    expect(html).toContain("All Latest Documents intended for my Dept.");
    expect(html).toContain("Menunggu persetujuan");
  });
});
