## ADDED Requirements

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
