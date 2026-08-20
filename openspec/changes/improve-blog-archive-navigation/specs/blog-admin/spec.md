## MODIFIED Requirements

### Requirement: Writers Can Draft And Submit Articles
The system SHALL allow authenticated writers to create and edit article drafts or submissions through the admin area and return them to the dashboard after a successful terminal editor action.

#### Scenario: Writer creates article draft
- **WHEN** an authenticated writer submits valid new article content
- **THEN** the system creates a draft or submission without publishing it to the public blog

#### Scenario: Writer edits permitted draft
- **WHEN** an authenticated writer edits an article draft or submission they are allowed to modify
- **THEN** the system saves the changes without publishing them to the public blog

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
