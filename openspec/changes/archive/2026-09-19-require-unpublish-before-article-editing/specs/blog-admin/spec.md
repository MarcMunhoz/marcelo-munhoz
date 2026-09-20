## ADDED Requirements

### Requirement: Live Articles Must Be Unpublished Before Editing
The system SHALL prevent article content from being edited while the authoritative Contentful lifecycle reports a published version, including an entry with unpublished changes over a published version.

#### Scenario: Admin opens a live article editor route directly
- **WHEN** an authenticated owner or writer navigates directly to the edit route for an article whose lifecycle is published or changed
- **THEN** the system displays guidance that the article must be unpublished before editing
- **AND** the system does not display mutable article fields or a save action

#### Scenario: Owner prepares a published article for editing
- **WHEN** an owner needs to change a published article
- **THEN** the owner can explicitly unpublish it before opening the editor
- **AND** editing becomes available only after the authoritative lifecycle reports the article as unpublished

#### Scenario: Writer prepares a published article for editing
- **WHEN** a writer needs to change an eligible published article
- **THEN** the writer can request unpublication without receiving direct unpublish authority
- **AND** editing remains unavailable until an owner completes unpublication and the authoritative lifecycle reports the article as unpublished

#### Scenario: Client attempts to save a live article
- **WHEN** the admin client attempts to save an existing article whose loaded authoritative lifecycle is published or changed
- **THEN** the client refuses the save and explains that unpublication is required first

#### Scenario: Management API receives an update for a live article
- **WHEN** an authenticated update request targets an entry whose current authoritative Contentful state is published or changed
- **THEN** the server rejects the update with a stable lifecycle error
- **AND** no article fields are written

#### Scenario: Author edits a non-live article
- **WHEN** an authorized author opens a new, draft, review, or unpublished article whose ownership and role permit editing
- **THEN** the established editing and review workflow remains available

## MODIFIED Requirements

### Requirement: Writers Can Draft And Submit Articles
The system SHALL allow authenticated writers to create and edit non-live article drafts or submissions through the admin area and return them to the dashboard after a successful terminal editor action.

#### Scenario: Writer creates article draft
- **WHEN** an authenticated writer submits valid new article content
- **THEN** the system creates a draft or submission without publishing it to the public blog

#### Scenario: Writer edits permitted draft
- **WHEN** an authenticated writer edits a non-live article draft or submission they are allowed to modify
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
- **WHEN** an authenticated writer successfully requests unpublication for a live article from the dashboard
- **THEN** the system keeps the article unavailable for editing until unpublication is completed
- **AND** the dashboard reports the pending request state

#### Scenario: Writer edits article fields
- **WHEN** an authenticated writer creates or edits a non-live article
- **THEN** the system provides inputs for create date, title, slug, description, body, thumbnail, alt text, author, and Contentful tags

#### Scenario: Writer edits technical state
- **WHEN** an authenticated writer edits an article
- **THEN** the system does not expose Contentful version as a manually editable field

#### Scenario: Writer terminal action fails
- **WHEN** a writer save, review submission, or unpublication request fails
- **THEN** the system remains in its current surface
- **AND** it preserves current form values or dashboard context and displays error feedback without navigating incorrectly

### Requirement: Admin Actions Match Role And Article State
The system SHALL show article actions that match the current admin role and authoritative article lifecycle state.

#### Scenario: Writer views draft article actions
- **WHEN** an authenticated writer views an editable draft or submission
- **THEN** the system offers writer-appropriate editing and submit-for-review actions
- **AND** the system does not offer owner-only publish, unpublish, archive, or permanent delete actions

#### Scenario: Writer views published article actions
- **WHEN** an authenticated writer views an eligible published article
- **THEN** the system offers a request-unpublication action instead of editing
- **AND** the system does not offer a request-publication action for the already published article

#### Scenario: Owner views review article actions
- **WHEN** an authenticated owner views an article ready for review
- **THEN** the system offers direct owner lifecycle actions such as publish or archive where eligible
- **AND** the system does not label owner lifecycle actions as writer-style requests

#### Scenario: Owner views published article actions
- **WHEN** an authenticated owner views a published article
- **THEN** the system offers direct owner moderation actions such as unpublish, archive, or permanent delete where eligible
- **AND** the system does not offer editing until unpublication is complete

#### Scenario: Admin views unpublished changes to a published article
- **WHEN** Contentful reports a published version and a newer draft version for the same article
- **THEN** the admin labels the article as having unpublished changes instead of fully published
- **AND** the system does not offer editing or publish-changes actions while the public version remains live

#### Scenario: Owner republishes changed article
- **WHEN** an owner views an article with unpublished changes over a published version
- **THEN** the system requires the owner to unpublish the live article before continuing the editorial workflow
- **AND** the system does not offer a direct publish-changes action while the public version remains live

#### Scenario: Writer submits changed article
- **WHEN** a writer views an article with unpublished changes over a published version
- **THEN** the system prevents further editing or review submission while the public version remains live
- **AND** the writer can request unpublication instead of changing or publishing the article directly

#### Scenario: Writer submits a specific article version
- **WHEN** a writer submits a non-live article for publication review
- **THEN** the editorial request records the current Contentful article version in `articleVersion`
- **AND** the request applies only to that submitted version

#### Scenario: Writer changes an article after submission
- **WHEN** the current non-live article version no longer matches the open request's `articleVersion`
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
- **WHEN** an authenticated owner or writer views a non-live article with a trusted creator match to their account
- **THEN** the system may offer article editing where the article state supports editing

### Requirement: Article Dates Are Persisted Safely And Rendered As Localized Dates
The system SHALL persist article creation and update timestamps as timezone-safe instants while rendering public article dates as localized date-only values.

#### Scenario: Admin saves a newly created article
- **WHEN** an authenticated author saves a new article draft
- **THEN** the system stores the article creation timestamp as an unambiguous instant
- **AND** the stored value preserves the intended editorial calendar date regardless of the author's browser timezone, Netlify runtime timezone, or Contentful storage timezone

#### Scenario: Admin saves an edited article
- **WHEN** an authenticated author saves changes to an existing non-live article
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
- **WHEN** an authenticated author creates or edits a non-live article
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
- **WHEN** Contentful reports saved draft changes over an already published article
- **THEN** the admin treats the article as live and prevents further saves until it is unpublished
- **AND** the public article remains unchanged while the live version continues to be served

#### Scenario: Owner publishes saved changes
- **WHEN** an owner views saved changes over an already published article
- **THEN** the system does not offer direct publication of those changes while the public version remains live
- **AND** the owner must unpublish and complete the non-live editorial workflow before publishing again
