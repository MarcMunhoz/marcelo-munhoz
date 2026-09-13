## MODIFIED Requirements

### Requirement: Admin Validation Is Deterministic
The implementation MUST include deterministic validation for admin authorization, Contentful Management API behavior, credential isolation, and production-equivalent signed-out administration behavior without requiring live privileged Contentful, Cloudinary, or Identity operations in automated tests.

#### Scenario: Automated admin tests run
- **WHEN** the automated test suite runs
- **THEN** it validates writer and owner authorization behavior using mocks or fixtures

#### Scenario: Contentful management facade tests run
- **WHEN** server-side Contentful Management API facade tests run
- **THEN** they validate successful mutations, missing configuration, upstream failures, and version conflicts using mocks or fixtures

#### Scenario: Live smoke check is useful
- **WHEN** the current Netlify Deploy Preview is ready for mandatory remote smoke validation
- **THEN** the suite verifies safe signed-out admin availability, redirect behavior, and indexing policy without authenticating, requiring privileged credentials, or mutating live provider data
