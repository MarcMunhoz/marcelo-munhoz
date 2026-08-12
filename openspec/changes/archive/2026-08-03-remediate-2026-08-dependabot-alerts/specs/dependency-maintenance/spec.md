## ADDED Requirements

### Requirement: Dependabot alerts are reconciled with local audit output
Each dependency remediation pass MUST track open GitHub Dependabot security alerts and reconcile them with the containerized local audit result before completion.

#### Scenario: Dependabot and npm audit use different counts
- **WHEN** Dependabot reports open alerts and `npm audit` groups the same dependency state into a different number of vulnerable packages
- **THEN** the implementation report lists both counts and explains the difference between alert-level tracking and package-level audit grouping

#### Scenario: Dependabot alert remains open
- **WHEN** an open Dependabot alert cannot be safely remediated in the current pass
- **THEN** the implementation report documents the alert number, advisory, package, affected manifest, blocker, mitigation, and follow-up path

#### Scenario: Dependabot alert is remediated
- **WHEN** a package update, lockfile refresh, or override remediates an open Dependabot alert
- **THEN** the implementation report records the alert number, package, advisory, and validation evidence used to confirm the remediation
