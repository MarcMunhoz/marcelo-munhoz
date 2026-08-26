## ADDED Requirements

### Requirement: Home Presents A Concise Editorial Identity
The Home page SHALL identify Marcelo, his web-development focus, and his cultural interests through a short, scannable hierarchy rather than long uninterrupted paragraphs.

#### Scenario: Reader opens Home on a wider viewport
- **WHEN** the Home page loads above the compact breakpoint
- **THEN** the page presents a clear identity statement, supporting copy, compact personal facts, knowledge content, and projects in that order
- **AND** the existing personal tone and “Projetos (in)úteis” label remain recognizable

#### Scenario: Reader opens Home on a compact viewport
- **WHEN** the Home page loads at or below the compact breakpoint
- **THEN** the identity statement and supporting copy remain readable without horizontal overflow
- **AND** no single introductory block requires the reader to scan a large uninterrupted paragraph

### Requirement: Home Uses The Supplied Hero Image
The Home page SHALL use the supplied Cloudinary hero asset as its primary image, span the viewport width, and preserve a cover-oriented visual composition.

#### Scenario: Hero image loads
- **WHEN** the Home page renders its hero
- **THEN** the image source is `https://res.cloudinary.com/marcelo-munhoz/image/upload/v1787690105/marcelo-munhoz-website/marcelomunhoz_hero.png`
- **AND** the image has meaningful alternative text
- **AND** the image fills the viewport-width hero using cover behavior without creating horizontal document overflow

### Requirement: Home Facts Remain Current And Scannable
The Home page SHALL continue to derive time-sensitive experience facts from the existing dynamic date logic while presenting them as compact labelled information.

#### Scenario: Reader views experience facts
- **WHEN** the Home page renders its personal facts
- **THEN** the location, current age or equivalent personal fact, and web-experience duration are presented as distinct labelled items
- **AND** time-sensitive values are calculated dynamically rather than hard-coded
