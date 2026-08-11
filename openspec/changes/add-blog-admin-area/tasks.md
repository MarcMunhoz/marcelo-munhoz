## 1. Discovery And Baseline

- [ ] 1.1 Confirm current public blog read behavior in the existing Contentful Delivery API proxy, Netlify redirects, local middleware wrapper, and blog fetch call sites.
- [ ] 1.2 Confirm the current Contentful article content model fields needed for list cards, article detail, author, tags, images, slug, description, and body rendering without reading secrets.
- [ ] 1.3 Select a free-compatible authentication approach for `/admin` and document how writer and owner identities are represented server-side.
- [ ] 1.4 Decide where writer ownership, submission status, and unpublication requests are stored while keeping the project on free plans.
- [ ] 1.5 Define the first-version article editor field set and validation rules.

## 2. Admin API Architecture

- [ ] 2.1 Add a server-side admin API surface separate from the existing public `/api/contentful/*` read proxy.
- [ ] 2.2 Add local middleware routing for the admin API without changing the existing local public blog proxy behavior.
- [ ] 2.3 Add Netlify Function routing for admin API requests before the SPA fallback.
- [ ] 2.4 Implement server-side authentication extraction for admin API requests.
- [ ] 2.5 Implement server-side writer and owner authorization helpers used by every admin mutation.
- [ ] 2.6 Normalize admin API errors into user-safe JSON responses without exposing credentials, stack traces, or raw upstream diagnostics.

## 3. Contentful Management Facade

- [ ] 3.1 Add a narrow server-side Contentful Management API facade for article draft creation, article updates, publish, unpublish, archive, and permanent deletion.
- [ ] 3.2 Ensure the facade reads management credentials only from server-side runtime configuration.
- [ ] 3.3 Ensure the facade does not accept browser-supplied Contentful credentials or arbitrary upstream query/mutation parameters.
- [ ] 3.4 Implement optimistic concurrency handling for Contentful version conflicts.
- [ ] 3.5 Implement missing-configuration and upstream-failure handling without leaking sensitive details.

## 4. Writer Workflows

- [ ] 4.1 Add protected admin routing and navigation states for authenticated writers.
- [ ] 4.2 Add article draft creation UI using the selected first-version field set.
- [ ] 4.3 Add article draft editing UI for writer-permitted drafts or submissions.
- [ ] 4.4 Add submit-for-review behavior that makes drafts visible in the owner review workflow.
- [ ] 4.5 Add unpublication request behavior that records a request without unpublishing the article.
- [ ] 4.6 Handle save success, validation errors, authorization failures, and version conflicts in the writer UI.

## 5. Owner Workflows

- [ ] 5.1 Add protected admin routing and navigation states for owner sessions.
- [ ] 5.2 Add owner review queues for draft submissions and unpublication requests.
- [ ] 5.3 Add owner publish behavior for reviewed article submissions.
- [ ] 5.4 Add owner unpublish behavior for approved unpublication requests or selected articles.
- [ ] 5.5 Add owner archive behavior for selected articles.
- [ ] 5.6 Add owner-only permanent deletion flow with explicit confirmation and cancellation behavior.
- [ ] 5.7 Ensure writer sessions cannot access owner-only UI actions and that the backend rejects owner-only API requests from writers.

## 6. Credential And Build Safety

- [ ] 6.1 Update runtime configuration documentation for the Contentful Management API credential without exposing secret values.
- [ ] 6.2 Ensure no Contentful management credential is injected through `VITE_*` or other frontend build-time variables.
- [ ] 6.3 Add or update validation that scans built frontend assets for management credential names and configured secret values using sanitized test values.
- [ ] 6.4 Ensure admin API logs intended for users do not include secret names, secret values, stack traces, or raw upstream diagnostics.

## 7. Tests And Validation

- [ ] 7.1 Add deterministic tests for unauthenticated, writer, and owner admin API authorization behavior.
- [ ] 7.2 Add deterministic tests for Contentful Management API facade success paths using mocks or fixtures.
- [ ] 7.3 Add deterministic tests for missing configuration, upstream failures, malformed upstream responses, and version conflicts.
- [ ] 7.4 Add frontend regression coverage for writer draft creation, writer draft editing, submit-for-review, and unpublication request flows.
- [ ] 7.5 Add frontend regression coverage for owner publish, unpublish, archive, and permanent deletion confirmation flows.
- [ ] 7.6 Verify the existing public blog read tests still pass unchanged.
- [ ] 7.7 Run the project test suite in the container context.
- [ ] 7.8 Run lint and build validation in the container context.
- [ ] 7.9 Run `openspec validate add-blog-admin-area --strict`.
- [ ] 7.10 Document optional live Contentful or deployed Netlify smoke checks separately from routine automated validation.

## 8. Documentation And Rollout

- [ ] 8.1 Update project documentation with the admin architecture, free-plan constraints, and owner/writer permission model.
- [ ] 8.2 Document required server-side runtime variables for admin behavior using sanitized placeholder values only.
- [ ] 8.3 Document the rollback path that disables or hides admin routes while preserving the existing public blog read API.
- [ ] 8.4 Document that guest writers should not be granted broad Contentful Editor access for normal guest authoring on the Free plan.
