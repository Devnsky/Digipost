import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangePasswordCard } from "../../apps/web/src/features/account/components/ChangePasswordCard";

describe("ChangePasswordCard Component", () => {
  it("renders form fields and password requirements", () => {
    const html = renderToStaticMarkup(
      <ChangePasswordCard username="ahmad.assistant" />,
    );

    expect(html).toContain("Ganti password");
    expect(html).toContain("Password saat ini");
    expect(html).toContain("Password baru");
    expect(html).toContain("Konfirmasi password baru");
    expect(html).toContain("Ketentuan password:");
    expect(html).toContain("Minimal 10 karakter");
    expect(html).toContain("Memuat kombinasi huruf (a-z, A-Z) dan angka (0-9)");
    expect(html).toContain("Simpan password baru");
  });
});
