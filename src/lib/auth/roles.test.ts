import { describe, expect, it } from "vitest";
import {
  normalizeRole,
  hasTier,
  isTeamMember,
  minTierForPath,
  isOwnerOnlyAdminPath,
} from "./roles";

describe("normalizeRole", () => {
  it("maps canonical tiers", () => {
    expect(normalizeRole("owner")).toBe("owner");
    expect(normalizeRole("manager")).toBe("manager");
    expect(normalizeRole("staff")).toBe("staff");
    expect(normalizeRole("customer")).toBe("customer");
  });

  it("maps legacy values onto tiers", () => {
    expect(normalizeRole("admin")).toBe("owner");
    expect(normalizeRole("employee")).toBe("staff");
    expect(normalizeRole("team")).toBe("staff");
    expect(normalizeRole("barista")).toBe("staff");
    expect(normalizeRole("lead")).toBe("manager");
    expect(normalizeRole("team_lead")).toBe("manager");
  });

  it("is case/whitespace tolerant and defaults to customer", () => {
    expect(normalizeRole("  OWNER ")).toBe("owner");
    expect(normalizeRole("Employee")).toBe("staff");
    expect(normalizeRole(null)).toBe("customer");
    expect(normalizeRole(undefined)).toBe("customer");
    expect(normalizeRole("gibberish")).toBe("customer");
  });
});

describe("hasTier", () => {
  it("enforces ascending privilege", () => {
    expect(hasTier("owner", "manager")).toBe(true);
    expect(hasTier("owner", "staff")).toBe(true);
    expect(hasTier("manager", "owner")).toBe(false);
    expect(hasTier("manager", "staff")).toBe(true);
    expect(hasTier("staff", "manager")).toBe(false);
    expect(hasTier("staff", "staff")).toBe(true);
    expect(hasTier("customer", "staff")).toBe(false);
  });

  it("isTeamMember covers staff and above", () => {
    expect(isTeamMember("staff")).toBe(true);
    expect(isTeamMember("manager")).toBe(true);
    expect(isTeamMember("owner")).toBe(true);
    expect(isTeamMember("customer")).toBe(false);
  });
});

describe("minTierForPath", () => {
  it("KDS + staff surfaces require staff tier", () => {
    expect(minTierForPath("/kds")).toBe("staff");
    expect(minTierForPath("/kds/parking")).toBe("staff");
    expect(minTierForPath("/staff")).toBe("staff");
    expect(minTierForPath("/staff/waste-log")).toBe("staff");
    expect(minTierForPath("/training")).toBe("staff");
  });

  it("admin requires manager tier; public routes have no gate", () => {
    expect(minTierForPath("/admin")).toBe("manager");
    expect(minTierForPath("/admin/kds")).toBe("manager");
    expect(minTierForPath("/menu")).toBeNull();
    expect(minTierForPath("/")).toBeNull();
    expect(minTierForPath("/account")).toBeNull();
  });
});

describe("isOwnerOnlyAdminPath", () => {
  it("flags owner-only sections including subpaths", () => {
    expect(isOwnerOnlyAdminPath("/admin/settings")).toBe(true);
    expect(isOwnerOnlyAdminPath("/admin/settings/pricing")).toBe(true);
    expect(isOwnerOnlyAdminPath("/admin/data-export")).toBe(true);
    expect(isOwnerOnlyAdminPath("/admin/insights")).toBe(true);
    expect(isOwnerOnlyAdminPath("/admin/analytics")).toBe(true);
    expect(isOwnerOnlyAdminPath("/admin/accounting")).toBe(true);
    expect(isOwnerOnlyAdminPath("/admin/pricing")).toBe(true);
  });

  it("does not flag manager-accessible admin pages", () => {
    expect(isOwnerOnlyAdminPath("/admin")).toBe(false);
    expect(isOwnerOnlyAdminPath("/admin/kds")).toBe(false);
    expect(isOwnerOnlyAdminPath("/admin/orders")).toBe(false);
    expect(isOwnerOnlyAdminPath("/admin/inventory")).toBe(false);
    expect(isOwnerOnlyAdminPath("/admin/settingsfoo")).toBe(false);
  });
});
