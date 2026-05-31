import { describe, it, expect } from "vitest";
import { SECTIONS, SECTION_ORDER } from "@/components/section-builder/sections";

describe("Section builder registry", () => {
  it("SECTIONS has entry for every type in SECTION_ORDER", () => {
    for (const type of SECTION_ORDER) {
      expect(SECTIONS[type]).toBeDefined();
      expect(SECTIONS[type].type).toBe(type);
    }
  });

  it("includes the 3 new section types from Sub-Phase D", () => {
    expect(SECTION_ORDER).toContain("upcomingSessions");
    expect(SECTION_ORDER).toContain("postsFeed");
    expect(SECTION_ORDER).toContain("membershipTiers");
  });

  it("each section schema has required fields", () => {
    for (const type of SECTION_ORDER) {
      const schema = SECTIONS[type];
      expect(schema.label).toBeTruthy();
      expect(schema.description).toBeTruthy();
      expect(schema.icon).toBeTruthy();
      expect(schema.Render).toBeTypeOf("function");
    }
  });
});
