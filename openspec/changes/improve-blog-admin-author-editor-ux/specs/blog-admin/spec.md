## ADDED Requirements

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

## MODIFIED Requirements

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
