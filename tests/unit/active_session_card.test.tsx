import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../apps/web/src/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

import { ActiveSessionCard } from "../../apps/web/src/features/account/components/ActiveSessionCard";

describe("ActiveSessionCard Component", () => {
  it("renders active session indicators, security details, and logout action", () => {
    const html = renderToStaticMarkup(<ActiveSessionCard />);

    expect(html).toContain("Sesi aktif");
    expect(html).toContain("Sesi Aktif");
    expect(html).toContain("Cookie HTTP-only (Session Token)");
    expect(html).toContain("Auto-logout saat inaktif");
    expect(html).toContain("Keluar dari sesi ini");
    expect(html).toContain("perangkat komputer bersama");
  });
});
