## ADDED Requirements

### Requirement: Each Maintenance Pass Produces Reconciled Security Evidence
Each dependency maintenance pass MUST record the current npm audit result and open GitHub Dependabot alerts, map remediated advisories to package changes and validation evidence, and document any alert that remains unresolved.

#### Scenario: Audit and Dependabot counts differ
- **WHEN** npm audit and Dependabot report different counts for the dependency set
- **THEN** the maintenance report records both counts and explains the package-level versus alert-level difference

#### Scenario: An alert is remediated
- **WHEN** a package update, lockfile refresh, or override addresses an open Dependabot alert
- **THEN** the report identifies the alert, package, advisory, changed manifest or lockfile path, and validation evidence

#### Scenario: An alert cannot be remediated safely
- **WHEN** no compatible fix exists for an open advisory
- **THEN** the report records the alert, advisory, affected package, compatibility blocker, mitigation, and follow-up path
