## MODIFIED Requirements

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

## ADDED Requirements

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
- **THEN** the interface presents two sequential confirmations before sending the deletion request
- **AND** the server rejects remaining references from any entry or asset before deleting the Contentful tag

#### Scenario: Tag deletion conflicts with current Contentful state
- **WHEN** usage changes after the displayed count or Contentful rejects deletion because a reference remains
- **THEN** the system keeps the tag and returns a safe conflict message
- **AND** it does not expose provider diagnostics or configuration

#### Scenario: Contentful briefly rate limits tag deletion
- **WHEN** a deletion check receives a short `429` reset interval
- **THEN** the server retries once after the provider reset
- **AND** a repeated or long rate limit returns a safe actionable error without weakening usage revalidation

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
