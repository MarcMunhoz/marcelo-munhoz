## Purpose

Specify the protected blog administration area, server-side admin API boundaries, writer and owner editorial workflows, Contentful Management API behavior, Cloudinary media handling, and deterministic validation expectations.

## Requirements

### Requirement: Admin Area Requires Authentication
The system SHALL expose blog administration pages only to authenticated admin users.

#### Scenario: Unauthenticated user opens admin
- **WHEN** an unauthenticated user requests an admin page
- **THEN** the system prevents access to the admin interface and presents an authentication path

#### Scenario: Authenticated writer opens admin
- **WHEN** an authenticated writer requests the admin area
- **THEN** the system displays writer-allowed article drafting and submission workflows

#### Scenario: Authenticated owner opens admin
- **WHEN** an authenticated owner requests the admin area
- **THEN** the system displays owner review and article lifecycle workflows

### Requirement: Admin Dashboard Is The First Admin Screen
The system SHALL make the admin dashboard the first screen for authenticated admin users.

#### Scenario: Writer opens dashboard
- **WHEN** an authenticated writer opens `/admin`
- **THEN** the system displays a CMS-style dashboard with article status counts, writer-allowed article lists, and writer-allowed article actions

#### Scenario: Owner opens dashboard
- **WHEN** an authenticated owner opens `/admin`
- **THEN** the system displays article status counts, review queues, owner lifecycle actions, and writer workflows

#### Scenario: Dashboard loads admin data
- **WHEN** an authenticated admin opens the dashboard
- **THEN** the system loads article rows, status counts, and review queues from server-side admin API data backed by Contentful article and editorial workflow records
- **AND** the dashboard does not use static sample articles as its runtime data source

#### Scenario: Metrics source is not connected
- **WHEN** no free-compatible page-view metrics source is configured
- **THEN** the dashboard displays editorial counts without requiring page-view counts

### Requirement: Admin API Requires Server-Side Authorization
The system MUST authorize every admin API request on the server before performing any Contentful Management API operation.

#### Scenario: Admin API receives unauthenticated request
- **WHEN** an admin API endpoint receives a request without a valid authenticated session
- **THEN** the system rejects the request without calling Contentful

#### Scenario: Writer requests owner-only action
- **WHEN** an authenticated writer requests publishing, unpublishing, archiving, or permanent deletion
- **THEN** the system rejects the request without calling the corresponding Contentful Management API mutation

#### Scenario: Owner requests owner-only action
- **WHEN** an authenticated owner requests publishing, unpublishing, archiving, or permanent deletion for an article
- **THEN** the system allows the request to proceed through the server-side Contentful Management API facade

### Requirement: Public Blog API Remains Separate
The system SHALL keep the existing public Contentful read API separate from the authenticated admin API.

#### Scenario: Public blog entry list is requested
- **WHEN** the browser requests the existing public article list API
- **THEN** the system uses the existing public read route contract without requiring admin authentication

#### Scenario: Public API receives mutation-like request
- **WHEN** a request to the public Contentful API attempts to create, edit, publish, unpublish, archive, or delete content
- **THEN** the system does not expose a mutation operation through the public API

#### Scenario: Admin API route is requested
- **WHEN** the browser requests an admin API route
- **THEN** the system handles it through the authenticated admin API surface rather than the public Contentful read proxy

### Requirement: Management Credentials Remain Server-Side
The system MUST use Contentful Management API credentials only from server-side runtime configuration and MUST NOT expose them to browser bundles, request parameters, user-visible errors, or public artifacts.

#### Scenario: Admin mutation is performed
- **WHEN** the admin backend performs a Contentful Management API operation
- **THEN** the backend reads the management credential from server-side runtime configuration and does not require browser-supplied Contentful credentials

#### Scenario: Management configuration is missing
- **WHEN** required management API configuration is absent
- **THEN** the system returns a user-safe configuration error without exposing secret names, secret values, stack traces, or raw upstream diagnostics

#### Scenario: Frontend bundle is built
- **WHEN** production frontend assets are built
- **THEN** the bundle does not contain the configured Contentful Management API credential

### Requirement: Writers Can Draft And Submit Articles
The system SHALL allow authenticated writers to create and edit article drafts or submissions through the admin area.

#### Scenario: Writer creates article draft
- **WHEN** an authenticated writer submits valid new article content
- **THEN** the system creates a draft or submission without publishing it to the public blog

#### Scenario: Writer edits permitted draft
- **WHEN** an authenticated writer edits an article draft or submission they are allowed to modify
- **THEN** the system saves the changes without publishing them to the public blog

#### Scenario: Writer submits article for review
- **WHEN** an authenticated writer marks an article draft as ready for review
- **THEN** the system makes the article visible in the owner review workflow

#### Scenario: Writer edits article fields
- **WHEN** an authenticated writer creates or edits an article
- **THEN** the system provides inputs for create date, title, slug, description, body, thumbnail, alt text, author, and Contentful tags

#### Scenario: Writer edits technical state
- **WHEN** an authenticated writer edits an article
- **THEN** the system does not expose Contentful version as a manually editable field

### Requirement: Article Images Use Cloudinary
The system SHALL allow authenticated writers to manage article thumbnail images through Cloudinary without exposing Cloudinary credentials to the browser.

#### Scenario: Writer selects existing Cloudinary image
- **WHEN** an authenticated writer selects an existing Cloudinary image for an article
- **THEN** the system stores the selected Cloudinary metadata in the article thumbnail field through the authenticated admin API

#### Scenario: Writer uploads image
- **WHEN** an authenticated writer uploads a new article image
- **THEN** the system uploads the image through a server-authorized Cloudinary flow and stores the returned Cloudinary metadata in the article thumbnail field

#### Scenario: Cloudinary configuration is missing
- **WHEN** required Cloudinary server configuration is absent
- **THEN** the system returns a user-safe media configuration error without exposing secret names, secret values, stack traces, or raw upstream diagnostics

#### Scenario: Frontend bundle is built with media support
- **WHEN** production frontend assets are built
- **THEN** the bundle does not contain Cloudinary API secrets or signed upload credentials

### Requirement: Writers Can Request Unpublication
The system SHALL allow authenticated writers to request that a published article be taken down without directly unpublishing it.

#### Scenario: Writer requests unpublication
- **WHEN** an authenticated writer submits an unpublication request for an eligible article
- **THEN** the system records the request for owner review without unpublishing the article

#### Scenario: Owner reviews unpublication request
- **WHEN** the owner views pending unpublication requests
- **THEN** the system shows enough article and requester context for the owner to approve or reject the request

### Requirement: Owner Controls Publication Lifecycle
The system SHALL restrict article publication lifecycle operations to the owner in the first version.

#### Scenario: Owner publishes article
- **WHEN** the owner publishes a reviewed article
- **THEN** the system publishes the corresponding Contentful article so it can appear through the public blog read API

#### Scenario: Owner unpublishes article
- **WHEN** the owner approves unpublishing an article
- **THEN** the system unpublishes the corresponding Contentful article so it no longer appears through the public blog read API

#### Scenario: Owner archives article
- **WHEN** the owner archives an article
- **THEN** the system archives the corresponding Contentful article through the server-side admin API

### Requirement: Permanent Deletion Is Owner-Only
The system MUST restrict permanent article deletion to the owner and require explicit confirmation in the admin experience.

#### Scenario: Writer attempts permanent deletion
- **WHEN** an authenticated writer attempts to permanently delete an article
- **THEN** the system rejects the request without deleting the article

#### Scenario: Owner confirms permanent deletion
- **WHEN** the owner explicitly confirms permanent deletion for an eligible article
- **THEN** the system permanently deletes the corresponding Contentful article through the server-side admin API

#### Scenario: Owner cancels permanent deletion
- **WHEN** the owner cancels a permanent deletion confirmation
- **THEN** the system leaves the article unchanged

### Requirement: Contentful Version Conflicts Are Handled Safely
The system SHALL handle Contentful Management API version conflicts without silently overwriting newer article changes.

#### Scenario: Article changed since editor loaded it
- **WHEN** a user saves an article based on a stale Contentful version
- **THEN** the system rejects or resolves the save without silently overwriting the newer upstream version

#### Scenario: Conflict response is shown
- **WHEN** an article save cannot proceed because of a version conflict
- **THEN** the system returns a user-safe conflict response that does not expose raw upstream diagnostics

### Requirement: Admin Validation Is Deterministic
The implementation MUST include deterministic validation for admin authorization, Contentful Management API behavior, and credential isolation without requiring live Contentful data in routine tests.

#### Scenario: Automated admin tests run
- **WHEN** the automated test suite runs
- **THEN** it validates writer and owner authorization behavior using mocks or fixtures

#### Scenario: Contentful management facade tests run
- **WHEN** server-side Contentful Management API facade tests run
- **THEN** they validate successful mutations, missing configuration, upstream failures, and version conflicts using mocks or fixtures

#### Scenario: Live smoke check is useful
- **WHEN** a live Contentful or deployed Netlify smoke check is useful
- **THEN** it is documented as optional manual validation rather than required routine automated validation

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
