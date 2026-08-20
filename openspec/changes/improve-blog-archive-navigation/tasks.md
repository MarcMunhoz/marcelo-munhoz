## 1. Public API Contracts

- [x] 1.1 Add the normalized `GET /api/contentful/blog-index` contract with allowlisted search, year, tag, page, pagination, and sanitized error handling.
- [x] 1.2 Implement stable global chronology and unfiltered featured-item exclusion from archive items and totals.
- [ ] 1.3 Add the bounded `GET /api/contentful/article-navigation/:slug` contract with chronological neighbors and failure-safe responses.
- [ ] 1.4 Add unit tests for query normalization, Contentful query construction, feature exclusion, pagination, boundaries, and sanitized errors.

## 2. Frontend Route State

- [ ] 2.1 Parse `/blog` `page`, `q`, `year`, and `tag` values into canonical archive state and synchronize user changes through Vue Router.
- [ ] 2.2 Reset page to 1 when search or filters change, normalize returned out-of-range pages, and preserve browser history and saved scroll behavior.
- [ ] 2.3 Store the current internal blog URL in history state before opening an article while keeping article URLs clean.
- [ ] 2.4 Add tests for initial parsing, URL updates, history restoration, page resets, and canonical normalization.

## 3. Hybrid Archive Layout

- [ ] 3.1 Render automatic recent highlights only for the unfiltered first page, with real article image, title, date, and concise metadata.
- [ ] 3.2 Render the paginated archive as compact rows with thumbnail, description, author, date, and tags.
- [ ] 3.3 Add labelled search, year and tag controls, current-page pagination semantics, empty state, retryable error state, keyboard focus, and stable image ratios.
- [ ] 3.4 Add responsive markup tests and perform manual desktop and mobile responsive checks before marking them complete.

## 4. Article Navigation

- [ ] 4.1 Add the visible `All articles` action with stored archive-state return and `/blog` fallback.
- [ ] 4.2 Load and render global chronological previous and next article actions after the article body, omitting unavailable boundaries.
- [ ] 4.3 Keep article rendering available when neighbor loading fails and add automated coverage for fallback, ordering, boundaries, and failure behavior.

## 5. Admin Redirect

- [x] 5.1 Replace the editor route with `/admin` after successful Save draft, Submit for review, Request unpublication, and Owner unpublish actions.
- [x] 5.2 Preserve editor state and error feedback when each terminal action fails.
- [x] 5.3 Add automated tests proving successful actions replace the route and failed actions do not navigate.

## 6. Verification

- [ ] 6.1 Run focused unit tests for public API contracts, route state, archive layout, article navigation, and admin redirect behavior.
- [ ] 6.2 Run the full unit suite, lint, production build, and credential scan.
- [ ] 6.3 Run strict OpenSpec validation.
- [ ] 6.4 Perform staging smoke checks for public archive, article navigation, and terminal editor redirects.
