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
