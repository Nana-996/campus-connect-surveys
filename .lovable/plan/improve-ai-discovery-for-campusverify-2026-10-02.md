# Improve AI discovery for CampusVerify

## Goal
Make CampusVerify easier for AI search tools and assistants to understand, cite, and accurately describe.

## What I’ll build
- Add a public **CampusVerify Facts** page with concise, verifiable details about the platform, audiences, verification, survey targeting, credits, school partnerships, privacy boundaries, operator, country, contact email, and official website.
- Expand `llms.txt` into a structured machine-readable guide with canonical facts, supported use cases, important limitations, and links to the strongest evidence pages.
- Enrich the site’s structured data with consistent Organization, WebSite, and SoftwareApplication information, including the official logo, operator, contact point, audience, category, and supported platform.
- Add the facts page to the sitemap and link it from relevant public navigation/content so crawlers can discover it naturally.
- Preserve current product rules: all account types are represented, student verification claims remain precise, and no unsupported popularity or ranking claims are introduced.

## Verification
- Check the new page on desktop and mobile.
- Confirm page metadata, canonical URL, and structured data are present.
- Confirm the sitemap and `llms.txt` expose the new facts page.
- Confirm the app builds without errors.

## Technical details
- Use a new TanStack route at `/facts` with unique metadata and JSON-LD.
- Keep shared Organization/WebSite schema in the root document, with page-specific SoftwareApplication and FAQ schema on `/facts` where useful.
- Use the existing CampusVerify cream-and-green design system and current public components.
