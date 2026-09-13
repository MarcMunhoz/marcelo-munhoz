## MODIFIED Requirements

### Requirement: Automated validation is deterministic
The implementation MUST include deterministic validation for the migrated proxy and frontend routing behavior without requiring live Contentful data in routine tests, plus mandatory read-only validation of the deployed Netlify boundary.

#### Scenario: Proxy behavior is tested
- **WHEN** automated proxy tests run
- **THEN** they validate successful responses, missing configuration, upstream failures, article-not-found behavior, and route compatibility using mocks or fixtures

#### Scenario: Frontend API base behavior is tested
- **WHEN** automated frontend tests run
- **THEN** they validate same-origin defaults and API base URL override normalization for blog requests

#### Scenario: Live smoke check is documented
- **WHEN** the current Netlify Deploy Preview is available
- **THEN** mandatory remote smoke validation confirms the public Function route, SPA routing, redirects, headers, and critical public responses without requiring mutable live Contentful assertions
