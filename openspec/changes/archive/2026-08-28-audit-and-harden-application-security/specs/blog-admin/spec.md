## ADDED Requirements

### Requirement: Server-Owned Article Security Fields
The admin API MUST ignore client-supplied article ownership and security metadata and derive author and writer binding from the authorized server session for every article create or update payload shape.

#### Scenario: Writer submits an alternate fields payload
- **WHEN** an authenticated writer submits an article body containing a `fields` object with author or writer metadata
- **THEN** the server removes or replaces those fields with the authorized session-owned values before calling Contentful
- **AND** the server preserves only the allowlisted editorial fields and supported metadata

### Requirement: Administrative Media Uploads Are Bounded
The admin API MUST validate media upload encoding, MIME type, byte size, and accepted image format before signing or forwarding a Cloudinary upload.

#### Scenario: Writer submits a non-image or oversized Data URI
- **WHEN** an authenticated writer submits a Data URI whose media type or decoded size is outside the supported bounds
- **THEN** the server rejects the request before calling Cloudinary with a stable user-safe error

### Requirement: Malformed Administrative Paths Return Stable Errors
The admin API MUST normalize malformed percent-encoded route identifiers into a bounded client error before any operation or upstream call.

#### Scenario: Article route contains malformed encoding
- **WHEN** an administrative request contains an undecodable article or tag path segment
- **THEN** the server returns a stable 400 response without throwing an uncaught exception or invoking an operation
