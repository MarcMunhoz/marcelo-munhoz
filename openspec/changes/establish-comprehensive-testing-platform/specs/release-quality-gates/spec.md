## Purpose

Defines fail-closed release validation and merge protections for changes promoted from `develop` to the production `main` branch.

## ADDED Requirements

### Requirement: Production Pull Requests Enforce The Release Source
Every pull request targeting `main` MUST explicitly validate that its source branch is `develop`.

#### Scenario: Approved release source opens a pull request
- **WHEN** a pull request from `develop` targets `main`
- **THEN** the source-policy check passes and the remaining release validation runs

#### Scenario: Unapproved source targets production
- **WHEN** a pull request from any branch other than `develop` targets `main`
- **THEN** the source-policy check fails explicitly instead of being skipped or treated as successful

### Requirement: Release Validation Runs In Containers
All package-manager, build, lint, security scan, unit, component, integration, contract, and browser commands introduced by the release workflow MUST run inside pinned container contexts.

#### Scenario: CI validation starts
- **WHEN** the release workflow executes on a hosted runner
- **THEN** the runner only orchestrates containers and does not install or execute project packages and browsers directly on the host

#### Scenario: Developer runs the release validation locally
- **WHEN** a developer invokes the documented validation workflow
- **THEN** the same containerized commands and pinned runtime environments are available without requiring locally installed project browsers

### Requirement: Aggregate Quality Gate Fails Closed
The release workflow MUST expose one stable aggregate quality check that evaluates every required current-run result and fails unless all dependencies succeed.

#### Scenario: Every required validation succeeds
- **WHEN** source policy, lint, build, credential scanning, complete coverage, Chrome E2E, Firefox E2E, and remote smoke all succeed for the current pull-request commit
- **THEN** the aggregate `quality-gate` check succeeds

#### Scenario: Required validation does not succeed
- **WHEN** any required dependency fails, times out, is cancelled, or is skipped unexpectedly
- **THEN** the aggregate `quality-gate` runs regardless of dependency state and fails with the non-successful results identified

#### Scenario: Pull request receives a newer commit
- **WHEN** a new commit is pushed to an open release pull request
- **THEN** obsolete workflow work may be cancelled and only successful checks associated with the latest required commit can satisfy the gate

### Requirement: Deploy Preview Matches The Pull Request Commit
Remote validation MUST prove that the Netlify Deploy Preview under test was built from the current pull-request commit.

#### Scenario: Current preview becomes available
- **WHEN** the preview exposes sanitized build identity matching the current pull-request commit
- **THEN** the remote smoke suite begins against that preview

#### Scenario: Preview is stale or unavailable
- **WHEN** the preview reports another commit or does not become available within the bounded wait period
- **THEN** remote smoke fails without testing or accepting the stale deployment

### Requirement: Deploy Preview Receives Mandatory Read-Only Smoke Validation
The current Netlify Deploy Preview MUST pass a Chrome smoke suite that validates the production-equivalent serving boundary without mutating privileged external data.

#### Scenario: Deployed public surface is healthy
- **WHEN** remote smoke runs against the current preview
- **THEN** critical public pages, SPA navigation, assets, redirects, public Functions, response headers, desktop layout, and mobile layout pass their availability and safety checks

#### Scenario: Administrative surface is inspected remotely
- **WHEN** remote smoke visits an administrative route
- **THEN** it verifies only safe signed-out behavior, indexing policy, and page availability without authenticating, invoking privileged mutations, or requiring administrative credentials

#### Scenario: Deployed application has a critical browser failure
- **WHEN** a critical page, request, asset, header, redirect, or browser execution check fails
- **THEN** remote smoke fails and retains sanitized diagnostic evidence

### Requirement: Main Requires Application And Deployment Checks
The `main` branch MUST reject pull-request acceptance until both the aggregate application quality check and the Netlify Deploy Preview check succeed for the required commit.

#### Scenario: Required checks pass
- **WHEN** `quality-gate` and the Netlify Deploy Preview check both succeed for the current required commit
- **THEN** the test and deployment protection requirements permit the pull request to proceed to remaining human acceptance controls

#### Scenario: Required check is missing or unsuccessful
- **WHEN** either required check is absent, pending, failed, cancelled, stale, or otherwise unsuccessful
- **THEN** the branch protection or ruleset prevents the pull request from being accepted into `main`
