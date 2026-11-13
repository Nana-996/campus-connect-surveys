export const VAPID_PUBLIC_KEY = "BG6i_At72l5CjUD7Qeh0sOXco2qXqqI_qczNW0YpnArULM5VkL9fNRcUBj886RNfdGwQMib8nNwHNL-tuJT8zkY";

/** Who should be alerted about a newly published survey (mirrors feed visibility). */
export function matchesSurveyAudience(
  survey: { visibility: string; university_domain: string; target_universities: string[]; creator_id: string },
  person: { id: string; user_type: string | null; university_domain: string | null },
): boolean {
  if (person.id === survey.creator_id) return false;
  if (survey.visibility === "private") return false;
  if (survey.visibility === "campus" && person.university_domain !== survey.university_domain) return false;
  if (survey.visibility === "students" && person.user_type !== "student") return false;
  if (survey.target_universities.length > 0 && person.user_type === "student" &&
      !survey.target_universities.includes(person.university_domain ?? "")) return false;
  return true;
}
