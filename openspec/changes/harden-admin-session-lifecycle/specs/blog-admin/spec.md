## ADDED Requirements

### Requirement: Administrative Sessions Are Limited To The Active Browser Session
The system MUST accept a persisted production identity for administrative access only when the current browser session contains the application-owned ephemeral session marker established by a successful login.

#### Scenario: Administrator reloads during the same browser session
- **WHEN** an authenticated administrator reloads or navigates within the application while the current browser-session marker remains available
- **THEN** the system restores the administrative session without requiring another login

#### Scenario: Browser is closed and reopened
- **WHEN** the application starts without the browser-session marker but the identity provider restores a previously persisted user
- **THEN** the system rejects that restored administrative session
- **AND** it clears the provider session through the supported logout flow before allowing administrative access

#### Scenario: No active browser session exists
- **WHEN** a visitor opens an administrative route without an accepted current-browser administrative session
- **THEN** the system prevents access and presents the existing authentication path

#### Scenario: Administrator explicitly signs out
- **WHEN** an authenticated administrator confirms sign out in any application tab
- **THEN** the system clears the browser-session marker and administrative lifecycle state
- **AND** it signs out through the identity provider and prevents continued administrative access in every same-origin tab

### Requirement: Administrative Sessions Expire After Inactivity
The system MUST end an accepted production administrative session after 15 consecutive minutes without qualifying administrator activity.

#### Scenario: Administrator remains inactive
- **WHEN** no qualifying activity occurs for 15 consecutive minutes after login or the most recent qualifying activity
- **THEN** the system signs out through the identity provider
- **AND** it clears administrative session data and prevents further protected administrative actions

#### Scenario: Administrator is active before the warning period
- **WHEN** qualifying activity occurs on an administrative surface before 14 minutes of inactivity have elapsed
- **THEN** the system resets the inactivity interval for the accepted session

#### Scenario: Administrator reaches the warning period
- **WHEN** 14 consecutive minutes of inactivity have elapsed
- **THEN** the system displays a visible one-minute expiration warning with actions to continue the session or sign out

#### Scenario: Administrator intentionally continues the warned session
- **WHEN** the administrator activates the warning's continue-session action before the inactivity limit expires
- **THEN** the system dismisses the warning and starts a new 15-minute inactivity interval

#### Scenario: Incidental input occurs while warning is visible
- **WHEN** pointer movement, scrolling, or another non-confirming event occurs while the expiration warning is visible
- **THEN** the system does not silently extend the administrative session

#### Scenario: Administrator is active only on a public surface
- **WHEN** an authenticated visitor interacts with public content without interacting with an administrative surface
- **THEN** the system does not treat that public activity as administrative-session activity

### Requirement: Administrative Session Lifecycle Is Consistent Across Tabs
The system SHALL coordinate accepted-session activity, expiration warnings, continuation, and logout across same-origin application tabs without storing authentication tokens in the coordination state.

#### Scenario: Administrator is active in another admin tab
- **WHEN** qualifying activity occurs in one administrative tab before the warning period
- **THEN** other open application tabs use the updated activity time for the same accepted session

#### Scenario: Warning is continued in another tab
- **WHEN** the administrator continues the session from one warned tab
- **THEN** all open application tabs dismiss the warning and use the renewed inactivity interval

#### Scenario: Session expires in one tab
- **WHEN** the inactivity limit is reached in any open application tab
- **THEN** all open application tabs clear administrative state and stop protected administrative interaction
- **AND** the provider logout flow is performed idempotently

### Requirement: Session Hardening Preserves Existing Security Boundaries
The system MUST keep production authorization server-side and MUST keep development preview sessions separate from production browser-session controls.

#### Scenario: Client lifecycle state is forged or missing
- **WHEN** a client sends an administrative API request with forged, missing, or expired frontend lifecycle state
- **THEN** the server continues to require a valid provider-authenticated identity and the required role and ownership checks

#### Scenario: Development preview is used locally
- **WHEN** the application creates a development-only preview session
- **THEN** the preview workflow remains available for local testing
- **AND** it is not represented as a production authenticated session or persisted as production session proof

