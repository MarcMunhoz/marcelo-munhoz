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
The system SHALL allow authenticated writers to create and edit article drafts or submissions through the admin area and return them to the dashboard after a successful terminal editor action.

#### Scenario: Writer creates article draft
- **WHEN** an authenticated writer submits valid new article content
- **THEN** the system creates a draft or submission without publishing it to the public blog

#### Scenario: Writer edits permitted draft
- **WHEN** an authenticated writer edits an article draft or submission they are allowed to modify
- **THEN** the system saves the changes without publishing them to the public blog

#### Scenario: Writer submits article for review
- **WHEN** an authenticated writer marks an article draft as ready for review
- **THEN** the system makes the article visible in the owner review workflow

#### Scenario: Writer saves a draft
- **WHEN** an authenticated writer successfully saves a draft from the focused editor
- **THEN** the system replaces the current route with `/admin`
- **AND** the browser Back action does not reopen a stale editor state

#### Scenario: Writer submits an article for review
- **WHEN** an authenticated writer successfully submits an article for review from the focused editor
- **THEN** the system replaces the current route with `/admin`
- **AND** the browser Back action does not reopen a stale editor state

#### Scenario: Writer requests unpublication
- **WHEN** an authenticated writer successfully requests unpublication from the focused editor
- **THEN** the system replaces the current route with `/admin`
- **AND** the browser Back action does not reopen a stale editor state

#### Scenario: Writer edits article fields
- **WHEN** an authenticated writer creates or edits an article
- **THEN** the system provides inputs for create date, title, slug, description, body, thumbnail, alt text, author, and Contentful tags

#### Scenario: Writer edits technical state
- **WHEN** an authenticated writer edits an article
- **THEN** the system does not expose Contentful version as a manually editable field

#### Scenario: Writer terminal action fails
- **WHEN** a writer save, review submission, or unpublication request fails
- **THEN** the system remains in the editor
- **AND** it preserves current form values and error feedback without navigating

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
The system SHALL restrict article publication lifecycle operations to the owner in the first version and return the owner to the dashboard after a successful editor unpublication.

#### Scenario: Owner publishes article
- **WHEN** the owner publishes a reviewed article
- **THEN** the system publishes the corresponding Contentful article so it can appear through the public blog read API

#### Scenario: Owner unpublishes article
- **WHEN** an owner successfully unpublishes an article from the focused editor
- **THEN** the system replaces the current route with `/admin`
- **AND** the browser Back action does not reopen a stale editor state

#### Scenario: Owner archives article
- **WHEN** the owner archives an article
- **THEN** the system archives the corresponding Contentful article through the server-side admin API

#### Scenario: Owner unpublication fails
- **WHEN** an owner unpublication request fails
- **THEN** the system remains in the editor
- **AND** it preserves current form values and error feedback without navigating

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
The system SHALL present admin session state with the user's display identity, role, dev preview state when applicable, and a sign-out action through a compact account menu instead of a generic duplicated role badge.

#### Scenario: Authenticated owner sees session controls
- **WHEN** an authenticated owner opens the admin area
- **THEN** the system displays the owner's name or email and the owner role in the admin session account menu
- **AND** the system provides a sign-out action

#### Scenario: Authenticated writer sees session controls
- **WHEN** an authenticated writer opens the admin area
- **THEN** the system displays the writer's name or email and the writer role in the admin session account menu
- **AND** the system provides a sign-out action

#### Scenario: User confirms sign out
- **WHEN** an authenticated admin chooses to sign out and confirms the prompt
- **THEN** the system signs the user out of the admin session
- **AND** the system prevents continued access to authenticated admin workflows

#### Scenario: Local preview state is visible
- **WHEN** the admin area is running in development preview mode
- **THEN** the system displays local preview state as development-only context
- **AND** the system does not present preview state as a real authenticated identity

#### Scenario: Account menu renders without photo
- **WHEN** the signed-in user has no profile photo
- **THEN** the account menu remains visually complete using text and icon fallback controls

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
The system SHALL open article creation and editing in explicit route-level pages rather than silently populating a persistent editor elsewhere on the dashboard.

#### Scenario: Admin creates a new article
- **WHEN** an admin chooses to create a new article
- **THEN** the system opens a focused article editor page for new content
- **AND** the dashboard list remains a navigation context rather than a mixed editing surface

#### Scenario: Admin edits an existing article
- **WHEN** an admin chooses to edit an article from the table or review queue
- **THEN** the system opens a focused editor page for that article
- **AND** the route and page title make clear which article is being edited

#### Scenario: Admin exits the editor
- **WHEN** an admin closes or leaves the focused editor
- **THEN** the system returns the admin to a coherent dashboard or article list state

#### Scenario: Admin has unsaved editor changes
- **WHEN** an admin attempts to leave an article editor page with unsaved changes
- **THEN** the system asks for confirmation or otherwise prevents accidental loss of the unsaved edits

### Requirement: Article Dates Are Persisted Safely And Rendered As Localized Dates
The system SHALL persist article creation and update timestamps as timezone-safe instants while rendering public article dates as localized date-only values.

#### Scenario: Admin saves a newly created article
- **WHEN** an authenticated author saves a new article draft
- **THEN** the system stores the article creation timestamp as an unambiguous instant
- **AND** the stored value preserves the intended editorial calendar date regardless of the author's browser timezone, Netlify runtime timezone, or Contentful storage timezone

#### Scenario: Admin saves an edited article
- **WHEN** an authenticated author saves changes to an existing article
- **THEN** the system stores or updates an article update timestamp as an unambiguous instant when the content model supports it
- **AND** the update timestamp does not replace the original creation timestamp

#### Scenario: Public article displays creation date
- **WHEN** a public article renders a byline
- **THEN** the system displays the article creation date without time
- **AND** the displayed date is localized for the article or site locale

#### Scenario: Public article displays updated date only when useful
- **WHEN** a public article has both creation and update timestamps
- **AND** the localized creation date and localized update date are different calendar days
- **THEN** the system displays both the creation date and an updated date without time
- **AND** the system omits the updated date when both timestamps resolve to the same localized calendar day

#### Scenario: Public byline language matches content locale
- **WHEN** a public article renders an author byline
- **THEN** labels such as "By", "on", "Por", and "em" match the article or site locale
- **AND** an English article does not render Portuguese byline labels

#### Scenario: Admin selects article language
- **WHEN** an authenticated author creates or edits an article
- **THEN** the focused article editor provides an explicit article language control for Portuguese and English content
- **AND** the system stores the selected editorial language when the Contentful Article model supports it
- **AND** public byline labels prefer the selected editorial language over legacy Contentful technical locale defaults

#### Scenario: Localized Contentful locale values disagree
- **WHEN** the Contentful Article `locale` field is localized across multiple environment locales
- **THEN** the admin reads the editorial language from the Contentful environment default locale used by public Delivery API responses
- **AND** saving a language selection writes the same editorial value to every enabled locale slot

#### Scenario: Legacy article has no explicit editorial locale
- **WHEN** a public article has no stored `locale` value
- **THEN** the system may infer Portuguese or English conservatively from article text
- **AND** language metadata tags do not override an explicit Contentful `locale` field

#### Scenario: Published article has saved changes
- **WHEN** an authenticated author saves changes to an already published Contentful entry
- **THEN** the admin reports that the article has unpublished changes
- **AND** the public article remains unchanged until an authorized owner publishes the new entry version

#### Scenario: Owner publishes saved changes
- **WHEN** an owner publishes an article with unpublished changes
- **THEN** the latest saved editorial locale and content become publicly visible together
- **AND** the admin reports the article as published after reloading its Contentful state

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

#### Scenario: Admin needs technical diagnostics
- **WHEN** an admin workflow needs technical identifiers for debugging
- **THEN** the system exposes them only through an intentional diagnostic surface
- **AND** the primary editing form remains focused on editorial fields

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

### Requirement: Author Profiles Are Managed Separately From Identity
The system SHALL manage public author profile data through Contentful Author entries while using Netlify Identity only for authentication and role state.

#### Scenario: Admin views own author profile
- **WHEN** an authenticated admin opens their author profile area
- **THEN** the system displays the resolved Contentful Author profile for that account
- **AND** the system does not expose Netlify Identity account internals as public author fields

#### Scenario: Admin edits public author profile
- **WHEN** an authenticated admin saves allowed author profile fields
- **THEN** the system updates the matching Contentful Author entry through an authenticated server-side admin API
- **AND** the system does not mutate Netlify Identity account data as part of the author profile save

#### Scenario: Author profile photo is missing
- **WHEN** an author profile has no photo
- **THEN** the system renders a professional fallback using available author display data
- **AND** the system does not block profile display, article editing, or public byline rendering

#### Scenario: Author identity cannot be resolved
- **WHEN** an authenticated admin has no trusted mapping to a Contentful Author entry
- **THEN** the system displays a user-safe unresolved profile state
- **AND** the system does not allow profile edits against an arbitrary author entry

### Requirement: Public Articles Link To Author Information
The system SHALL make public article author names navigable to author information without exposing authentication metadata.

#### Scenario: Reader opens an article byline
- **WHEN** a public article renders an author byline with a resolved author
- **THEN** the author name links to author information for that Contentful Author entry
- **AND** the linked view displays public author fields such as name, biography, and optional photo when available

#### Scenario: Public author has no photo
- **WHEN** a reader opens author information for an author without a photo
- **THEN** the system displays the author information without a broken image or required-photo placeholder

#### Scenario: Public author information renders
- **WHEN** the public author information view renders
- **THEN** the system does not expose Netlify Identity e-mail, role metadata, invite state, or internal account identifiers

### Requirement: Article Images Can Be Edited Visually
The system SHALL allow admins to interact with article images visually and use Cloudinary-backed editing where supported.

#### Scenario: Admin clicks existing article image
- **WHEN** an editable article has an existing thumbnail
- **THEN** the system lets the admin open image actions from the thumbnail preview
- **AND** the system offers replacement and supported edit actions without exposing raw image URLs as primary controls

#### Scenario: Cloudinary editor is available
- **WHEN** the Cloudinary image editor widget can load for the selected asset
- **THEN** the system opens a visual editing workflow for supported operations such as crop or resize
- **AND** saving the edit updates the article image metadata or transformation through an authenticated workflow

#### Scenario: Cloudinary editor is unavailable
- **WHEN** the Cloudinary image editor widget is unavailable, unsupported, or fails to load
- **THEN** the system keeps image selection and replacement available
- **AND** the system displays a user-safe fallback state instead of blocking the editor

### Requirement: Administrative Surfaces Preserve Complete Workflows On Compact Viewports
The system SHALL adapt the dashboard and focused article editor at or below the 720-pixel compact breakpoint without removing metadata, authorized operations, validation, or desktop behavior.

#### Scenario: Admin reviews articles on a compact dashboard
- **WHEN** the article queue renders at or below the compact breakpoint
- **THEN** each article uses a full-width card with title, status, author, date, tags, and every action allowed by the same authorization and lifecycle guards as the desktop row
- **AND** tag toggles, article-specific loading feedback, filters, status navigation, metrics, and review queues remain reachable without widening the document

#### Scenario: Admin edits an article on a compact viewport
- **WHEN** the focused editor renders at or below the compact breakpoint
- **THEN** its heading, fields, Markdown formatting and mode controls, media actions, and workflow actions remain reachable without changing their handlers
- **AND** visible keyboard focus remains inside the viewport while wide control groups scroll or wrap within their own containers

#### Scenario: Admin opens compact media management
- **WHEN** the media dialog opens on a compact viewport
- **THEN** the dialog is bounded by viewport width and height, scrolls internally, and retains all selection and editing controls

#### Scenario: Admin uses a wider administrative viewport
- **WHEN** the dashboard or editor renders above the compact breakpoint
- **THEN** the desktop article table and established editor composition remain available

### Requirement: Owner Safely Manages Article Tags
The system SHALL let the owner review and manage Contentful article tags from the admin area without exposing destructive tag operations to writers.

#### Scenario: Owner opens tag management
- **WHEN** the owner opens the tag-management area
- **THEN** the system lists each non-reserved article tag with its name, stable ID, visibility, and article usage count
- **AND** it does not expand the list into the individual articles using each tag

#### Scenario: Owner creates a tag
- **WHEN** the owner submits a valid unique tag name
- **THEN** the system creates a public Contentful tag and adds it to the management list

#### Scenario: Owner attempts to delete a tag in use
- **WHEN** a tag has an article usage count greater than zero
- **THEN** the destructive action is unavailable
- **AND** the interface directs the owner to remove the tag from matching articles first

#### Scenario: Owner deletes an unused tag
- **WHEN** the owner requests deletion of a tag with zero article usage
- **THEN** the interface presents one confirmation before sending the deletion request
- **AND** the server rejects remaining references from any entry or asset before deleting the Contentful tag

#### Scenario: Owner opens tag deletion confirmation
- **WHEN** the owner activates deletion for an unused tag
- **THEN** one confirmation opens using the administrative interface's bundled declarative components
- **AND** no deletion request is sent until the owner accepts that confirmation

#### Scenario: Tag deletion conflicts with current Contentful state
- **WHEN** usage changes after the displayed count or Contentful rejects deletion because a reference remains
- **THEN** the system keeps the tag and returns a safe conflict message
- **AND** it does not expose provider diagnostics or configuration

#### Scenario: Contentful briefly rate limits tag deletion
- **WHEN** a deletion check receives a short `429` reset interval
- **THEN** the server retries once after the provider reset
- **AND** a repeated or long rate limit returns a safe actionable error without weakening usage revalidation

#### Scenario: Owner deletion crosses the administrative transport boundary
- **WHEN** the owner confirms deletion of an unused tag
- **THEN** the browser sends an owner-only POST deletion command to the administrative Function
- **AND** the server preserves reference checks and performs the versioned DELETE only against Contentful

#### Scenario: Writer accesses tag management
- **WHEN** an authenticated non-owner requests the tag-management page or destructive API
- **THEN** the system denies the owner-only operation

#### Scenario: Admin filters articles from a tag chip
- **WHEN** an admin activates a tag chip in an article row
- **THEN** the existing tag filter is set to that tag without clearing unrelated filters
- **AND** the selected chip uses inverse colors to communicate the active state

#### Scenario: Admin clears a tag chip filter
- **WHEN** an admin activates the currently selected tag chip again
- **THEN** the tag filter is cleared while unrelated filters remain unchanged

#### Scenario: Reserved language tags are returned upstream
- **WHEN** Contentful returns `article-lang-pt-br` or `article-lang-en-us`
- **THEN** the system excludes those legacy IDs from public filters, article-editor choices, and tag management
- **AND** article locale continues to use the explicit editorial locale field

### Requirement: Authors Configure Gravatar-First Profile Photos
The system SHALL let an authenticated author use a public Gravatar profile as the preferred public photo without deriving or persisting a Netlify Identity email.

#### Scenario: Author saves a Gravatar profile
- **WHEN** an author supplies a valid public Gravatar profile slug or URL
- **THEN** the server resolves and stores its canonical public identifier without storing a raw email address
- **AND** public photo consumers request the current Gravatar avatar at an appropriate display resolution

#### Scenario: Gravatar has no usable avatar
- **WHEN** the preferred Gravatar image is unavailable
- **THEN** the interface tries the configured allowlisted HTTPS fallback URL
- **AND** it displays author initials when the fallback is absent or also fails

#### Scenario: Author supplies an unsafe photo value
- **WHEN** the Gravatar identifier is invalid or the fallback URL uses credentials, a non-HTTPS scheme, or a host outside the allowlist
- **THEN** the profile is not overwritten
- **AND** the author receives a safe validation message

#### Scenario: Author edits photo guidance
- **WHEN** the author edits public photo settings
- **THEN** the form recommends a centered square image with suitable minimum and ideal dimensions and efficient formats

#### Scenario: Legacy author photo is loaded
- **WHEN** an existing author uses a legacy string, Contentful Asset, or Cloudinary-style photo value
- **THEN** the public and administrative photo surfaces continue to render it

#### Scenario: Author reviews the active photo setup
- **WHEN** the author opens the profile photo editor or an image candidate fails to load
- **THEN** the form identifies the source currently displayed as Gravatar, fallback URL, legacy photo, or initials
- **AND** the photo reset action remains available for configured images that fail and clears only this blog's stored photo settings without changing the Gravatar profile or original image

### Requirement: Administrative Routes Omit The Public Cookie Notice
The system SHALL keep the public analytics consent notice out of routes marked as administrative without changing the pending consent state.

#### Scenario: User opens an administrative route with consent pending
- **WHEN** the active route requires admin access and the public cookie notice has not been dismissed
- **THEN** the cookie notice is not rendered in the administrative area
- **AND** returning to a public route renders the still-pending notice
