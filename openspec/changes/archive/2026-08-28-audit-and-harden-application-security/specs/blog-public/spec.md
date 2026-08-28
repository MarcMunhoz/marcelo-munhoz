## ADDED Requirements

### Requirement: Public CMS Content Uses Safe Browser Boundaries
Public article and author content MUST render untrusted CMS Markdown and title data through a sanitization or text-only boundary that excludes executable markup and unsafe navigation.

#### Scenario: Public article contains active HTML in Markdown or title
- **WHEN** a public response contains CMS-controlled Markdown or title data
- **THEN** the browser renders only the supported safe content and does not assign the raw value to an executable HTML sink
