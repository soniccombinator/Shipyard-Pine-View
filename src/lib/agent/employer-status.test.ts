import { describe, expect, it } from "vitest";
import { canFinishEmployerOnboarding, savedEmployerSections, summarizeEmployerStatus } from "./employer-status";

const empty = { company_name: "", city: "", description: "", accommodations_offered: [] };

describe("summarizeEmployerStatus", () => {
  it("reports nothing saved for a fresh profile", () => {
    expect(summarizeEmployerStatus(empty)).toBe("Nothing saved yet.");
    expect(summarizeEmployerStatus(null)).toBe("Nothing saved yet.");
  });

  it("lists saved and missing sections in order", () => {
    const profile = { ...empty, company_name: "Riverview Cafe", city: "Sarasota" };
    expect(summarizeEmployerStatus(profile)).toBe("Saved: basics. Missing: description, accommodations.");
  });

  it("needs both company name and city for basics", () => {
    expect(savedEmployerSections({ ...empty, city: "Sarasota" })).toEqual([]);
    expect(savedEmployerSections({ ...empty, company_name: "Riverview Cafe" })).toEqual([]);
  });

  it("says ready when everything is saved", () => {
    const full = {
      company_name: "Riverview Cafe",
      city: "Sarasota",
      description: "A neighborhood cafe.",
      accommodations_offered: ["written checklists"],
    };
    expect(summarizeEmployerStatus(full)).toBe("Everything is saved. Ready to finish.");
  });
});

describe("canFinishEmployerOnboarding", () => {
  it("requires basics only", () => {
    expect(canFinishEmployerOnboarding(empty)).toBe(false);
    expect(canFinishEmployerOnboarding({ ...empty, company_name: "Riverview Cafe", city: "Sarasota" })).toBe(true);
  });
});
