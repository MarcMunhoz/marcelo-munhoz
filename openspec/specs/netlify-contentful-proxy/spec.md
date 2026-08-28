## Purpose

Define the production Contentful blog proxy behavior after migrating the API from the Render-hosted Express middleware to Netlify Functions.

## Requirements

### Requirement: Contentful API contract is preserved
The system SHALL expose Contentful blog data through the existing `/api/contentful` route contract after the migration to Netlify Functions.

#### Scenario: Article list is requested
- **WHEN** the browser requests `/api/contentful/entries?page=<page>`
- **THEN** the system returns the same logical Contentful entry collection used by the current blog listing, including pagination based on the existing page size

#### Scenario: Tags are requested
- **WHEN** the browser requests `/api/contentful/tags`
- **THEN** the system returns the Contentful tag collection used by the tag navigation

#### Scenario: Tagged article list is requested
- **WHEN** the browser requests `/api/contentful/tagged?page=<page>&tag=<tag>`
- **THEN** the system returns article entries filtered by the requested Contentful tag using the existing pagination behavior

#### Scenario: Article detail is requested
- **WHEN** the browser requests `/api/contentful/article/<slug>`
- **THEN** the system returns the matching article entry or a `404` JSON response when no article exists for that slug

### Requirement: Contentful credentials remain server-side
The system MUST use Contentful credentials only from server-side runtime environment variables and MUST NOT expose those credentials through browser bundles, request parameters, logs intended for users, or JSON responses.

#### Scenario: Function has required configuration
- **WHEN** `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY` are configured in the Netlify Function runtime
- **THEN** the function uses those values to create server-side Contentful requests without requiring browser-supplied credentials

#### Scenario: Function is missing configuration
- **WHEN** required Contentful configuration is absent in the server runtime
- **THEN** the function returns a user-safe JSON error without exposing secret names, secret values, stack traces, or raw upstream diagnostics

#### Scenario: Frontend bundle is built
- **WHEN** the production frontend assets are built
- **THEN** the bundle does not contain the configured Contentful delivery key

### Requirement: Netlify routes API requests before SPA fallback
The Netlify deployment MUST route `/api/contentful/*` requests to Netlify Functions before applying the catch-all SPA fallback.

#### Scenario: API route is requested in production
- **WHEN** a production request matches `/api/contentful/*`
- **THEN** Netlify invokes the Contentful Function path instead of returning `index.html`

#### Scenario: Non-API route is requested in production
- **WHEN** a production request does not match an API route and should be handled by the Vue router
- **THEN** Netlify applies the SPA fallback to `index.html`

### Requirement: Frontend uses same-origin production API by default
The frontend SHALL default to same-origin Contentful API requests in production and SHALL retain an explicit API base URL override for local development and temporary rollback.

#### Scenario: Production API base is not overridden
- **WHEN** the frontend runs without an API base URL override
- **THEN** blog fetches target same-origin `/api/contentful` routes

#### Scenario: API base URL override is configured
- **WHEN** an API base URL override is configured for local development or rollback
- **THEN** blog fetches use that configured base URL without duplicating slashes or changing endpoint paths

### Requirement: Local development remains container-compatible
The migration MUST preserve a documented local development workflow compatible with the existing Docker-based project conventions.

#### Scenario: Developer runs the local workflow
- **WHEN** a developer starts the documented local development workflow in the container context
- **THEN** the frontend and Contentful API path are available for blog development without requiring Render

#### Scenario: Package manager validation is run
- **WHEN** dependency install, build, lint, or test commands are needed for this migration
- **THEN** those commands run inside the container context instead of directly on the host

### Requirement: Render is removed from required production operations
The migrated production architecture SHALL NOT require Render for normal blog API operation after Netlify validation succeeds.

#### Scenario: Netlify Function path is validated
- **WHEN** the Netlify Contentful Function has been validated in production or a production-equivalent environment
- **THEN** Render is documented only as a temporary rollback option until decommissioned

#### Scenario: Rollback is needed before decommissioning
- **WHEN** the Netlify Function path has a production issue before Render is decommissioned
- **THEN** operators can restore the previous Render API base through the documented frontend API base URL override

### Requirement: Automated validation is deterministic
The implementation MUST include deterministic validation for the migrated proxy and frontend routing behavior without requiring live Contentful data in routine tests.

#### Scenario: Proxy behavior is tested
- **WHEN** automated proxy tests run
- **THEN** they validate successful responses, missing configuration, upstream failures, article-not-found behavior, and route compatibility using mocks or fixtures

#### Scenario: Frontend API base behavior is tested
- **WHEN** automated frontend tests run
- **THEN** they validate same-origin defaults and API base URL override normalization for blog requests

#### Scenario: Live smoke check is documented
- **WHEN** a live Contentful or deployed Netlify smoke check is useful
- **THEN** it is documented as an optional manual validation step rather than a requirement for routine automated tests

### Requirement: Public Legacy Queries Are Bounded
Legacy public article list and tag routes MUST apply safe-integer, maximum-page, and bounded filter rules before constructing Contentful Delivery queries.

#### Scenario: Legacy route receives an excessive page value
- **WHEN** a public `/entries` or `/tagged` request contains a page value beyond the approved maximum
- **THEN** the server clamps or rejects it deterministically before calculating an upstream skip value
