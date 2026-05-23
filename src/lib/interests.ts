// Canonical audience vocabularies shared by signup + create + feed.

export const INTEREST_TAGS: { id: string; label: string }[] = [
  { id: "tech", label: "Tech" },
  { id: "ai", label: "AI" },
  { id: "gaming", label: "Gaming" },
  { id: "science", label: "Science" },
  { id: "health", label: "Health" },
  { id: "fitness", label: "Fitness" },
  { id: "mental_health", label: "Mental health" },
  { id: "food", label: "Food" },
  { id: "travel", label: "Travel" },
  { id: "fashion", label: "Fashion" },
  { id: "beauty", label: "Beauty" },
  { id: "music", label: "Music" },
  { id: "film", label: "Film & TV" },
  { id: "books", label: "Books" },
  { id: "sports", label: "Sports" },
  { id: "finance", label: "Finance" },
  { id: "business", label: "Business" },
  { id: "politics", label: "Politics" },
  { id: "education", label: "Education" },
  { id: "environment", label: "Environment" },
  { id: "parenting", label: "Parenting" },
  { id: "relationships", label: "Relationships" },
  { id: "art", label: "Art" },
  { id: "other", label: "Other" },
];

export const INTEREST_TAG_IDS = INTEREST_TAGS.map((t) => t.id);
export const tagLabel = (id: string) =>
  INTEREST_TAGS.find((t) => t.id === id)?.label ?? id;

export const AGE_RANGES: { id: string; label: string }[] = [
  { id: "under_18", label: "Under 18" },
  { id: "18_24", label: "18–24" },
  { id: "25_34", label: "25–34" },
  { id: "35_44", label: "35–44" },
  { id: "45_54", label: "45–54" },
  { id: "55_plus", label: "55+" },
];
export const ageLabel = (id: string | null | undefined) =>
  AGE_RANGES.find((r) => r.id === id)?.label ?? id ?? "";

// Short, opinionated country list — users can also type "Other" via the form.
// Kept manageable so dropdowns stay quick. Add to it any time.
export const COUNTRIES = [
  "Ghana", "Nigeria", "Kenya", "South Africa", "Egypt", "Morocco",
  "United States", "Canada", "Mexico", "Brazil", "Argentina",
  "United Kingdom", "Ireland", "France", "Germany", "Spain", "Italy",
  "Netherlands", "Portugal", "Sweden", "Norway", "Denmark", "Finland",
  "Poland", "Turkey",
  "United Arab Emirates", "Saudi Arabia",
  "India", "Pakistan", "Bangladesh",
  "China", "Japan", "South Korea", "Singapore", "Philippines", "Indonesia",
  "Malaysia", "Thailand", "Vietnam",
  "Australia", "New Zealand",
  "Other",
] as const;
