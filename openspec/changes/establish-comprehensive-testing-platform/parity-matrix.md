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

## Retire only after replacement success

The `compositionApiMigration` suite is implementation detail. Source-text and markup/token assertions in the frontend and responsive suites become rendered component or Cypress assertions. Parsed route, redirect, header, credential-isolation, and build-boundary guarantees remain contract tests. Provider request shape remains an implementation detail unless it is required for an external compatibility contract; normalized input, bounds, version handling, and sanitized failure behavior remain integration guarantees.
