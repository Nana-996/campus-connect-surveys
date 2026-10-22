import { z } from "zod";

const ACADEMIC_RE = /(^|\.)edu$|\.edu\.[a-z]{2,6}$|\.ac\.[a-z]{2,6}$|\.uni\.[a-z]{2,6}$/i;

export function isAcademicEmail(email: string) {
  return ACADEMIC_RE.test(email.trim().split("@")[1] ?? "");
}

export function sharedSurveySignupMetadata(email: string, graduationMonth: string) {
  const domain = email.trim().split("@")[1]?.toLowerCase() ?? "";
  if (!isAcademicEmail(email)) return { user_type: "general", full_name: "" };
  const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Enter your expected graduation month and year.").parse(graduationMonth);
  return {
    user_type: "student",
    full_name: "",
    university_name: domain,
    graduation_date: `${month}-01`,
  };
}