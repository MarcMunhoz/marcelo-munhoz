## 1. Security Baseline And Threat Model

- [x] 1.1 Inventory public and administrative components, protected assets, identities, privileged operations, third-party services, data flows, and trust boundaries without reading prohibited environment or credential files.
- [x] 1.2 Define or update `SECURITY.md` with the review scope, required security properties, safe testing rules, disclosure boundaries, and explicit exclusions.
- [x] 1.3 Persist a sanitized repository threat model covering attacker capabilities, abuse cases, server-side authorization boundaries, and deployment assumptions.
- [x] 1.4 Capture the current container-based dependency audit, lint, test, build, and runtime-smoke baseline without installing or changing dependencies unless separately authorized.

## 2. Deep Repository Security Scan

- [ ] 2.1 Run repeated independent full-repository security scans, excluding prohibited environment and credential files, and consolidate candidate findings without duplicating equivalent root causes.
- [ ] 2.2 Review Netlify Identity token verification, role checks, ownership enforcement, route guards, session lifecycle, and fail-closed behavior across every administrative endpoint.
- [ ] 2.3 Review Netlify Functions routing, request parsing, HTTP methods, CORS, browser security headers, error handling, logging, timeouts, pagination, and abuse limits.
- [ ] 2.4 Review Contentful and Cloudinary integrations for identifier validation, unsafe URLs, uploads, SSRF, lifecycle authorization, stale versions, replay, duplicate mutations, and concurrent updates.
- [ ] 2.5 Review CMS and Markdown rendering, `v-html` or equivalent sinks, URL construction, redirects, identity data, and browser policies for injection and unsafe navigation.
- [ ] 2.6 Review source, deployment configuration, generated browser bundles, dependency manifests, tests, and documentation for secret exposure, supply-chain risk, and unsafe diagnostic disclosure using sanitized evidence only.

## 3. Finding Validation And Prioritization

- [ ] 3.1 Trace every candidate from attacker-controlled source through transformations and existing controls to a security-sensitive sink, recording reproducibility and required prerequisites.
- [ ] 3.2 Reject unsupported findings, classify defense-in-depth opportunities separately, and calibrate validated severity from reachability, privileges, affected assets, and impact.
- [ ] 3.3 Produce a sanitized prioritized finding register that groups only shared root causes and identifies critical/high remediation before medium/low hardening.
- [ ] 3.4 Add focused delta requirements to affected OpenSpec capabilities before implementing any remediation that changes product behavior or a security contract.

## 4. Risk-Prioritized Remediation

- [ ] 4.1 Implement deterministic failing regression tests for each validated critical or high-severity attack path where feasible.
- [ ] 4.2 Apply the smallest supported fixes for validated critical and high-severity findings, preserving fail-closed server authorization and existing editorial workflows.
- [ ] 4.3 Implement and test validated medium and low-severity fixes or document sanitized compensating controls, rationale, owner, and follow-up for deferred risks.
- [ ] 4.4 Add focused regression coverage for authorization failures, malicious inputs, unsafe content, stale or repeated mutations, abuse bounds, and diagnostic isolation affected by the fixes.

## 5. Independent Fix Verification

- [ ] 5.1 Independently re-evaluate every remediated finding against its original source-to-sink attack path and confirm that the vulnerable behavior is no longer reachable.
- [ ] 5.2 Probe plausible bypasses and adjacent trust boundaries with non-destructive tests, documenting any new candidate separately rather than silently expanding a fix.
- [ ] 5.3 Run a security diff review over the complete remediation patch and resolve or explicitly classify all supported regressions it identifies.

## 6. Final Validation And Reporting

- [ ] 6.1 Run the complete authorized container workflow, including dependency audit, lint, unit and integration tests, production build, and runtime smoke checks.
- [ ] 6.2 Perform only separately authorized, non-destructive staging checks needed to verify deployment controls that cannot be established from repository evidence.
- [ ] 6.3 Produce a sanitized final report of validated, fixed, rejected, deferred, and accepted findings with verification evidence and follow-up ownership.
- [ ] 6.4 Review every persisted or externally publishable artifact to ensure it contains no credentials, private identifiers, local paths, private URLs, or exploit-enabling environment details.
