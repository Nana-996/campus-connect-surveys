import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyAccount from "./tools/get-my-account";
import listMySurveys from "./tools/list-my-surveys";
import getSurvey from "./tools/get-survey";
import listSurveyResponses from "./tools/list-survey-responses";
import listAvailableSurveys from "./tools/list-available-surveys";

// Issuer must be the direct Supabase host; the project ref is inlined at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "campus-connect-surveys",
  title: "Campus Connect Surveys",
  version: "0.1.0",
  instructions:
    "Tools for CampusVerify, a campus-scoped survey platform. Use `get_my_account` for the signed-in member's profile and credit balance, `list_my_surveys` and `get_survey` to inspect surveys they created, `list_survey_responses` to read collected answers, and `list_available_surveys` to find surveys they can answer. All data is scoped to the signed-in member by row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyAccount, listMySurveys, getSurvey, listSurveyResponses, listAvailableSurveys],
});
