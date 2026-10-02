# Improve CampusVerify search visibility

## Goal
Make CampusVerify more discoverable on Google for searches about survey platforms, academic research surveys, student respondents, and paid survey participation.

## Context from research
- campus-verify.live has no search rankings yet (new domain — normal).
- Target keywords are low-competition: "student survey platform", "academic research surveys", "online survey tool" all show low difficulty. Realistic to rank with good content.
- The site already has: sitemap.xml, robots.txt, FAQ structured data, per-page titles/descriptions, Google Search Console verification. Foundations are good; the gap is content depth and keyword coverage.

## Changes

### 1. New blog articles (biggest impact)
Add 3 new articles targeting the researched keywords, matching the existing blog style:
- **"How to do a survey for academic research"** — targets "academic research surveys" and its question keywords (how to do a survey for academic research, how to make a professional academic research survey questionnaire).
- **"Choosing an online survey tool for research"** — targets "online survey tool" / "best online survey tool for academic research".
- **"Paid surveys for students: how research credits work"** — targets "paid surveys for students" (70/mo, the highest-volume relevant term) and explains CampusVerify's credit model honestly.

Each article: unique title/description/og metadata, Article structured data, internal links to /signup, /pricing, /guide, and the other articles.

### 2. Homepage keyword enrichment
- Expand the homepage description and FAQ schema answers to naturally include "survey platform", "academic research", "student respondents", "research participants".
- Add a short "Who uses CampusVerify" section with indexable text for each audience (students, researchers, organisations, community respondents) — more relevant text for crawlers without changing the design language.

### 3. Metadata polish on existing pages
- /pricing, /guide, /about, /schools: tighten titles/descriptions around target terms (e.g. pricing page mentions "survey credits", guide mentions "how to create a survey").
- Add canonical links where missing.

### 4. Sitemap & discovery files
- Add the 3 new blog URLs to sitemap.xml.
- Expand llms.txt with the new articles and a richer site description for AI search engines.

## Technical details
- Content-only frontend changes: new route files under src/routes/, edits to index.tsx head/copy, sitemap[.]xml.ts, llms.txt.
- Follow the existing blog article structure (blog.student-survey-questions-guide.tsx) for consistent styling and metadata patterns.
- No database, auth, or logic changes.
- Verify with a build check and a quick browser pass on the new pages.

## After this ships (user actions, not code)
- Publish the site so the new pages go live.
- In Google Search Console (already verified): request indexing for the new pages.
- Rankings typically take weeks to appear for a new domain; content is the lever we control today.
