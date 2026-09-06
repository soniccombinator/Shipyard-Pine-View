import { describe, expect, it } from "vitest";
import { signUpSchema } from "./schemas";

/**
 * Age gate (docs/RISKS_AND_GAPS.md section 2e): the prototype scopes out
 * minors rather than half-supporting them (no parental consent flow, no
 * student-data handling). A checkbox is only present in FormData when
 * checked -- "on" when checked, absent entirely otherwise -- which is what
 * these cases exercise.
 */
const BASE_FIELDS = {
  full_name: "Jordan Rivera",
  email: "jordan@example.com",
  password: "password123",
  role: "employee",
};

describe("signUpSchema age gate", () => {
  it("requires an invitation for mentors even after age confirmation", () => {
    expect(signUpSchema.safeParse({ ...BASE_FIELDS, role: "mentor", age_confirmed: "on" }).success).toBe(false);
  });
  it("rejects signup when the age checkbox was never checked (field absent from FormData)", () => {
    const result = signUpSchema.safeParse({ ...BASE_FIELDS });
    expect(result.success).toBe(false);
    if (!result.success) {
      const ageIssue = result.error.issues.find((i) => i.path[0] === "age_confirmed");
      expect(ageIssue).toBeDefined();
    }
  });

  it("rejects signup when the field is present but not the checked value", () => {
    const result = signUpSchema.safeParse({ ...BASE_FIELDS, age_confirmed: "off" });
    expect(result.success).toBe(false);
  });

  it("accepts signup once the box is checked", () => {
    const result = signUpSchema.safeParse({ ...BASE_FIELDS, age_confirmed: "on" });
    expect(result.success).toBe(true);
  });
});
