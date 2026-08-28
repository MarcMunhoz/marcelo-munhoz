## Why

The application now includes authenticated administrative workflows that can create, publish, unpublish, archive, and permanently delete remote content. Dependency audits alone cannot detect authorization, trust-boundary, content-rendering, request-validation, or secret-isolation flaws, so the complete repository needs an evidence-driven security review before the administrative surface is treated as hardened.

## What Changes

- Define the application's assets, actors, trust boundaries, abuse cases, and required security properties in a repository threat model.
- Perform a deep, repository-wide security scan with additional focus on Netlify Functions, Netlify Identity, Contentful Management operations, Cloudinary media workflows, Markdown/HTML rendering, and browser security policy.
- Validate every candidate finding from source to sink and reject unsupported or scanner-only claims.
- Remediate validated findings in risk-priority order with deterministic regression tests and fix verification.
- Review authentication and role authorization, input and URL validation, XSS/HTML sanitization, CORS/CSP/CSRF controls, rate limiting, error/log disclosure, secret isolation, concurrency/version handling, and dependency/supply-chain exposure.
- Document accepted risks, deferred findings, mitigations, and follow-up ownership without publishing sensitive environment details or exploit-ready secret material.

## Capabilities

### New Capabilities

- `application-security-assurance`: Defines the threat-modeling, repository scanning, finding validation, remediation, verification, and security regression requirements for public and administrative application surfaces.

### Modified Capabilities

None initially. Validated findings that change product behavior or security contracts SHALL add focused deltas to the affected capability before remediation.

## Impact

- Frontend routes, authentication/session utilities, Markdown and CMS content rendering, browser security headers, and administrative UI workflows.
- Netlify Functions and shared server utilities that proxy Contentful and Cloudinary or enforce administrative authorization.
- Tests, security documentation, dependency manifests, deployment configuration, and any affected OpenSpec capabilities.
- No credential rotation, production mutation, external issue creation, or disclosure publication is included without separate explicit authorization.
