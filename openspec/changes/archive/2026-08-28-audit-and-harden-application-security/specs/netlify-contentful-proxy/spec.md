## ADDED Requirements

### Requirement: Public Legacy Queries Are Bounded
Legacy public article list and tag routes MUST apply safe-integer, maximum-page, and bounded filter rules before constructing Contentful Delivery queries.

#### Scenario: Legacy route receives an excessive page value
- **WHEN** a public `/entries` or `/tagged` request contains a page value beyond the approved maximum
- **THEN** the server clamps or rejects it deterministically before calculating an upstream skip value
