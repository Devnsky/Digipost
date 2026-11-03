import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UserProfileCard } from "../../apps/web/src/features/account/components/UserProfileCard";
import { User } from "../../apps/web/src/types";

describe("UserProfileCard Component", () => {
  const baseUser: User = {
    id: 1,
    username: "ahmad.assistant",
    full_name: "Ahmad Assistant",
    email: "ahmad@digipost.local",
    employee_no: "EMP-001",
    role: "assistant",
    department_id: 1,
    department_name: "Information Technology",
    department_code: "IT",
    manager_id: 2,
    manager_name: "Budi Checker",
    must_change_password: false,
    is_active: true,
  };

  it("renders user information and role correctly", () => {
    const html = renderToStaticMarkup(<UserProfileCard user={baseUser} />);
    expect(html).toContain("Ahmad Assistant");
    expect(html).toContain("ahmad.assistant");
    expect(html).toContain("EMP-001");
    expect(html).toContain("Asisten / Pemohon");
    expect(html).toContain("Information Technology (IT)");
    expect(html).toContain("Budi Checker");
  });

  it("renders manager role label correctly", () => {
    const managerUser: User = {
      ...baseUser,
      role: "dept_manager",
      manager_name: undefined,
    };
    const html = renderToStaticMarkup(<UserProfileCard user={managerUser} />);
    expect(html).toContain("Manager Departemen");
    expect(html).toContain("Tidak ada (Pucuk Pimpinan)");
  });

  it("renders checker and admin role labels correctly", () => {
    const checkerUser: User = { ...baseUser, role: "checker" };
    expect(
      renderToStaticMarkup(<UserProfileCard user={checkerUser} />),
    ).toContain("Pemeriksa (Checker)");

    const adminUser: User = { ...baseUser, role: "admin" };
    expect(
      renderToStaticMarkup(<UserProfileCard user={adminUser} />),
    ).toContain("Administrator Sistem");
  });

  it("handles null user gracefully", () => {
    const html = renderToStaticMarkup(<UserProfileCard user={null} />);
    expect(html).toContain("Profil pengguna");
    expect(html).toContain("-");
  });
});
