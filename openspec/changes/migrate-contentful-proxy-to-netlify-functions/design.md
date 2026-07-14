## Context

The project is a Vue 3/Quasar/Vite personal website deployed on Netlify. Blog pages currently fetch Contentful data from a separately hosted API origin, and local development runs a Quasar dev server plus an Express middleware on port 3000. Netlify already hosts the frontend, but production API traffic still depends on an external backend host.

The existing Express middleware contains the Contentful access token and space ID on the server side, exposes a narrow blog API, and keeps the browser from calling Contentful directly with project credentials. The migration should preserve that separation while removing Render as the required production host.

The Flickr proxy migration in the other project is the closest precedent: consolidate the proxy under Netlify, prefer a native Function for narrow endpoints, keep secrets server-side, avoid paid Netlify features, preserve the existing browser API contract, and keep rollback possible until production validation is complete.

## Goals / Non-Goals

**Goals:**

- Serve the Contentful blog API from Netlify Functions in production.
- Preserve compatible responses for article listing, tag listing, tag filtering, and article-by-slug lookups.
- Keep Contentful credentials exclusively in server-side Netlify/runtime environment variables.
- Default the frontend to same-origin API calls in production while retaining an explicit API base URL override for local development and temporary rollback.
- Keep the Docker-based local workflow practical, either through a thin local Express wrapper or a documented Netlify Function local path.
- Add deterministic validation for proxy behavior, frontend routing defaults, and blog regression paths.
- Remove Render from the required production architecture after validation.

**Non-Goals:**

- Do not change the blog UI, routes, Contentful content model, pagination size, tag behavior, or article rendering behavior.
- Do not expose generic Contentful query capabilities to the browser beyond the existing blog API.
- Do not migrate the frontend away from Netlify, Quasar, Vue, Vite, or the current Docker workflow.
- Do not add Netlify paid features, paid add-ons, databases, blob storage, AI features, background jobs, scheduled jobs, or required auto-recharge.
- Do not require live Contentful data for routine automated regression tests.
- Do not decommission the Render service until the Netlify Function path has been validated and rollback remains available.

## Decisions

### Use Netlify Functions for the production Contentful API

Production API requests will be served by Netlify Functions in the same Netlify project as the frontend. This consolidates hosting, environment variables, routing, and deployment validation under Netlify while preserving the server-side proxy pattern.

Alternatives considered:

- Keep Render: lowest code churn, but preserves the split-host production model the change is meant to remove.
- Call Contentful directly from the browser: simpler infrastructure, but exposes delivery credentials and couples browser code to Contentful's API shape.
- Move to another serverless provider: technically possible, but adds a third operational surface instead of consolidating.

### Prefer native Function handlers with shared Contentful logic

The Contentful API surface is small, so native Netlify Function handlers should be the first implementation choice. Shared Contentful query logic should be extracted so the Function and any local wrapper do not duplicate pagination, tag, article lookup, or error normalization behavior.

Alternatives considered:

- Express plus a serverless adapter: familiar, but heavier than needed unless implementation evidence shows it materially reduces complexity.
- Copy existing route handlers into Functions: quick initially, but creates drift risk between local and production paths.

### Preserve the existing `/api/contentful` contract

The frontend should continue using `/api/contentful/entries`, `/api/contentful/tags`, `/api/contentful/tagged`, and `/api/contentful/article/:slug`. Netlify redirects should map those paths to Functions before the SPA fallback. The frontend can use same-origin defaults and a single explicit base URL override for local development and rollback.

Alternatives considered:

- Use `/.netlify/functions/...` directly in Vue components: easy to wire, but leaks hosting details into product code and increases future migration churn.
- Introduce versioned API paths: unnecessary because this is intended to be a compatible infrastructure migration.

### Keep production same-origin and narrow

Final production should not require broad CORS because the SPA and Functions share an origin. Function handlers must expose only the current blog operations and must not forward arbitrary Contentful queries from the browser.

Alternatives considered:

- Keep broad CORS for flexibility: unnecessary in production and increases exposure.
- Add a generic Contentful proxy endpoint: more flexible, but harder to audit and not needed by the current UI.

### Stay within Netlify Free-compatible features

The implementation should use static hosting, redirects, environment variables, and ordinary request-triggered Netlify Functions only. It should remain stateless and avoid persistent storage, queues, paid add-ons, scheduled/background jobs, or auto-recharge requirements.

Alternatives considered:

- Add caching storage to reduce Contentful calls: potentially useful later, but unnecessary for this migration and may add cost or operational complexity.
- Use Edge Functions for latency: not required to preserve current behavior.

## Risks / Trade-offs

- Netlify route ordering could send `/api/contentful/*` to `index.html` instead of Functions -> Define API redirects before the SPA catch-all and validate route behavior.
- Contentful credentials could leak into frontend build output -> Remove frontend environment injection for delivery credentials where unused and validate built assets do not contain configured secret values.
- Function behavior could diverge from local Express behavior -> Share core Contentful query logic and cover wrappers with tests.
- Missing Netlify environment variables could break production -> Return user-safe configuration errors, document required variables, and validate configuration before decommissioning Render.
- API response shape changes could break blog pages -> Preserve current route contract and add deterministic tests or fixtures for article list, tags, tagged articles, and article detail flows.
- Removing Render defaults could remove the only quick rollback path -> Keep an explicit API base URL override documented until production verification is complete.
- Netlify Free usage could be exhausted by unusual traffic -> Keep Functions lightweight, avoid paid features, document usage-credit risk, and do not require auto-recharge.

## Migration Plan

1. Baseline the current Express `/api/contentful` behavior and frontend fetch call sites.
2. Extract reusable Contentful service/handler logic from `app/middleware/routes/contentful.js`.
3. Add Netlify Function endpoints for the existing Contentful API routes.
4. Configure `app/netlify.toml` so `/api/contentful/*` reaches Functions before the SPA fallback.
5. Update frontend API base handling so production defaults to same-origin and local/rollback environments can override the base URL.
6. Keep or simplify the local Express middleware as a local-only wrapper if it preserves Docker development ergonomics.
7. Add deterministic tests for Contentful handler behavior, route compatibility, credential handling, API base URL normalization, and blog regression paths.
8. Update README with Netlify environment variables, local development, validation, rollout, rollback, and Render decommission notes.
9. Validate in the containerized workflow and, optionally, run a manual live smoke check against Netlify with real Contentful credentials.
10. After production verification, decommission Render outside the codebase.

Rollback strategy:

- Before Render is decommissioned, configure the frontend API base URL override to point back to the Render API base and redeploy.
- Keep Contentful credentials only in trusted server-side hosting environments during rollback.
- Reintroduce any removed Render CSP/connect allowance only if rollback is actually used.

## Open Questions

- Whether the implementation should keep the Express middleware for local Docker development or replace it with Netlify Function local execution depends on which path is simpler after the shared handler exists.
- The exact test runner can be chosen during implementation based on current project tooling; any added package manager commands must run inside the container.
