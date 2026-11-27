import { z } from "zod";

// School hints are optional; malformed shared links must not block registration.
export const signupSearchSchema = z.object({
  school: z.string().trim().max(100).regex(/^[a-z0-9-]+$/).optional().catch(undefined),
});

export async function loadOptionalSignupSchool<T>(
  school: string | undefined,
  lookup: (slug: string) => Promise<T | null>,
): Promise<T | null> {
  if (!school) return null;
  try {
    return await lookup(school);
  } catch {
    // Membership and welcome credits still depend on the verified email domain.
    return null;
  }
}