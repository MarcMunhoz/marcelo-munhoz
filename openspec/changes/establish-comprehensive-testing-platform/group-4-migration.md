# Group 4 Migration Record

Recorded on 2026-09-01 for change `establish-comprehensive-testing-platform`.

## Migration policy

- Keep every legacy `node:test` suite until the parity report, complete Vitest validation, rendered replacements, and final retirement task pass.
- Execute server and pure integration behavior in the Vitest `unit-node` project; reserve browser state for `unit-dom`, rendered Vue behavior for `component`, and declarative configuration for the later contract migration.
- Exercise provider boundaries only through injected clients, `fetch` doubles, synthetic fixtures, and sanitized environment-shaped objects. Tests do not read local environment files or call live Contentful, Cloudinary, or Netlify services.
- Prefer exact behavioral parity during runner migration. Source-text, markup, route-registration, CORS, security-header, credential-scanning, and dependency-graph assertions remain assigned to tasks 4.5 and 5.x as appropriate.
- Do not change product behavior during Group 4 unless a separately reviewed testability seam becomes necessary.

## Items 4.1 and 4.2 completed

Item 4.1 moved pure API-base, archive, date, author, media, tag, routing-helper, editorial-helper, and responsive-media behavior into `unit-node` and `unit-dom` suites. Hybrid frontend suites were decomposed so executable utility guarantees gained Vitest owners while source inspection stayed legacy for later rendered or contract replacement.

Item 4.2 moved hidden administrative access, Identity/session behavior, and administrative lifecycle behavior into `unit-dom`. Production-session cases explicitly disable the development preview default, while preview cases opt in explicitly. The suites retain controlled cookies and storage, injected clocks and timers, cross-tab channel and storage-event behavior, stale asynchronous work, logout coalescing, warning countdowns, expiry, and callback cleanup.

Validation evidence recorded before starting item 4.3:

- Combined `unit-node` and `unit-dom`: 129 passing tests in 11 files.
- Complete Vitest run including the component harness: 130 passing tests in 12 files.
- Legacy `node:test` regression: successful exit.
- ESLint, strict OpenSpec validation, and `git diff --check`: successful exits.
- Independent review: no remaining critical or important findings after assertion-level parity was expanded.

## Item 4.3 approved design and scope

The public proxy migration has two behavioral owners:

1. `tests/unit-node/contentful-proxy.test.js` migrates the public Contentful core behavior directly into Vitest. It covers blog-index success and highlights, pagination and safe skip bounds, allowlisted query normalization, published years, tags, tagged articles, article lookup and not-found behavior, chronological navigation, author lookup, missing configuration, Delivery API link resolution, upstream failures, unknown paths, Netlify path normalization, and sanitized public errors.
2. `tests/unit-node/blog-navigation-round-trip.test.js` migrates the three executable cross-layer navigation guarantees for payload validation, stale-response rejection, archive return state, and chronological neighbors.

The legacy `contentfulProxy` suite contains 49 declared tests and 51 executed cases because one table expands to three cases. Two declarations inspect the Express route stack for `/article-navigation/:slug` and `/blog-years`; these are declarative route-registration guarantees and remain assigned to task 4.5. The remaining 47 declarations execute 49 behavioral cases and belong to item 4.3.

No additional dependency, shared provider harness, production modification, legacy removal, or live provider access is planned. One temporary incorrect literal establishes a controlled RED for the migrated suite; it is restored before the focused and complete GREEN runs.

## Item 4.4 investigated and deferred

Item 4.4 is intentionally not implemented in this round. Its discovered migration inventory is:

| Legacy source | Declared cases | Planned Vitest owner | Behavioral boundary |
| --- | ---: | --- | --- |
| `contentfulManagementFacade.test.js` | 34 | `unit-node/contentful-management-facade.test.js` | localized mutations, ownership, workflow transitions, version conflicts, tags, rate limits, configuration and provider failures |
| `contentfulAdmin.test.js` | 41 | `unit-node/contentful-admin-handler.test.js` | session mapping, authentication, authorization, author profiles, dashboard filtering, writer/owner route behavior and sanitized handler failures |
| `cloudinaryMedia.test.js` | 15 | `unit-node/cloudinary-media-facade.test.js` | scoped and paginated media, fallback behavior, uploads, malformed responses, configuration and upstream failures |
| Executable `adminApi` cases from `adminFrontend.test.js` | 9 | `unit-node/admin-api.test.js` | browser facade request paths, bearer or preview headers, versions, tags, profiles, dashboard and editor configuration |
| `articleLocaleRoundTrip.test.js` | 2 generated cases | `unit-node/article-locale-round-trip.test.js` | locale preservation across editor payload, management publication and public delivery |

The administrative migration therefore expects 99 primary declared cases plus two generated locale round trips. Pure dashboard, author-photo, authentication, access, session, and responsive utilities already have owners from items 4.1 and 4.2 and must not be duplicated. Declarative/source-text portions of the hybrid admin suite remain assigned to tasks 4.5 and 5.x.

## Validation commands

All commands run through the isolated test compose definition without loading a local environment file:

```sh
rtk docker compose --env-file /dev/null -f docker-compose.test.yaml --profile test run --build --rm test npm exec -- vitest run --project unit-node
rtk docker compose --env-file /dev/null -f docker-compose.test.yaml --profile test run --build --rm test npm exec -- vitest run
rtk docker compose --env-file /dev/null -f docker-compose.test.yaml --profile test run --build --rm test node --test --test-reporter=dot 'tests/*.test.js'
rtk docker compose --env-file /dev/null -f docker-compose.test.yaml --profile test run --build --rm test npm run lint
rtk openspec validate establish-comprehensive-testing-platform --strict
rtk git diff --check
```
