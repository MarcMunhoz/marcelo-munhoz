## Purpose

Defines comprehensive, deterministic, and measurable automated test assurance for every application layer and supported browser journey.

## ADDED Requirements

### Requirement: In-Scope Application Code Has Complete Measured Coverage
The test platform MUST enforce 100 percent global and per-file coverage for lines, statements, functions, and branches across in-scope first-party frontend, middleware, Function, and script code.

#### Scenario: Complete coverage passes
- **WHEN** the unit, DOM, component, integration, and contract suites complete
- **THEN** every included file and the aggregate report show 100 percent line, statement, function, and branch coverage

#### Scenario: New or changed code lacks coverage
- **WHEN** any included file falls below 100 percent in any required metric
- **THEN** the test command fails and identifies the uncovered file, location, and metric

#### Scenario: Technical exclusion is necessary
- **WHEN** generated or technically unreachable code cannot produce meaningful executable coverage
- **THEN** the exclusion is limited to the smallest possible scope, recorded in an explicit reviewed allowlist, and accompanied by a technical rationale

### Requirement: Tests Validate Observable Behavior At The Appropriate Boundary
The test platform MUST validate pure logic, browser-dependent logic, rendered components, server contracts, and end-to-end journeys at the narrowest boundary that proves the required behavior.

#### Scenario: Frontend behavior is observable at runtime
- **WHEN** a requirement concerns rendering, interaction, focus, navigation, responsive state, loading, error, or recovery behavior
- **THEN** a rendered component or browser test exercises the behavior instead of relying only on source-text matching

#### Scenario: Static configuration is the behavior contract
- **WHEN** a requirement concerns redirects, headers, credential isolation, route metadata, or another declarative invariant
- **THEN** a deterministic contract test validates the parsed or effective configuration

#### Scenario: Pure or server-side behavior is exercised
- **WHEN** a utility, middleware handler, Function core, or service facade is tested
- **THEN** the test executes the behavior with controlled inputs and verifies success, invalid input, and applicable failure boundaries

### Requirement: Routine Automated Tests Are Deterministic And Externally Isolated
Routine automated tests MUST NOT require live Contentful, Cloudinary, Netlify Identity, or other mutable third-party data and credentials.

#### Scenario: External service behavior is required
- **WHEN** a test exercises a boundary backed by an external provider
- **THEN** the test uses a fixture, intercept, injected client, or controlled test double that represents the required provider responses

#### Scenario: Test suite runs without local secrets
- **WHEN** automated tests run locally or in CI
- **THEN** they complete without reading `.env`, `.env.*`, credentials, tokens, or private keys

#### Scenario: Privileged workflow is exercised
- **WHEN** writer or owner behavior is tested end to end
- **THEN** the suite uses the controlled local preview authorization path and simulated upstream mutations without changing live provider data

### Requirement: Browser Coverage Spans Supported Engines, Viewports, And Journeys
The browser suite MUST exercise the complete critical journey matrix in containerized Chrome and Firefox at desktop and mobile viewports.

#### Scenario: Browser suite runs in CI
- **WHEN** end-to-end validation starts
- **THEN** the same required journey suite runs in Chrome and Firefox supplied by pinned containers without requiring browsers on the developer host

#### Scenario: Route coverage is evaluated
- **WHEN** the browser suite completes
- **THEN** every first-class public and administrative route has at least one rendered navigation or direct-entry scenario

#### Scenario: Asynchronous page coverage is evaluated
- **WHEN** a page loads remote or deferred data
- **THEN** the suite verifies its applicable success, empty, failure, and recovery states

#### Scenario: Privileged behavior is evaluated
- **WHEN** an administrative action has role or ownership constraints
- **THEN** the suite verifies the applicable allowed and denied paths for signed-out, writer, and owner contexts

#### Scenario: Responsive behavior changes at a breakpoint
- **WHEN** desktop and mobile layouts expose materially different navigation, controls, or content flow
- **THEN** the suite verifies the observable behavior at both required viewport classes

### Requirement: Test Evidence Is Actionable And Sanitized
Automated validation MUST produce actionable coverage and failure evidence without exposing sensitive or environment-specific information.

#### Scenario: Coverage completes
- **WHEN** the coverage suite finishes
- **THEN** it produces console, HTML, and machine-readable reports suitable for local diagnosis, CI artifacts, and coverage reporting

#### Scenario: Browser test fails
- **WHEN** a Cypress scenario fails in CI
- **THEN** sanitized screenshots, videos, logs, and test metadata are retained as bounded diagnostic artifacts

#### Scenario: Evidence is published
- **WHEN** CI uploads or displays test evidence
- **THEN** the evidence excludes credentials, private URLs, local absolute paths, usernames, machine names, and environment identifiers

### Requirement: Legacy Test Retirement Preserves Assurance
The legacy test runner and source-inspection suites MUST be removed only after every relevant guarantee has an equal or stronger replacement in the new platform.

#### Scenario: Existing test is migrated
- **WHEN** a legacy test is replaced
- **THEN** its behavioral or contract guarantee is mapped to a passing new test before the old test is removed

#### Scenario: Migration reaches completion
- **WHEN** all relevant guarantees have migrated and the complete new platform passes
- **THEN** the legacy runner, obsolete scripts, and redundant source-inspection tests are removed from the final project workflow
