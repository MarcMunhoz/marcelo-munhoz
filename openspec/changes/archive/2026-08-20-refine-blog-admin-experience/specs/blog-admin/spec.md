## ADDED Requirements

### Requirement: Admin Session Controls Are User-Centered
The system SHALL present admin session state with the user's display identity, role, dev preview state when applicable, and a sign-out action instead of a generic duplicated role badge.

#### Scenario: Authenticated owner sees session controls
- **WHEN** an authenticated owner opens the admin area
- **THEN** the system displays the owner's name or email and the owner role in the admin session area
- **AND** the system provides a sign-out action

#### Scenario: Authenticated writer sees session controls
- **WHEN** an authenticated writer opens the admin area
- **THEN** the system displays the writer's name or email and the writer role in the admin session area
- **AND** the system provides a sign-out action

#### Scenario: User confirms sign out
- **WHEN** an authenticated admin chooses to sign out and confirms the prompt
- **THEN** the system signs the user out of the admin session
- **AND** the system prevents continued access to authenticated admin workflows

#### Scenario: Local preview state is visible
- **WHEN** the admin area is running in development preview mode
- **THEN** the system displays local preview state as development-only context
- **AND** the system does not present preview state as a real authenticated identity

### Requirement: Admin Navigation Represents Real Destinations
The system SHALL only show admin navigation controls that map to real admin destinations or clearly-scoped table filters.

#### Scenario: Admin navigation is rendered
- **WHEN** an admin opens the dashboard
- **THEN** visible navigation items either open a distinct admin destination or are presented as filter controls
- **AND** the system does not show decorative or duplicate sidebar entries that imply unavailable sections

#### Scenario: Writer navigates admin workflow
- **WHEN** an authenticated writer uses admin navigation
- **THEN** the navigation exposes writer-relevant destinations or filters without showing owner-only destinations as available

#### Scenario: Owner navigates admin workflow
- **WHEN** an authenticated owner uses admin navigation
- **THEN** the navigation exposes owner review and lifecycle workflows only where those workflows are functional

### Requirement: Article Table Uses Editorial Display Values
The system SHALL render article table rows using human-readable editorial values rather than raw Contentful identifiers or machine timestamps.

#### Scenario: Article table shows display date
- **WHEN** the admin article table renders an article with a date
- **THEN** the system displays the date in a human-readable format such as `July 25, 2026`
- **AND** the system does not display raw ISO timestamps in the primary table

#### Scenario: Article table shows author name
- **WHEN** the admin article table renders an article with an author reference
- **THEN** the system displays the resolved author name when available
- **AND** the system does not display the author entry ID as the primary author value

#### Scenario: Article table shows status and tags
- **WHEN** the admin article table renders status and tag data
- **THEN** the system aligns status badges consistently within the status column
- **AND** the system displays tags as readable chips or labels instead of an unstructured raw ID string

### Requirement: Admin Actions Match Role And Article State
The system SHALL show article actions that match the current admin role and article state.

#### Scenario: Writer views draft article actions
- **WHEN** an authenticated writer views an editable draft or submission
- **THEN** the system offers writer-appropriate editing and submit-for-review actions
- **AND** the system does not offer owner-only publish, unpublish, archive, or permanent delete actions

#### Scenario: Writer views published article actions
- **WHEN** an authenticated writer views an eligible published article
- **THEN** the system may offer a request-unpublication action
- **AND** the system does not offer a request-publication action for the already published article

#### Scenario: Owner views review article actions
- **WHEN** an authenticated owner views an article ready for review
- **THEN** the system offers direct owner lifecycle actions such as publish or archive where eligible
- **AND** the system does not label owner lifecycle actions as writer-style requests

#### Scenario: Owner views published article actions
- **WHEN** an authenticated owner views a published article
- **THEN** the system offers direct owner moderation actions such as unpublish, archive, or permanent delete where eligible
- **AND** the system does not require the owner to request unpublication

#### Scenario: Admin views unpublished changes to a published article
- **WHEN** Contentful reports a published version and a newer draft version for the same article
- **THEN** the admin labels the article as having unpublished changes instead of fully published
- **AND** the public version remains live until the newer draft is explicitly published

#### Scenario: Owner republishes changed article
- **WHEN** an owner views an eligible article with unpublished changes
- **THEN** the system offers a publish-changes action using the latest Contentful entry version
- **AND** the action does not require unpublishing the currently live version first

#### Scenario: Writer submits changed article
- **WHEN** a writer saves changes to an article they own that already has a published version
- **THEN** the system allows the writer to submit those changes for owner review
- **AND** the writer cannot publish the changes directly

#### Scenario: Writer submits a specific article version
- **WHEN** a writer submits an article for publication review
- **THEN** the editorial request records the current Contentful article version in `articleVersion`
- **AND** the request applies only to that submitted version

#### Scenario: Writer changes an article after submission
- **WHEN** the current article version no longer matches the open request's `articleVersion`
- **THEN** the admin treats the request as stale and does not present the newer draft as reviewed

#### Scenario: Owner publishes a reviewed version
- **WHEN** an owner publishes the article version referenced by an open publication request
- **THEN** the system closes that editorial request
- **AND** the closed request no longer overrides the article lifecycle state

#### Scenario: Admin views an article created by another author
- **WHEN** an authenticated owner or writer views an article without a trusted creator match to their account
- **THEN** the system does not offer article editing for that article
- **AND** owner moderation actions remain available where the owner role and article state allow them

#### Scenario: Admin edits an article they created
- **WHEN** an authenticated owner or writer views an article with a trusted creator match to their account
- **THEN** the system may offer article editing where the article state supports editing

### Requirement: Article Editing Opens In A Focused Surface
The system SHALL open article creation and editing in an explicit focused surface rather than silently populating a persistent editor elsewhere on the dashboard.

#### Scenario: Admin creates a new article
- **WHEN** an admin chooses to create a new article
- **THEN** the system opens a focused article editor for new content
- **AND** the dashboard list remains a navigation context rather than a mixed editing surface

#### Scenario: Admin edits an existing article
- **WHEN** an admin chooses to edit an article from the table or review queue
- **THEN** the system opens a focused editor for that article
- **AND** the transition makes clear which article is being edited

#### Scenario: Admin exits the editor
- **WHEN** an admin closes or leaves the focused editor
- **THEN** the system returns the admin to a coherent dashboard or article list state

### Requirement: Article Editor Hides Technical Contentful And Cloudinary Fields
The system SHALL keep technical Contentful and Cloudinary identifiers out of primary article editing controls.

#### Scenario: Admin edits author
- **WHEN** an admin edits an article author field
- **THEN** the system presents an author display control
- **AND** the system does not require direct entry of a Contentful author entry ID as the primary workflow

#### Scenario: Admin edits thumbnail
- **WHEN** an admin edits an article thumbnail
- **THEN** the system displays a thumbnail preview when image metadata is available
- **AND** the system does not show raw Cloudinary image ID or URL fields as primary controls

#### Scenario: Admin edits tags
- **WHEN** an admin edits article tags
- **THEN** the system presents tags as chips, selectable labels, or another structured control
- **AND** the system does not require a comma-separated raw ID string as the primary workflow

### Requirement: Media Library Provides Visual And Diagnostic States
The system SHALL make media selection visual and distinguish empty, loading, configuration, and upstream-failure states.

#### Scenario: Media library loads assets
- **WHEN** an admin opens the media library and assets are available
- **THEN** the system displays a visual grid or list with thumbnail previews
- **AND** selecting an asset updates the article thumbnail preview

#### Scenario: Media library is empty
- **WHEN** an admin opens the media library and the configured folder contains no assets
- **THEN** the system displays an empty state that explains no media is available in the configured scope
- **AND** the system still allows upload when upload configuration is available

#### Scenario: Media configuration is missing
- **WHEN** required Cloudinary server configuration is missing
- **THEN** the system displays a user-safe configuration state
- **AND** the system does not expose secret names, secret values, stack traces, or raw upstream diagnostics

### Requirement: Staging Supports Production-Like Admin Smoke Tests
The system SHALL document and support staging validation for admin behavior that cannot be fully represented by local dev preview sessions.

#### Scenario: Admin change needs production-like validation
- **WHEN** an admin change depends on Netlify Identity, Netlify redirects, Functions, Contentful, or Cloudinary behavior
- **THEN** the change may be pushed to the `staging` branch for preview validation before merging onward

#### Scenario: Staging smoke test runs
- **WHEN** an admin staging smoke test is performed
- **THEN** the test verifies real sign-in/sign-out, role metadata, authenticated admin API access, and representative Contentful or Cloudinary operations using disposable content
