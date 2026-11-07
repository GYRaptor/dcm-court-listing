import { z } from "zod";
import { todayIST } from "../utils/dates.js";

export const caseTypeEnum = z.enum([
  "BAIL",
  "CHEQUE_BOUNCE",
  "RENT_DISPUTE",
  "CIVIL_SUIT",
  "COMMERCIAL_DISPUTE",
  "PROPERTY_DISPUTE",
]);

export const partyRoleEnum = z.enum(["PETITIONER", "RESPONDENT", "ADVOCATE"]);

export const partySchema = z.object({
  name: z
    .string({ required_error: "Party name is required" })
    .trim()
    .min(2, "Party name must be at least 2 characters long"),
  role: partyRoleEnum,
});

// Case Registration Schema
export const createCaseSchema = z
  .object({
    title: z
      .string({ required_error: "Case title is required" })
      .trim()
      .min(3, "Case title must be at least 3 characters long"),
    caseType: caseTypeEnum,
    filingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Filing date must be in YYYY-MM-DD format")
      .optional(),
    isUrgent: z.boolean().default(false),
    hasExpertEvidence: z.boolean().default(false),
    parties: z
      .array(partySchema)
      .min(2, "A case must have at least two parties"),
  })
  .refine(
    (data) => {
      // Must contain at least one PETITIONER and at least one RESPONDENT
      const hasPetitioner = data.parties.some((p) => p.role === "PETITIONER");
      const hasRespondent = data.parties.some((p) => p.role === "RESPONDENT");
      return hasPetitioner && hasRespondent;
    },
    {
      message: "Parties list must include at least one PETITIONER and one RESPONDENT",
      path: ["parties"],
    }
  )
  .refine(
    (data) => {
      // Reject filing dates in the future compared to India Standard Time (todayIST)
      if (data.filingDate) {
        return data.filingDate <= todayIST();
      }
      return true;
    },
    {
      message: "Filing date cannot be in the future",
      path: ["filingDate"],
    }
  );

// Track Approval & Override Schema
export const trackActionSchema = z
  .object({
    action: z.enum(["APPROVE", "OVERRIDE"]),
    trackId: z.string().uuid("A valid Track ID is required").optional(),
    reason: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.action === "OVERRIDE") {
        return !!data.trackId && !!data.reason && data.reason.trim().length >= 10;
      }
      return true;
    },
    {
      message: "An override requires a target trackId and a reason of at least 10 characters",
      path: ["reason"],
    }
  );
