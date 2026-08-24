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
- [ ] 3.4 Add responsive markup tests and perform manual desktop and mobile responsive checks before marking them complete.
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
- [x] 7.3 Require two sequential confirmations before deletion and disable deletion while the article usage count is greater than zero.
- [x] 7.4 Make article-table tag chips toggle the existing tag filter and render the active chip with inverse colors while preserving unrelated filters.
- [x] 7.5 Exclude `article-lang-pt-br` and `article-lang-en-us` from public filters, article-editor choices, and tag management.

## 8. Tag Management Verification

- [x] 8.1 Add focused API, authorization, stale-count conflict, UI interaction, and reserved-tag regression tests using TDD.
- [x] 8.2 Run focused tests, the full unit suite, lint, production build, credential scan, strict OpenSpec validation, and repository hygiene checks.
- [x] 8.3 Request focused review of tag deletion safety, permissions, count semantics, and article-filter interaction before considering the work complete.
- [ ] 8.4 Perform owner tag-management and article-chip filtering smoke checks in staging.
