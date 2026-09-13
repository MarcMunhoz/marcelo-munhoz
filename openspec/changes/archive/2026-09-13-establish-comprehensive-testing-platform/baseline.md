# Legacy Test Migration Baseline

Recorded 2026-09-01 before installing the new test platform.

## Legacy suite inventory

- **Test files:** 20 files matching `app/tests/*.test.js`; the session-lifecycle harness is a helper and is excluded.
- **Cases:** 337 top-level `it(...)` cases.
- **Per-file case counts:** admin access 5; admin authentication 21; admin frontend 76; admin session lifecycle 22; API base 6; article locale round-trip 1; author photos 8; blog archive 10; blog frontend 15; blog navigation round-trip 3; build credential scan 2; Cloudinary media 15; composition API migration 4; Contentful admin 41; Contentful management facade 34; Contentful proxy 49; CORS policy 1; public responsive layout 3; responsive media 2; routing configuration 19.

## Source-inspection migration surface

Six suites import `node:fs`: admin frontend, blog frontend, build credential scan, composition API migration, public responsive layout, and routing configuration. The project-source structural assertions total 56: admin frontend 27, blog frontend 10, public responsive layout 3, composition API migration 4, and routing configuration 12. The two build credential scanner cases execute the scanner against temporary fixtures and remain contract tests rather than source inspections.

## Route matrix

| Area | Routes |
| --- | --- |
| Public | `/`, `/about`, `/blog`, `/blog/:slug`, `/blog/authors/:slug`, `/blog/tags/:tag`, and the catch-all route |
| Administration | `/admin`, `/admin/articles/new`, `/admin/articles/:entryId/edit`, `/admin/profile`, `/admin/tags` |

## Endpoint matrix

| Boundary | Matrix |
| --- | --- |
| Public Contentful proxy | `entries`, `blog-index`, `blog-years`, `tags`, `tagged`, `article/:slug`, `article-navigation/:slug`, and `author/:slug` through the middleware API and equivalent Netlify Function paths |
| Administrative Contentful proxy | Article collection and item mutations; submit, unpublication, publish, unpublish, unarchive, archive; tag list/manage/create/delete; author profile; media assets, editor configuration, and upload |

## Current container validation state

The legacy command is `node --test`. Documented container invocations target the existing `app` service, whose compose definition declares an environment file and runs `npm i && npm run dev`; it is not a clean no-environment test profile. The Dockerfile also executes `npm install`. No passing clean-container validation evidence exists in the repository, and no containers were started for this baseline.

## Documentation discrepancy

The runtime exposes eight public proxy endpoint patterns, while the README currently lists only four. This is a documentation issue to reconcile during the later documentation task; it is not a removal or behavior change.
