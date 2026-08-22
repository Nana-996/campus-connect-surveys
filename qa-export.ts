import { computeSurveyStats } from "@/lib/report/stats";
import { buildResearchReport, DEFAULT_REPORT_OPTIONS } from "@/lib/report/pdf";
import { writeFileSync } from "fs";

const questions = [
  { id: "q1", type: "choice", text: "Which best describes your current role at your institution?", options: ["Undergraduate student", "Postgraduate student", "Faculty / lecturer", "Independent researcher", "Other"], required: true },
  { id: "q2", type: "rating", text: "How confident are you in finding enough respondents for your research?", required: true },
  { id: "q3", type: "text", text: "What is the biggest obstacle you face when collecting survey responses?", required: false },
  { id: "q4", type: "choice", text: "How often do you conduct surveys?", options: ["Weekly", "Monthly", "Once a term", "Once a year", "Rarely", "This is my first", "Not sure"], required: false },
];

const opts = questions[0].options!;
const rows: any[] = [];
for (let i = 0; i < 87; i++) {
  rows.push({
    id: `r${i}`,
    respondent_id: `p-${i % 40}`,
    created_at: new Date(Date.UTC(2026, 6, 1 + (i % 21), 9, i % 59)).toISOString(),
    duration_ms: 60000 + (i % 17) * 9000,
    answers: {
      q1: opts[i % opts.length],
      q2: String((i % 5) + 1),
      q3: i % 3 === 0 ? "" : `Recruiting people outside my own department is really difficult and the response rate is poor ${i}. Incentives would help a lot.`,
      q4: questions[3].options![i % 7],
    },
  });
}
const profiles: any = {};
for (let i = 0; i < 40; i++) {
  profiles[`p-${i}`] = {
    id: `p-${i}`,
    university_name: ["University of Ghana", "KNUST", "Ashesi University", "University of Lagos"][i % 4],
    department: ["Pharmacy", "Economics", "Computer Science", "Sociology", "Public Health"][i % 5],
    year: ["Year 1", "Year 2", "Year 3", "Year 4"][i % 4],
    country: ["Ghana", "Nigeria", "Kenya"][i % 3],
    age_range: ["18-24", "25-34", "35-44"][i % 3],
  };
}

const survey: any = {
  id: "3f2a8b1c-0000-4444-8888-abcdefabcdef",
  title: "Barriers to research participation among students and researchers",
  description: "A cross-institutional study of how researchers recruit respondents and what stops people from participating in academic surveys.",
  questions,
  created_at: "2026-06-28T10:00:00Z",
  expires_at: "2026-09-01T10:00:00Z",
  response_goal: 120,
  tier: "pro",
  visibility: "everyone",
  university_domain: "ug.edu.gh",
  target_department: "Pharmacy",
  target_country: "Ghana",
  target_interests: ["research methods", "public health"],
  required_criteria: ["country"],
  is_active: true,
};

const stats = computeSurveyStats(survey, rows, profiles, 103);
const blob = await buildResearchReport({
  survey,
  stats,
  rows,
  options: { ...DEFAULT_REPORT_OPTIONS, filtersLabel: "country = Ghana", preparedBy: "Nana Djan", verbatimLimit: 8 },
});
writeFileSync("/tmp/qa/report.pdf", Buffer.from(await blob.arrayBuffer()));
console.log("ok", stats.n, stats.questions.length);
