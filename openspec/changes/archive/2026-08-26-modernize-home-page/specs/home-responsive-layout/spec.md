## ADDED Requirements

### Requirement: Home Content Adapts Without Overflow
The Home page SHALL adapt its hero, typography, knowledge groups, and project links to compact viewports without document-level horizontal overflow or illegible text.

#### Scenario: Compact viewport renders the hero
- **WHEN** the viewport is at or below 700 pixels wide
- **THEN** the hero remains contained within the viewport
- **AND** its cover crop does not create horizontal scrolling

#### Scenario: Compact viewport renders knowledge and projects
- **WHEN** the viewport is at or below 700 pixels wide
- **THEN** knowledge items and project links wrap or stack into readable groups
- **AND** labels remain visible or available through accessible text without relying on hover

#### Scenario: Wider viewport renders Home
- **WHEN** the viewport is wider than 700 pixels
- **THEN** the page may use a multi-column editorial arrangement
- **AND** the primary identity, hero, knowledge, and project content remain visually ordered and bounded
