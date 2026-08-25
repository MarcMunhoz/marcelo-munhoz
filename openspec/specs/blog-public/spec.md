# blog-public Specification

## Purpose
TBD - created by archiving change improve-blog-archive-navigation. Update Purpose after archive.
## Requirements
### Requirement: Public Surfaces Remain Usable On Compact Viewports
The system SHALL preserve public routes, content, and desktop presentation while adapting the global shell and public pages at or below the 700-pixel compact breakpoint without document-level horizontal overflow.

#### Scenario: Reader uses the compact global shell
- **WHEN** a public surface renders at or below the compact breakpoint
- **THEN** About and Blog remain available in a bounded labelled menu with icon-and-text items and keyboard behavior
- **AND** the page title, footer, and pending consent notice remain contained and legible within the viewport

#### Scenario: Reader views compact public content
- **WHEN** Home, About, or an article renders at or below the compact breakpoint
- **THEN** typography, images, social actions, project chips, tags, and long text remain within the page width
- **AND** wide article code blocks and tables scroll inside their own containers instead of widening the document

#### Scenario: Reader uses a wider public viewport
- **WHEN** a public surface renders above the compact breakpoint
- **THEN** the existing desktop navigation labels and page composition remain available

### Requirement: Administrative Entry Is Discreet And Recoverable
The system SHALL omit administrative navigation for signed-out visitors and SHALL open Netlify Identity only after the site-name challenge succeeds.

#### Scenario: Signed-out visitor discovers administrative entry
- **WHEN** the visitor clicks the site name three times sequentially and submits the exact phrase `AMIGO`
- **THEN** the Netlify Identity login opens
- **AND** cancelling it leaves the public route usable for another attempt

#### Scenario: Visitor submits the wrong administrative phrase
- **WHEN** the visitor submits a phrase other than exact `AMIGO`
- **THEN** the challenge closes and displays `Você não é um AMIGO, até a próxima!`
- **AND** the application replaces the current route with Home without opening Netlify Identity

#### Scenario: Signed-out visitor opens an administrative URL directly
- **WHEN** no authenticated session is available
- **THEN** the application returns to Home without opening the login widget
- **AND** administrative routes declare `noindex,nofollow` and are disallowed to compliant crawlers

#### Scenario: Authenticated visitor uses navigation
- **WHEN** an administrative session is available
- **THEN** desktop navigation shows the account menu
- **AND** compact navigation includes Dashboard, profile, and sign-out items with icon and text

#### Scenario: Authenticated visitor signs out from an administrative route
- **WHEN** Netlify Identity confirms logout
- **THEN** the application clears the administrative session and profile
- **AND** it replaces the current route with Home so stale administrative content is not retained

### Requirement: Public Blog Provides A Scalable Hybrid Archive
The system SHALL present automatic recent highlights and a compact paginated archive whose state is represented by the public URL.

#### Scenario: Reader opens the unfiltered first page
- **WHEN** the reader opens `/blog` without filters
- **THEN** the three newest public articles appear as highlights
- **AND** those articles do not appear in any page of the unfiltered archive dataset

#### Scenario: Reader opens a later unfiltered page
- **WHEN** the reader opens an unfiltered archive page after page 1
- **THEN** highlights are absent
- **AND** the archive dataset continues to exclude the three featured articles

#### Scenario: Reader filters the archive
- **WHEN** the reader selects search text, year, or tag
- **THEN** highlights are hidden and all matching public articles participate in the archive results
- **AND** the filter state is represented in the URL

#### Scenario: Reader chooses a publication year
- **WHEN** the archive loads the year filter
- **THEN** the filter lists only distinct years represented by published articles
- **AND** a failure to load the year list does not prevent the archive itself from loading

#### Scenario: Public tag choices include legacy language metadata
- **WHEN** the public tag source returns `article-lang-pt-br` or `article-lang-en-us`
- **THEN** the archive tag control omits those reserved legacy IDs
- **AND** ordinary public article tags remain available

#### Scenario: Archive URL omits default state
- **WHEN** the canonical archive state is page 1 with no search, year, or tag filter
- **THEN** the public URL is `/blog`
- **AND** it does not include default query parameters such as `page=1`

#### Scenario: Archive paginates compact rows
- **WHEN** the archive has more than 12 matching articles
- **THEN** it renders at most 12 articles on each page
- **AND** each result is a compact row with thumbnail, title, short description, author, publication date, and tags

#### Scenario: Archive query is invalid or out of range
- **WHEN** the reader opens `/blog` with invalid query values or a page beyond the available page count
- **THEN** the system normalizes unsupported values instead of forwarding them to Contentful
- **AND** the URL and rendered archive state use the normalized valid values

#### Scenario: Reader restores archive history
- **WHEN** the reader uses browser Back or Forward after changing archive page or filters
- **THEN** the system restores the corresponding archive controls and results
- **AND** browser history navigation restores its saved scroll position

#### Scenario: Archive is empty
- **WHEN** the active search, year, and tag filters match no public articles
- **THEN** the system retains the active controls and presents a clear empty state

#### Scenario: Archive request fails
- **WHEN** loading the public archive fails
- **THEN** the system presents an archive error state with a retry action
- **AND** the URL state remains unchanged

#### Scenario: Archive renders on a compact viewport
- **WHEN** the archive renders on a small viewport
- **THEN** each archive row stacks its image and text without overlapping metadata
- **AND** primary archive navigation and programmatically labelled search, filter, and pagination controls remain available

### Requirement: Public Blog Index Uses A Canonical Safe Contract
The system SHALL expose `GET /api/contentful/blog-index` with normalized public archive state and only allowlisted Contentful filters.

#### Scenario: Reader requests the public index
- **WHEN** the client requests `/api/contentful/blog-index`
- **THEN** the response contains `featured`, `items`, `total`, `page`, `pageSize`, and `totalPages`
- **AND** `pageSize` is 12

#### Scenario: Client supplies public archive parameters
- **WHEN** the request supplies `page`, `q`, `year`, or `tag`
- **THEN** `page` accepts a positive integer with default 1, `q` is trimmed, whitespace-collapsed, and limited to 100 characters, `year` accepts four digits from 1900 through 2100, and `tag` accepts 1-128 letters, digits, underscores, or hyphens
- **AND** the endpoint maps only normalized allowlisted values to Contentful filters

#### Scenario: Unfiltered index is requested
- **WHEN** the request has no active search, year, or tag filter
- **THEN** the first page returns the three newest public articles in `featured`
- **AND** all unfiltered archive pages exclude those featured articles from `items` and `total`

#### Scenario: Filtered index is requested
- **WHEN** the request has an active search, year, or tag filter
- **THEN** `featured` is empty
- **AND** all matching public articles participate in `items` and `total`

#### Scenario: Requested index page exceeds results
- **WHEN** the requested page is greater than `totalPages`
- **THEN** the endpoint returns the last valid page number and its results
- **AND** an empty collection returns page 1 with `totalPages` equal to 1

#### Scenario: Public index encounters an upstream error
- **WHEN** Contentful or another upstream dependency fails
- **THEN** the endpoint returns a sanitized public error payload
- **AND** the payload does not expose Contentful diagnostics or configuration

### Requirement: Public Articles Provide Archive And Chronological Navigation
The system SHALL provide clean article URLs, a visible archive return action, and global chronological neighboring articles.

#### Scenario: Reader opens a public article
- **WHEN** a reader opens an article URL directly or from the archive
- **THEN** the article URL remains clean and shareable
- **AND** a visible `All articles` action is available near the top of the article

#### Scenario: Reader returns to the archive
- **WHEN** the reader activates `All articles`
- **THEN** the system returns to the stored internal blog URL when one is available in history state
- **AND** it falls back to `/blog` when no stored archive state is available

#### Scenario: Reader views article neighbors
- **WHEN** a public article has chronologically adjacent public articles
- **THEN** actions after the article body identify `Previous article` and `Next article` with the adjacent article title
- **AND** previous means immediately older and next means immediately newer in the global chronology

#### Scenario: Reader reaches a chronology boundary
- **WHEN** the public article is the oldest or newest item in the collection
- **THEN** the unavailable neighboring direction is omitted

#### Scenario: Neighbor loading fails
- **WHEN** article-neighbor loading fails
- **THEN** the article remains readable
- **AND** only previous and next navigation is hidden

### Requirement: Public Article Navigation Uses A Bounded Safe Contract
The system SHALL expose `GET /api/contentful/article-navigation/:slug` for adjacent public article metadata only.

#### Scenario: Client requests article navigation
- **WHEN** the client requests an article-navigation resource for a public article slug
- **THEN** the response contains `previous` and `next` values with `title` and `slug` when available
- **AND** either value is `null` at a collection boundary

#### Scenario: Service orders article navigation
- **WHEN** the endpoint finds neighboring public articles
- **THEN** it orders the global collection by `fields.createAt` descending and `sys.createdAt` descending as a stable tie-breaker
- **AND** it returns no article body or private metadata

#### Scenario: Article navigation encounters an upstream error
- **WHEN** the endpoint cannot load adjacent articles
- **THEN** it returns a sanitized public error response
- **AND** it does not expose Contentful diagnostics or configuration

### Requirement: Public Blog Years Use A Bounded Safe Contract
The system SHALL expose `GET /api/contentful/blog-years` as an independent, complete list of publication years or fail closed without returning a partial list.

#### Scenario: Client requests available publication years
- **WHEN** the client requests `/api/contentful/blog-years`
- **THEN** the endpoint makes one Contentful query selecting only `fields.createAt` from published articles with that field
- **AND** the query uses an explicit limit of 1000 and skip of 0
- **AND** the response contains unique valid years in descending order

#### Scenario: Available publication years exceed the safe bound
- **WHEN** Contentful reports more than 1000 matching articles or returns an incomplete or malformed collection
- **THEN** the endpoint returns a sanitized public error instead of an incomplete year list
- **AND** it does not expose upstream diagnostics or article data
