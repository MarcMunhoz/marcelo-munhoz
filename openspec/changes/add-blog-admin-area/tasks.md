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

- [x] 4.1 Replace the direct editor-first `/admin` screen with a CMS-style dashboard shell containing sidebar navigation, topbar, status cards, article table, and role-aware actions.
- [x] 4.2 Add article status data loading for published, draft/unpublished, and review-request counts using deterministic mocked tests first.
- [x] 4.3 Add article list/table UI with filters for status, tags, date, author, and search.
- [x] 4.4 Add create/edit article screens using the real Article field set: create date, title, slug, description, body, thumbnail, alt, author, and Contentful tags.
- [x] 4.5 Remove manually editable version and review-notes fields from the writer editor; keep version as hidden state for concurrency.
- [x] 4.6 Add writer draft creation and editing behavior for permitted drafts or submissions.
- [x] 4.7 Add submit-for-review behavior that records workflow state and makes drafts visible in the owner review workflow.
- [x] 4.8 Add unpublication request behavior that records a request without unpublishing the article.
- [x] 4.9 Handle save success, validation errors, authorization failures, media failures, and version conflicts in the writer UI.

## 5. Cloudinary Media Workflow

- [x] 5.1 Confirm the live Contentful Article field ID and payload shape for thumbnail and alt text without reading secrets.
- [x] 5.2 Decide whether the first Cloudinary implementation uses signed direct browser upload or backend-streamed upload.
- [x] 5.3 Add a narrow server-side Cloudinary media facade for upload/selection metadata using mocked tests.
- [x] 5.4 Add admin media API routes that authorize writer/owner sessions before Cloudinary operations.
- [x] 5.5 Add a media picker/upload UI scoped to the configured Cloudinary folder.
- [x] 5.6 Save returned Cloudinary metadata into the Article thumbnail field and alt text into the Article alt field.
- [x] 5.7 Ensure Cloudinary credentials are read only from server-side runtime configuration and never from browser-supplied parameters.

## 6. Owner Workflows

- [x] 6.1 Add protected admin routing and navigation states for owner sessions.
- [x] 6.2 Add owner review queues for draft submissions and unpublication requests.
- [x] 6.3 Add owner publish behavior for reviewed article submissions.
- [x] 6.4 Add owner unpublish behavior for approved unpublication requests or selected articles.
- [x] 6.5 Add owner archive behavior for selected articles.
- [x] 6.6 Add owner-only permanent deletion flow with explicit confirmation and cancellation behavior.
- [x] 6.7 Ensure writer sessions cannot access owner-only UI actions and that the backend rejects owner-only API requests from writers.

## 7. Credential And Build Safety

- [x] 7.1 Update runtime configuration documentation for Contentful Management API and Cloudinary credentials without exposing secret values.
- [x] 7.2 Ensure no Contentful management or Cloudinary credential is injected through `VITE_*` or other frontend build-time variables.
- [x] 7.3 Add or update validation that scans built frontend assets for management and Cloudinary credential names and configured secret values using sanitized test values.
- [x] 7.4 Ensure admin API logs intended for users do not include secret names, secret values, stack traces, or raw upstream diagnostics.

## 8. Tests And Validation

- [x] 8.1 Add deterministic tests for unauthenticated, writer, and owner admin API authorization behavior.
- [x] 8.2 Add deterministic tests for Contentful Management API facade success paths using mocks or fixtures.
- [x] 8.3 Add deterministic tests for Cloudinary media facade success and failure paths using mocks or fixtures.
- [x] 8.4 Add deterministic tests for missing configuration, upstream failures, malformed upstream responses, and version conflicts.
- [x] 8.5 Add frontend regression coverage for dashboard status cards, article table filtering, writer draft creation, writer draft editing, submit-for-review, and unpublication request flows.
- [x] 8.6 Add frontend regression coverage for owner publish, unpublish, archive, and permanent deletion confirmation flows.
- [x] 8.7 Verify the existing public blog read tests still pass unchanged.
- [x] 8.8 Run the project test suite in the container context.
- [x] 8.9 Run lint and build validation in the container context.
- [x] 8.10 Run `openspec validate add-blog-admin-area --strict`.
- [x] 8.11 Document optional live Contentful, Cloudinary, or deployed Netlify smoke checks separately from routine automated validation.

## 9. Live Admin Data And UX Completion

- [x] 9.1 Add a server-side admin read facade for real Contentful article listing, status metadata, and workflow records without exposing arbitrary Contentful queries.
- [x] 9.2 Add authenticated admin API read routes for dashboard/article data that require server-side writer or owner authorization before calling Contentful.
- [x] 9.3 Replace frontend `sampleAdminArticles` dashboard/list/review data with API-loaded admin data while keeping deterministic mock fixtures only in tests.
- [x] 9.4 Wire dashboard counts, article table rows, and owner review queues to real article and editorial request state.
- [x] 9.5 Ensure article-row actions use real entry/request identifiers and either perform the supported backend action or are hidden/disabled with a clear pending state.
- [x] 9.6 Fix admin layout responsiveness, horizontal overflow, and disabled navigation states so unfinished sections are intentionally hidden or clearly unavailable.
- [x] 9.7 Keep the local preview role switch dev-only and verify production admin reads/mutations still require Netlify Identity authorization.
- [x] 9.8 Add or update frontend and backend tests for real admin data loading, empty/error states, role filtering, and dev-only preview behavior.
- [x] 9.9 Re-run the project test suite, lint, build validation, and `openspec validate add-blog-admin-area --strict`.

## 10. Documentation And Rollout

- [ ] 10.1 Update project documentation with the admin architecture, free-plan constraints, owner/writer permission model, dashboard behavior, and Cloudinary media flow.
- [ ] 10.2 Document required server-side runtime variables for admin behavior using sanitized placeholder values only.
- [ ] 10.3 Document the rollback path that disables or hides admin routes while preserving the existing public blog read API.
- [ ] 10.4 Document that guest writers should not be granted broad Contentful Editor access for normal guest authoring on the Free plan.
