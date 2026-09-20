## ADDED Requirements

### Requirement: Public Articles Render Safe Editorial Markdown
The system SHALL render supported article Markdown as semantic reader content through a sanitizing boundary that prevents CMS-controlled text from becoming executable browser content.

#### Scenario: Reader opens an article with supported Markdown
- **WHEN** an article body contains paragraphs, headings, emphasis, strong text, links, lists, blockquotes, code, tables, or images expressed as supported Markdown
- **THEN** the public article renders the corresponding semantic content instead of exposing the Markdown delimiters as inert text
- **AND** the presentation remains contained and readable on compact and wide viewports

#### Scenario: Article Markdown contains active HTML
- **WHEN** an article body contains raw HTML, scripts, event handlers, active elements, or other executable markup
- **THEN** the rendering boundary removes or safely exposes the unsupported input without executing it
- **AND** supported surrounding Markdown remains readable

#### Scenario: Article Markdown contains an unsafe URL
- **WHEN** a Markdown link, image, or media-like value uses an unsafe scheme, malformed destination, or disallowed origin
- **THEN** the system does not create unsafe navigation, image, or executable browser content from that value

### Requirement: Public Articles Render Allowlisted Standalone Video Embeds
The system SHALL render a strictly validated standalone YouTube reference as a dedicated accessible media block without accepting arbitrary iframe markup from article content.

#### Scenario: Article contains an approved standalone YouTube URL
- **WHEN** an approved YouTube URL occupies its own Markdown paragraph
- **THEN** the article renders it on its own row as a full-width responsive player with a 16:9 aspect ratio
- **AND** the player uses the approved privacy-enhanced origin, an accessible title, fullscreen support, and only the capabilities required for playback

#### Scenario: YouTube URL appears within prose
- **WHEN** an otherwise valid YouTube URL occurs within a sentence or shares its paragraph with other content
- **THEN** the system renders it as ordinary safe Markdown content rather than replacing the sentence with a player

#### Scenario: Video-like input is not approved
- **WHEN** article content contains a malformed URL, a lookalike host, an unsupported provider, an invalid video identifier, or raw iframe markup
- **THEN** the system does not create a media player or widen the browser framing policy for that input

#### Scenario: Production policy loads an approved player
- **WHEN** a public article renders an approved player in production
- **THEN** the browser Content Security Policy permits the exact required frame origin
- **AND** it continues to reject arbitrary third-party frame origins
