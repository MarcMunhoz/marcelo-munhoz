# Legacy Guarantee Parity Matrix

This report records the disposition of every legacy suite. No legacy test can be removed until every retained guarantee has a passing equal-or-stronger owner.

| Legacy suite | Retained guarantee families | Target ownership |
| --- | --- | --- |
| `apiBase` | same-origin defaults and API-base normalization | unit-node |
| `blogArchive` | archive query, return URL, pagination, payload validation | unit-node; component; Cypress |
| `authorPhotos` | photo candidates and fallback behavior | unit-node; component |
| `responsiveMedia` | media-query lifecycle and fallback | unit-dom |
| `adminAccess` | timed access unlock and safe navigation | unit-dom; component; Cypress |
| `adminAuth` | role/session/profile behavior, cleanup and safe sign-out | unit-dom; component; Cypress |
| `adminSessionLifecycle` | cross-tab lifecycle, expiry, warning and timer behavior | unit-dom; component; Cypress |
| `articleLocaleRoundTrip` | locale preservation from editor to publication | integration; component; Cypress |
| `blogNavigationRoundTrip` | article validation, archive return and neighbors | integration; component; Cypress |
| `contentfulProxy` | normalization, bounds, errors, route compatibility | integration; contract; component; Cypress |
| `contentfulManagementFacade` | localized mutations, conflicts, tags and provider failures | integration |
| `contentfulAdmin` | authorization, dashboard, workflows and sanitized failures | integration; component; Cypress |
| `cloudinaryMedia` | media configuration, authorization and malformed responses | integration; component; Cypress |
| `corsPolicy` | effective development-loopback CORS policy | contract |
| `buildCredentialScan` | built-artifact credential isolation | contract |
| `routingConfiguration` | routes, redirects, metadata, proxy and deployment boundaries | unit-dom; contract; component; Cypress |
| `blogFrontend` | public content, accessibility, archive return and responsive behavior | unit-node; unit-dom; component; Cypress |
| `adminFrontend` | dashboard/editor/profile/tag state and responsive behavior | unit-node; unit-dom; component; Cypress |
| `publicResponsiveLayout` | observable compact shell and responsive containment | component; Cypress |
| `compositionApiMigration` | `script setup` source form | obsolete after observable replacements pass |

## Implemented Vitest owners through task 4.5

| Legacy guarantee family | Passing Vitest owner | Migration note |
| --- | --- | --- |
| API base | `tests/unit-node/api-base.test.js` | Exact pure-helper migration |
| Blog archive and public content helpers | `tests/unit-node/blog-archive.test.js`; `tests/unit-node/public-content-utilities.test.js` | Pure archive, date, media, locale and return-state behavior |
| Author photos and editorial helpers | `tests/unit-node/author-photos.test.js`; `tests/unit-node/editorial-utilities.test.js` | Pure author, profile, date, media, tag, payload and action behavior |
| Routing helpers | `tests/unit-node/routing-helpers.test.js` | Executable route, metadata, scroll and terminal-action behavior; declarative configuration remains task 4.5 |
| Responsive media | `tests/unit-dom/responsive-media.test.js` | Match lifecycle and safe cleanup |
| Administrative access and authentication | `tests/unit-dom/admin-access.test.js`; `tests/unit-dom/admin-auth.test.js` | Access timing, Identity callbacks, profile loading and safe sign-out |
| Administrative session lifecycle | `tests/unit-dom/admin-session-lifecycle.test.js` | Clock, storage, cookie, cross-tab, warning, expiry and cleanup behavior |
| Public Contentful proxy core | `tests/unit-node/contentful-proxy.test.js` | 47 declarations and 49 executed cases against the Function core; two Express route-stack declarations remain task 4.5 |
| Blog navigation integration | `tests/unit-node/blog-navigation-round-trip.test.js` | Three executable payload, stale-response, return-state and neighbor cases |
| Administrative management facade | `tests/unit-node/contentful-management-facade.test.js` | 34 localized mutation, ownership, workflow, version, tag, rate-limit and provider-failure cases |
| Administrative handler | `tests/unit-node/contentful-admin-handler.test.js` | 41 authentication, authorization, profile, dashboard, ownership, dispatch and sanitized-error cases |
| Cloudinary media facade | `tests/unit-node/cloudinary-media-facade.test.js` | 15 scoped listing, pagination, upload, configuration, malformed-response and authorization cases |
| Administrative API facade | `tests/unit-node/admin-api.test.js` | Nine executable request-path, authorization-header, version, tag, profile, dashboard and editor-config cases |
| Article locale round trip | `tests/unit-node/article-locale-round-trip.test.js` | Two generated locale cases across editor payload, management publication and public delivery |
| Declarative deployment contracts | `tests/unit-node/declarative-contracts.test.js` | Executable or parsed CORS, server, route, credential, redirect, header, build, Function, robots and Identity guarantees |

## Implemented rendered owners through task 5.7

| Legacy guarantee family | Passing component owner | Migration note |
| --- | --- | --- |
| Application shell and route metadata | `tests/component/app-shell.test.js` | Query-stable rendering, public/admin metadata, cookie presentation and dismissal |
| Main navigation and administrative entry | `tests/component/main-layout.test.js` | Desktop/mobile surfaces, focusability, access phrase, account fallback, warning and sign-out |
| Home, About and not-found pages | `tests/component/public-pages.test.js` | Rendered content, media, ordered safe links, social interactions, responsive semantic structure and recovery navigation |
| Blog archive | `tests/component/blog-archive.test.js` | Highlights, article rows, metadata, filters, pagination, URL state, loading, empty, failure and retry behavior |
| Article and author pages | `tests/component/article-author.test.js` | Locale, Markdown boundary, tags, images, return state, chronological neighbors, pagination and fallbacks |
| Administrative dashboard | `tests/component/admin-dashboard.test.js` | Signed-out, writer and owner rendering, filters, queues, lifecycle actions and feedback states |
| Administrative editor | `tests/component/admin-article-editor.test.js` | Create and edit modes, validation, ownership, locale, slug, Markdown, tags, media, navigation guards and terminal actions |
| Author profile and tag management | `tests/component/admin-profile.test.js`; `tests/component/admin-tags.test.js` | Role enforcement, validation, photo fallback/reset, persistence, tag creation, usage constraints and deletion confirmation |

Computed breakpoint layout remains with Cypress 7.2 because Happy DOM does not evaluate media queries.

## Retire only after replacement success

The `compositionApiMigration` suite is implementation detail. Source-text and markup/token assertions in the frontend and responsive suites become rendered component or Cypress assertions. Parsed route, redirect, header, credential-isolation, and build-boundary guarantees remain contract tests. Provider request shape remains an implementation detail unless it is required for an external compatibility contract; normalized input, bounds, version handling, and sanitized failure behavior remain integration guarantees.

## Per-suite parity disposition

| Legacy suite | Retained guarantee and new owner | Remaining or obsolete assertions |
| --- | --- | --- |
| `apiBase` | Same-origin and normalized overrides: `unit-node/api-base.test.js` | Fully migrated; duplicate legacy assertions retire in 10.1. |
| `blogArchive` | Query, return URL, pagination and validation: `unit-node/blog-archive.test.js` | Rendered archive states remain with 5.3 and Cypress 7.3. |
| `authorPhotos` | Candidate and fallback rules: `unit-node/author-photos.test.js` | Rendered image fallback remains with 5.4. |
| `responsiveMedia` | Media-query lifecycle: `unit-dom/responsive-media.test.js` | Fully migrated. |
| `adminAccess` | Unlock and safe navigation: `unit-dom/admin-access.test.js` | Rendered entry flow remains with 5.1 and Cypress 7.5. |
| `adminAuth` | Roles, Identity callbacks, profiles and sign-out: `unit-dom/admin-auth.test.js` | Account-menu rendering remains with 5.1. |
| `adminSessionLifecycle` | Cross-tab, warning, expiry and cleanup: `unit-dom/admin-session-lifecycle.test.js` | Rendered warning and journey coverage remain with 5.1 and 7.8. |
| `articleLocaleRoundTrip` | End-to-end locale transformation: `unit-node/article-locale-round-trip.test.js` | Rendered locale presentation remains with 5.4. |
| `blogNavigationRoundTrip` | Validation, return state and neighbors: `unit-node/blog-navigation-round-trip.test.js` | Rendered navigation remains with 5.4 and 7.4. |
| `contentfulProxy` | Core behavior: `unit-node/contentful-proxy.test.js`; route registration: `unit-node/declarative-contracts.test.js` | Component recovery and browser journeys remain with 5.3–5.4 and 7.3–7.4. |
| `contentfulManagementFacade` | All 34 facade cases: `unit-node/contentful-management-facade.test.js` | Fully migrated. |
| `contentfulAdmin` | All 41 handler cases: `unit-node/contentful-admin-handler.test.js` | Rendered admin states and journeys remain with 5.5–5.7 and 7.6–7.7. |
| `cloudinaryMedia` | All 15 provider and handler cases: `unit-node/cloudinary-media-facade.test.js` | Rendered media selection remains with 5.6 and 7.6. |
| `corsPolicy` | Effective HTTP CORS and server wiring: `unit-node/declarative-contracts.test.js` | Fully migrated. |
| `buildCredentialScan` | Clean and leaking build fixtures: `unit-node/declarative-contracts.test.js` | Real built-output execution remains a release gate in 9.3 and 10.3. |
| `routingConfiguration` | Helpers: `unit-node/routing-helpers.test.js`; effective routes, redirects, headers, server, Quasar and Function boundaries: `unit-node/declarative-contracts.test.js`; query-stable shell: `component/app-shell.test.js` | Redundant source-token assertions retired in 5.8; executable legacy duplicates remain until 10.1. |
| `blogFrontend` | Pure content helpers: `unit-node/public-content-utilities.test.js`, `blog-archive.test.js`, `routing-helpers.test.js`; rendered archive/article behavior: `component/blog-archive.test.js`, `component/article-author.test.js` | Replaced markup/state assertions retired in 5.8; CSS, focus and responsive assertions remain until Cypress 7.3–7.4. |
| `adminFrontend` | Pure editorial helpers: `unit-node/editorial-utilities.test.js`; API calls: `unit-node/admin-api.test.js`; declarative boundaries: `unit-node/declarative-contracts.test.js`; rendered administration: component suites from 5.5–5.7 | Replaced helper-existence, import, markup and state assertions retired in 5.8; CSS and responsive assertions remain until Cypress 7.6–7.7. |
| `publicResponsiveLayout` | Shell and responsive semantic structure: `component/app-shell.test.js`, `component/main-layout.test.js`, `component/public-pages.test.js`; computed layout: Cypress 7.2 | Exact CSS/source-token assertions retire only after Cypress 7.2 passes. |
| `compositionApiMigration` | No retained runtime guarantee; observable behavior is owned by component suites | Suite removed in 5.8 because all four `script setup` source-form assertions were obsolete implementation detail. |

## Retirement decision

Task 5.8 removed 36 redundant source-inspection cases after their unit, contract or rendered component owners passed: the four-case `compositionApiMigration` suite, 19 administrative cases plus the source-only portion of one hybrid case, four public blog markup/state cases, and nine routing/configuration token cases. Functional legacy tests and CSS, focus, containment and responsive assertions remain available until their Cypress owners pass. Removing the legacy runner and the remaining duplicate suites is still reserved for 10.1 after Groups 6 and 7 and final parity validation.
