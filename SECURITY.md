# Security Policy

## System and Scope

This policy covers the public Vue/Quasar site, public Contentful proxy, authenticated administrative SPA, Netlify Functions, Netlify Identity integration, Contentful Management operations, Cloudinary media workflows, deployment headers/redirects, dependencies, tests, and generated browser assets.

The browser is an untrusted client. Administrative authorization must be enforced by server-side Functions before privileged upstream calls or mutations.

## Threat Model and Trust Boundaries

Protected assets include content integrity, author ownership, publication state, versions, credentials, Identity claims, private identifiers, diagnostics, and service availability.

Attacker-controlled inputs include public route/query values, browser requests, administrative payloads, Markdown/CMS content, URLs, media metadata, upload data, and request timing.

Hidden navigation, `noindex`, frontend route guards, and local preview controls are not production authorization boundaries.

The repository threat model is maintained in `docs/security/threat-model.md`.

## Security Invariants

- Administrative requests authenticate and authorize before upstream access.
- Role and ownership checks fail closed.
- Untrusted input is validated, bounded, and allowlisted.
- CMS/Markdown content and URLs cannot become executable or unsafe browser content.
- Secrets, tokens, private identifiers, diagnostics, and local environment details stay isolated.
- Destructive and lifecycle mutations reject stale, repeated, conflicting, or unauthorized requests.
- Public, administrative, upload, and third-party operations have deterministic abuse limits.
- Findings require reachable source-to-sink evidence and independent verification.

## Reportable Findings and Severity Context

Report a vulnerability when a realistic attacker can cross a trust boundary and gain unauthorized confidentiality, integrity, or availability impact.

Critical and high findings take priority when they affect administrative authority, credentials, privileged users, stored content execution, or destructive operations. Medium and low findings include bounded abuse, defense-in-depth gaps, and weaknesses with meaningful but limited impact.

Scanner-only claims without a reachable attack path are not treated as vulnerabilities.

## Out of Scope, Exclusions, and Accepted Risk

- Reading or publishing environment files, credentials, private keys, or secret values.
- Destructive testing, denial-of-service simulation, production mutation, or live exploitation.
- External issue/advisory creation or disclosure without explicit approval.
- Treating third-party provider availability as an application vulnerability without an application-owned control gap.

Accepted or deferred risks must include sanitized impact, mitigation, rationale, owner, and follow-up.

## Known Limitations and Compensating Controls

Local preview role headers are development-only and must never authorize production requests.

Deployment-specific rate limits, Identity configuration, provider scopes, and browser-policy behavior require separate read-only staging verification when repository evidence is insufficient.

The current baseline records a frontend smoke limitation caused by the existing development container environment; it is not a validated security finding.
