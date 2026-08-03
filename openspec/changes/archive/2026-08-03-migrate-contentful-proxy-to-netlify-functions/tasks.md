## 1. Baseline and Work Split

- [x] 1.1 Confirm current behavior by reading `app/middleware/server.js`, `app/middleware/routes/contentful.js`, blog fetch call sites, `app/netlify.toml`, `README.md`, and existing package scripts.
- [x] 1.2 Confirm all implementation commands that install dependencies, lint, build, or test will run inside the Docker/container context.
- [x] 1.3 Confirm the implementation shape before coding: prefer native Netlify Functions with shared Contentful logic, and require written justification before adding Express adapters.
- [x] 1.4 Identify shared files likely to be edited by multiple work streams and sequence those edits to avoid conflicting changes.

## 2. Shared Contentful Proxy Behavior

- [x] 2.1 Extract the current Contentful query behavior into reusable logic that can be exercised without starting the Express server.
- [x] 2.2 Preserve the existing article list query, including `content_type: "article"`, ordering, page calculation, fixed limit of 3, and skip calculation.
- [x] 2.3 Preserve the existing tag list query used by the tag navigation.
- [x] 2.4 Preserve the existing tagged article query, including requested tag handling, pagination, content type, ordering, and skip calculation.
- [x] 2.5 Preserve the existing article-by-slug query and return a compatible `404` JSON response when no article exists.
- [x] 2.6 Normalize upstream and configuration failures into user-safe JSON responses without exposing Contentful credentials, stack traces, or raw diagnostics to the browser.

## 3. Netlify Function Runtime

- [x] 3.1 Add native Netlify Function source under `app/netlify/functions/` for the Contentful API route contract.
- [x] 3.2 Wire the Function path to the shared Contentful behavior for `/api/contentful/entries`, `/api/contentful/tags`, `/api/contentful/tagged`, and `/api/contentful/article/:slug`.
- [x] 3.3 Ensure the Function reads `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY` only from server-side runtime environment variables.
- [x] 3.4 Avoid new runtime dependencies where practical; if any dependency is required, add it through the containerized package-manager workflow and update only the repo's existing lockfile format.
- [x] 3.5 Confirm the Function uses only ordinary request-triggered Netlify Functions and does not require paid Netlify features, paid add-ons, storage, scheduled/background jobs, or auto-recharge.

## 4. Frontend Routing and Local Development

- [x] 4.1 Introduce a shared frontend API base helper or equivalent pattern so blog fetches do not hard-code the Render origin.
- [x] 4.2 Update `app/src/pages/Blog.vue`, `app/src/components/ArticlesTags.vue`, and `app/src/components/BlogArticle.vue` to use same-origin `/api/contentful` by default.
- [x] 4.3 Preserve an explicit API base URL override for local development and temporary Render rollback, including trailing-slash normalization.
- [x] 4.4 Update `app/netlify.toml` so `/api/contentful/*` routes to the Netlify Function before the catch-all SPA redirect.
- [x] 4.5 Review Content Security Policy and connection requirements so final production does not retain unnecessary Render trust.
- [x] 4.6 Keep, simplify, or replace the local Express middleware based on which local workflow remains simplest after shared logic is available.
- [x] 4.7 Update Docker/local scripts as needed so the documented local workflow serves both the frontend and Contentful API path without Render.

## 5. Tests and Validation Coverage

- [x] 5.1 Add deterministic tests for successful Contentful article list, tag list, tagged article list, and article-by-slug responses using mocks or fixtures.
- [x] 5.2 Add deterministic tests for article-not-found, missing configuration, upstream Contentful failures, and malformed or unexpected upstream responses.
- [x] 5.3 Add tests or assertions that browser-supplied requests cannot inject Contentful credentials and that user-facing errors do not leak secrets.
- [x] 5.4 Add frontend API base tests for same-origin production defaults and configured override normalization.
- [x] 5.5 Add or update blog page regression coverage so article listing, tag filtering, and article detail flows remain deterministic after the route migration.
- [x] 5.6 Validate that built frontend assets do not contain the configured Contentful delivery key or other secret values.

## 6. Documentation and Rollout

- [x] 6.1 Update `README.md` to describe Netlify as the production host for both the frontend and Contentful proxy.
- [x] 6.2 Document required Netlify environment variables, including `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY`.
- [x] 6.3 Document the local container workflow for frontend plus Contentful API development.
- [x] 6.4 Document validation commands, keeping package-manager, build, lint, and test execution inside the container.
- [x] 6.5 Document optional live Contentful or deployed Netlify smoke checks separately from routine automated validation.
- [x] 6.6 Document rollback through the API base URL override while Render remains available, and clarify when Render can be decommissioned.
- [x] 6.7 Document Netlify Free-plan assumptions, including no required paid features, no paid add-ons, and disabled auto-recharge for zero-cost operation.

## 7. Integration and Final Checks

- [x] 7.1 Run the selected unit or integration tests inside the documented container context.
- [x] 7.2 Run lint inside the documented container context.
- [x] 7.3 Run the production build inside the documented container context.
- [x] 7.4 Verify Netlify route ordering for `/api/contentful/*` and the SPA fallback.
- [x] 7.5 Run `openspec validate migrate-contentful-proxy-to-netlify-functions --strict`.
- [x] 7.6 Produce a final implementation note listing validation commands, security checks performed, rollback status, and remaining production rollout/decommission steps.
