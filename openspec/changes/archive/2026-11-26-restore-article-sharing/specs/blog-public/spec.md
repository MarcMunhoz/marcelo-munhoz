## ADDED Requirements

### Requirement: Public Articles Offer Direct Sharing and Link Copying

The public article page SHALL provide a styled menu with visible labels for Email, Facebook, LinkedIn, Telegram, X, WhatsApp, and Copy link. Each action SHALL be usable with pointer and keyboard.

#### Scenario: A reader chooses a sharing destination
- **WHEN** a reader activates a direct sharing action
- **THEN** the action hands off to the selected destination with the current article URL and any title, text, or hashtags supported by that destination
- **AND** the X action is identified by its current name and icon

#### Scenario: A reader copies the current article link
- **WHEN** a reader chooses Copy link, including after navigating between articles within the site
- **THEN** the current article URL is copied and the menu gives visible confirmation
- **AND** if copying fails, the selectable current article URL is available for manual copying

### Requirement: Public Profiles Omit the Retired Personal X Account

The site SHALL omit the retired personal X profile from its public profile links.

#### Scenario: A visitor views the About profile list
- **WHEN** a visitor opens About
- **THEN** the retired personal X profile link is absent and the remaining profile links are available

### Requirement: Public Articles Provide Social Preview Metadata

The initial HTML of a public article SHALL include an escaped article title, URL, and available description and HTTPS preview image so social crawlers can read them without running JavaScript.

#### Scenario: A crawler requests an article by byte range
- **WHEN** a crawler sends a byte-range request for a public article with available metadata
- **THEN** the response returns complete HTML with status 200 and article-specific preview tags

#### Scenario: Article metadata is unavailable
- **WHEN** article metadata cannot be loaded
- **THEN** the public page retains its normal article loading and recovery behavior
