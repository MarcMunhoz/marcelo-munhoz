# Legacy Guarantee Parity Matrix

This matrix records intended ownership only. No legacy test can be removed until its mapped replacement passes.

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

## Implemented Vitest owners through task 4.3

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

## Retire only after replacement success

The `compositionApiMigration` suite is implementation detail. Source-text and markup/token assertions in the frontend and responsive suites become rendered component or Cypress assertions. Parsed route, redirect, header, credential-isolation, and build-boundary guarantees remain contract tests. Provider request shape remains an implementation detail unless it is required for an external compatibility contract; normalized input, bounds, version handling, and sanitized failure behavior remain integration guarantees.
