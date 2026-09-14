## ADDED Requirements

### Requirement: Article Editor Previews Safe Published Markdown
The system SHALL give an authenticated author a preview of the supported Markdown presentation using the same content interpretation and safety rules as the public article.

#### Scenario: Author previews supported Markdown
- **WHEN** an author enters supported Markdown and opens article preview mode
- **THEN** the preview renders its semantic formatting rather than displaying source delimiters
- **AND** formatting and approved standalone video behavior match the public article presentation

#### Scenario: Author previews unsupported active content
- **WHEN** the article source contains raw active HTML, an unsafe URL, an arbitrary iframe, or another unsupported executable construct
- **THEN** preview mode does not execute or load that construct
- **AND** returning to source mode preserves the author's Markdown source for further editing

### Requirement: Article Editor Provides Integrated Emoji Selection
The system SHALL provide authenticated authors with an accessible emoji picker that inserts ordinary Unicode emoji into the article body without changing the Contentful article schema.

#### Scenario: Author browses and searches emoji
- **WHEN** an author opens the body editor's emoji control
- **THEN** the interface provides searchable and categorized emoji choices with supported skin-tone variants
- **AND** the picker remains contained and operable on compact and wide viewports

#### Scenario: Author inserts an emoji at the cursor
- **WHEN** an author selects an emoji while the body editor has a collapsed cursor position
- **THEN** the selected Unicode emoji is inserted at that position
- **AND** focus returns to the body editor immediately after the inserted emoji

#### Scenario: Author replaces a selection with an emoji
- **WHEN** an author selects text in the body editor and then chooses an emoji
- **THEN** the emoji replaces the selected text using the editor's existing input and dirty-state behavior
- **AND** subsequent typing continues immediately after the inserted emoji

#### Scenario: Author operates the emoji picker with a keyboard
- **WHEN** an author navigates the editor without a pointing device
- **THEN** the emoji control, search, categories, variants, choices, and dismissal are keyboard operable with visible focus

#### Scenario: Existing article contains emoji
- **WHEN** an author loads, previews, edits, saves, or publishes an article that already contains Unicode emoji
- **THEN** those characters remain unchanged through the established editorial workflow
