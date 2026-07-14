## Why

The blog API is currently served by a separately hosted Express middleware on Render while the frontend is deployed on Netlify, which splits deployment, environment configuration, and production operations across two hosting surfaces. Moving the Contentful proxy into Netlify Functions keeps Contentful credentials server-side while consolidating the site and its API under the existing Netlify deployment.

## What Changes

- Replace the production dependency on the Render-hosted Express middleware with Netlify Functions for the Contentful blog API.
- Preserve the existing browser-facing API contract for `/api/contentful/entries`, `/api/contentful/tags`, `/api/contentful/tagged`, and `/api/contentful/article/:slug`.
- Keep `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY` server-side so Contentful credentials are not bundled into frontend assets or exposed to the browser.
- Update frontend API defaults so production requests use same-origin Netlify routes while retaining a configurable API base URL for local development and temporary rollback.
- Update Netlify routing so Contentful API requests reach Functions before the SPA fallback route.
- Update local development documentation and scripts so the project remains practical in the existing Docker workflow.
- Remove Render as the required production backend after the Netlify Function path is validated.
- Add focused validation for function behavior, API route compatibility, frontend base URL behavior, and regression paths for blog pages.

## Capabilities

### New Capabilities

- `netlify-contentful-proxy`: Defines the production Contentful proxy behavior, server-side credential handling, Netlify routing, frontend API defaults, and validation expectations for replacing the Render middleware.

### Modified Capabilities

- None.

## Impact

- Affected frontend blog fetches: `app/src/pages/Blog.vue`, `app/src/components/ArticlesTags.vue`, and `app/src/components/BlogArticle.vue`.
- Affected proxy/runtime code: `app/middleware/server.js`, `app/middleware/routes/contentful.js`, and new Netlify Function source under `app/netlify/functions/`.
- Affected Netlify configuration and security headers: `app/netlify.toml`.
- Affected package metadata: `app/package.json` and lockfiles if function tooling, scripts, or tests require dependency changes.
- Affected documentation: `README.md`, especially production hosting, local development, environment variables, validation, and rollback notes.
- External system impact: production no longer depends on Render for the blog API after migration; Contentful remains the upstream content provider.
