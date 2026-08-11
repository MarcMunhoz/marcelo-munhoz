## 1. Discovery And Baseline

- [x] 1.1 Confirm current public blog read behavior in the existing Contentful Delivery API proxy, Netlify redirects, local middleware wrapper, and blog fetch call sites.
- [x] 1.2 Confirm the current Contentful article content model fields needed for list cards, article detail, author, tags, images, slug, description, and body rendering without reading secrets.
- [x] 1.3 Select a free-compatible authentication approach for `/admin` and document how writer and owner identities are represented server-side.
- [x] 1.4 Decide where writer ownership, submission status, and unpublication requests are stored while keeping the project on free plans.
- [x] 1.5 Define the first-version article editor field set and validation rules.

## 2. Admin API Architecture

- [x] 2.1 Add a server-side admin API surface separate from the existing public `/api/contentful/*` read proxy.
- [x] 2.2 Add local middleware routing for the admin API without changing the existing local public blog proxy behavior.
- [x] 2.3 Add Netlify Function routing for admin API requests before the SPA fallback.
- [x] 2.4 Implement server-side authentication extraction for admin API requests.
- [x] 2.5 Implement server-side writer and owner authorization helpers used by every admin mutation.
- [x] 2.6 Normalize admin API errors into user-safe JSON responses without exposing credentials, stack traces, or raw upstream diagnostics.

## 3. Contentful Management Facade

- [x] 3.1 Add a narrow server-side Contentful Management API facade for article draft creation, article updates, publish, unpublish, archive, and permanent deletion.
- [x] 3.2 Ensure the facade reads management credentials only from server-side runtime configuration.
- [x] 3.3 Ensure the facade does not accept browser-supplied Contentful credentials or arbitrary upstream query/mutation parameters.
- [x] 3.4 Implement optimistic concurrency handling for Contentful version conflicts.
- [x] 3.5 Implement missing-configuration and upstream-failure handling without leaking sensitive details.

## 4. Dashboard And Writer Workflows

- [ ] 4.1 Replace the direct editor-first `/admin` screen with a CMS-style dashboard shell containing sidebar navigation, topbar, status cards, article table, and role-aware actions.
- [ ] 4.2 Add article status data loading for published, draft/unpublished, and review-request counts using deterministic mocked tests first.
- [ ] 4.3 Add article list/table UI with filters for status, tags, date, author, and search.
- [ ] 4.4 Add create/edit article screens using the real Article field set: create date, title, slug, description, body, thumbnail, alt, author, and Contentful tags.
- [ ] 4.5 Remove manually editable version and review-notes fields from the writer editor; keep version as hidden state for concurrency.
- [ ] 4.6 Add writer draft creation and editing behavior for permitted drafts or submissions.
- [ ] 4.7 Add submit-for-review behavior that records workflow state and makes drafts visible in the owner review workflow.
- [ ] 4.8 Add unpublication request behavior that records a request without unpublishing the article.
- [ ] 4.9 Handle save success, validation errors, authorization failures, media failures, and version conflicts in the writer UI.

## 5. Cloudinary Media Workflow

- [ ] 5.1 Confirm the live Contentful Article field ID and payload shape for thumbnail and alt text without reading secrets.
- [ ] 5.2 Decide whether the first Cloudinary implementation uses signed direct browser upload or backend-streamed upload.
- [ ] 5.3 Add a narrow server-side Cloudinary media facade for upload/selection metadata using mocked tests.
- [ ] 5.4 Add admin media API routes that authorize writer/owner sessions before Cloudinary operations.
- [ ] 5.5 Add a media picker/upload UI scoped to the configured Cloudinary folder.
- [ ] 5.6 Save returned Cloudinary metadata into the Article thumbnail field and alt text into the Article alt field.
- [ ] 5.7 Ensure Cloudinary credentials are read only from server-side runtime configuration and never from browser-supplied parameters.

## 6. Owner Workflows

- [ ] 6.1 Add protected admin routing and navigation states for owner sessions.
- [ ] 6.2 Add owner review queues for draft submissions and unpublication requests.
- [ ] 6.3 Add owner publish behavior for reviewed article submissions.
- [ ] 6.4 Add owner unpublish behavior for approved unpublication requests or selected articles.
- [ ] 6.5 Add owner archive behavior for selected articles.
- [ ] 6.6 Add owner-only permanent deletion flow with explicit confirmation and cancellation behavior.
- [ ] 6.7 Ensure writer sessions cannot access owner-only UI actions and that the backend rejects owner-only API requests from writers.

## 7. Credential And Build Safety

- [ ] 7.1 Update runtime configuration documentation for Contentful Management API and Cloudinary credentials without exposing secret values.
- [ ] 7.2 Ensure no Contentful management or Cloudinary credential is injected through `VITE_*` or other frontend build-time variables.
- [ ] 7.3 Add or update validation that scans built frontend assets for management and Cloudinary credential names and configured secret values using sanitized test values.
- [ ] 7.4 Ensure admin API logs intended for users do not include secret names, secret values, stack traces, or raw upstream diagnostics.

## 8. Tests And Validation

- [ ] 8.1 Add deterministic tests for unauthenticated, writer, and owner admin API authorization behavior.
- [ ] 8.2 Add deterministic tests for Contentful Management API facade success paths using mocks or fixtures.
- [ ] 8.3 Add deterministic tests for Cloudinary media facade success and failure paths using mocks or fixtures.
- [ ] 8.4 Add deterministic tests for missing configuration, upstream failures, malformed upstream responses, and version conflicts.
- [ ] 8.5 Add frontend regression coverage for dashboard status cards, article table filtering, writer draft creation, writer draft editing, submit-for-review, and unpublication request flows.
- [ ] 8.6 Add frontend regression coverage for owner publish, unpublish, archive, and permanent deletion confirmation flows.
- [ ] 8.7 Verify the existing public blog read tests still pass unchanged.
- [ ] 8.8 Run the project test suite in the container context.
- [ ] 8.9 Run lint and build validation in the container context.
- [ ] 8.10 Run `openspec validate add-blog-admin-area --strict`.
- [ ] 8.11 Document optional live Contentful, Cloudinary, or deployed Netlify smoke checks separately from routine automated validation.

## 9. Documentation And Rollout

- [ ] 9.1 Update project documentation with the admin architecture, free-plan constraints, owner/writer permission model, dashboard behavior, and Cloudinary media flow.
- [ ] 9.2 Document required server-side runtime variables for admin behavior using sanitized placeholder values only.
- [ ] 9.3 Document the rollback path that disables or hides admin routes while preserving the existing public blog read API.
- [ ] 9.4 Document that guest writers should not be granted broad Contentful Editor access for normal guest authoring on the Free plan.
