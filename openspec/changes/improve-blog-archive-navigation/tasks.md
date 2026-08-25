## 1. Public API Contracts

- [x] 1.1 Add the normalized `GET /api/contentful/blog-index` contract with allowlisted search, year, tag, page, pagination, and sanitized error handling.
- [x] 1.2 Implement stable global chronology and unfiltered featured-item exclusion from archive items and totals.
- [x] 1.3 Add the bounded `GET /api/contentful/article-navigation/:slug` contract with chronological neighbors and failure-safe responses.
- [x] 1.4 Add unit tests for query normalization, Contentful query construction, feature exclusion, pagination, boundaries, and sanitized errors.
- [x] 1.5 Add the bounded `GET /api/contentful/blog-years` contract with date-only querying, complete-list validation, and sanitized fail-closed behavior.

## 2. Frontend Route State

- [x] 2.1 Parse `/blog` `page`, `q`, `year`, and `tag` values into canonical archive state and synchronize user changes through Vue Router.
- [x] 2.2 Reset page to 1 when search or filters change, normalize returned out-of-range pages, and preserve browser history and saved scroll behavior.
- [x] 2.3 Store the current internal blog URL in history state before opening an article while keeping article URLs clean.
- [x] 2.4 Add tests for initial parsing, URL updates, history restoration, page resets, and canonical normalization.

## 3. Hybrid Archive Layout

- [x] 3.1 Render automatic recent highlights only for the unfiltered first page, with real article image, title, date, and concise metadata.
- [x] 3.2 Render the paginated archive as compact rows with thumbnail, description, author, date, and tags.
- [x] 3.3 Add labelled search, year and tag controls, current-page pagination semantics, empty state, retryable error state, keyboard focus, and stable image ratios.
- [x] 3.4 Add responsive markup tests and perform manual desktop and mobile responsive checks before marking them complete.
- [x] 3.5 Load published year options independently and render only years returned by the bounded public years contract.

## 4. Article Navigation

- [x] 4.1 Add the visible `All articles` action with stored archive-state return and `/blog` fallback.
- [x] 4.2 Load and render global chronological previous and next article actions after the article body, omitting unavailable boundaries.
- [x] 4.3 Keep article rendering available when neighbor loading fails and add automated coverage for fallback, ordering, boundaries, and failure behavior.

## 5. Admin Redirect

- [x] 5.1 Replace the editor route with `/admin` after successful Save draft, Submit for review, Request unpublication, and Owner unpublish actions.
- [x] 5.2 Preserve editor state and error feedback when each terminal action fails.
- [x] 5.3 Add automated tests proving successful actions replace the route and failed actions do not navigate.

## 6. Verification

- [x] 6.1 Run focused unit tests for public API contracts, route state, archive layout, article navigation, and admin redirect behavior.
- [x] 6.2 Run the full unit suite, lint, production build, and credential scan.
- [x] 6.3 Run strict OpenSpec validation.
- [ ] 6.4 Perform staging smoke checks for public archive, article navigation, and terminal editor redirects.

## 7. Admin Tag Management

- [x] 7.1 Add owner-only admin contracts to list tags with article usage counts, create tags, revalidate zero usage, and delete an unused tag with sanitized conflict handling.
- [x] 7.2 Add a tag-management area showing name, ID, visibility, and count without embedding article results.
- [x] 7.3 Require one explicit confirmation before deletion and disable deletion while the article usage count is greater than zero.
- [x] 7.4 Make article-table tag chips toggle the existing tag filter and render the active chip with inverse colors while preserving unrelated filters.
- [x] 7.5 Exclude `article-lang-pt-br` and `article-lang-en-us` from public filters, article-editor choices, and tag management.

## 8. Tag Management Verification

- [x] 8.1 Add focused API, authorization, stale-count conflict, UI interaction, and reserved-tag regression tests using TDD.
- [x] 8.2 Run focused tests, the full unit suite, lint, production build, credential scan, strict OpenSpec validation, and repository hygiene checks.
- [x] 8.3 Request focused review of tag deletion safety, permissions, count semantics, and article-filter interaction before considering the work complete.
- [ ] 8.4 Perform owner tag-management and article-chip filtering smoke checks in staging.

## 9. Gravatar-First Author Photos

- [x] 9.1 Add TDD coverage for profile normalization, canonical Gravatar URLs, allowlisted fallbacks, legacy values, and image-error fallback order.
- [x] 9.2 Resolve public Gravatar slugs server-side while saving and persist only canonical public photo metadata without raw Identity or email data.
- [x] 9.3 Replace the raw photo URL control with Gravatar and fallback inputs, actionable image guidance, preview fallback, and public/admin image recovery.
- [x] 9.4 Center the visibility and article-count columns in tag management and preserve compact responsive action layout.
- [x] 9.5 Run focused and full verification, request focused review, and leave staging smoke checks pending until deployed behavior is exercised.
- [x] 9.6 Identify the photo source currently displayed and clarify that switching to initials does not alter Gravatar or the original image.

## 10. Administrative Cookie Notice

- [x] 10.1 Hide the public cookie notice on routes marked as administrative while preserving pending consent for public routes, with regression coverage.

## 11. Responsive Public And Administrative Surfaces

- [x] 11.1 Contain the global shell, Home, About, article content, footer, and consent notice at the 700-pixel public breakpoint while preserving accessible navigation and desktop composition.
- [x] 11.2 Render complete full-width article cards and compact dashboard metrics, filters, review queues, and actions at the 720-pixel admin breakpoint.
- [x] 11.3 Keep the focused editor, Markdown controls, media actions, media dialog, workflow actions, and visible keyboard focus usable on compact viewports.
- [x] 11.4 Add regression coverage for responsive structure, action parity, framework cascade, intrinsic minimum widths, and focus containment.

## 12. Responsive Verification

- [x] 12.1 Run focused and full tests, lint, production build, credential scan, strict OpenSpec validation, and repository hygiene checks.
- [x] 12.2 Complete focused public and admin reviews and resolve every reported finding.
- [x] 12.3 Exercise public pages, archive navigation, dashboard states, editor shells, media controls, dialogs, and keyboard focus in Brave from 320 pixels through desktop without document-level overflow.
- [ ] 12.4 Repeat responsive smoke checks on deployed staging with real administrative data and provider-backed workflows.

## 13. Discreet Admin Access And Navigation

- [x] 13.1 Add the three-click `AMIGO` challenge, hide signed-out admin navigation, and keep cancelled login recoverable.
- [x] 13.2 Return direct signed-out admin visits to Home and mark administrative routes for crawler exclusion.
- [x] 13.3 Replace compact icon-only actions with one labelled icon-and-text dropdown while preserving authenticated actions and desktop presentation.

## 14. Tag Management Follow-up

- [x] 14.1 Retry bounded Contentful `429` responses once and return an actionable sanitized error when throttling persists.
- [x] 14.2 Center the visibility value structurally and add focused regression coverage for access, navigation, deletion, and indexing.
- [x] 14.3 Run focused and full verification, lint, production build, credential scan, strict OpenSpec validation, and repository hygiene checks.
- [ ] 14.4 Repeat the affected login, compact navigation, and unused-tag deletion smoke checks on deployed staging.

## 15. Staging Feedback Follow-up

- [x] 15.1 Route browser tag deletion through an owner-only POST command while preserving provider-side versioned DELETE and reference validation.
- [x] 15.2 Remove compact dashboard vertical whitespace caused by horizontal flex bases after the layout stacks.
- [x] 15.3 Close rejected access challenges with the uppercase `AMIGO` hint and return rejected or signed-out administrative visitors Home.
- [ ] 15.4 Repeat tag deletion, compact dashboard spacing, logout, and rejected-challenge smoke checks on deployed staging.

## 16. Declarative Quasar Follow-up

- [x] 16.1 Replace every injected `$q` use with declarative Quasar components or lifecycle-safe native media queries, and add regression coverage plus a lint prohibition.
- [ ] 16.2 Run focused and full tests, lint, production build, credential scan, strict OpenSpec validation, and repository hygiene checks without using the occupied development container.
- [ ] 16.3 Repeat unused-tag deletion, rejected-access feedback, dashboard grid, and blog pagination smoke checks on deployed staging.
