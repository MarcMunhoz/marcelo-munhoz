## Context

The repository contains a public Vue/Quasar site, public Netlify Function proxies, and an authenticated administrative surface backed by Netlify Identity, Contentful Management operations, and Cloudinary media workflows. Administrative actions include privileged and destructive mutations, while public CMS content is rendered in browser-facing views. Existing dependency auditing and deterministic tests provide useful coverage but do not establish end-to-end authorization, injection resistance, abuse controls, or attack-path reachability.

The review must operate without reading local environment files, credentials, private keys, or secrets. It must not probe production destructively, mutate remote content, publish findings externally, or create tracking records without separate authorization.

## Goals / Non-Goals

**Goals:**

- Establish a repository threat model and explicit security invariants.
- Scan the complete repository with deeper repeated coverage for high-risk paths.
- Validate candidate findings from attacker-controlled source to sensitive sink.
- Fix validated vulnerabilities in risk-priority order with regression tests.
- Verify each fix against its original attack path and the full container workflow.
- Produce sanitized, actionable evidence for fixed, deferred, and accepted risks.

**Non-Goals:**

- Live exploitation, destructive testing, denial-of-service simulation, or production content mutation.
- Reading prohibited environment or credential files.
- Treating hidden admin navigation, crawler controls, or frontend guards as authorization.
- Blindly applying scanner suggestions, broad dependency overrides, or speculative hardening without a supported threat.
- Publishing advisories, issues, or detailed exploit material without explicit approval.

## Decisions

### Use an evidence-first, phased security workflow

The work proceeds through policy/scope, threat modeling, deep finding discovery, validation, remediation, and independent fix verification. This is preferred over immediately patching suspicious patterns because repository context and reachability determine whether a candidate is exploitable and how severe it is.

Alternative considered: run a single dependency or pattern scanner and fix every alert. Rejected because it misses authorization and business-logic flaws while creating false positives and risky bulk changes.

### Scan the whole repository and prioritize trust boundaries

All tracked application, Function, deployment, dependency, and test code is in scope. Review depth is prioritized around Netlify Identity verification, role and ownership authorization, Contentful and Cloudinary facades, CMS/Markdown rendering, CORS/CSP, uploads and URLs, destructive mutations, and sanitized error handling.

Alternative considered: scan only `/admin` frontend files. Rejected because the frontend is not the security boundary and privileged enforcement belongs primarily in server Functions and shared utilities.

### Keep static review non-destructive and secret-safe

Repository analysis excludes prohibited environment files and never prints credentials or local environment identifiers. Deployment or staging checks remain read-only and require explicit authorization when they cross the local repository boundary.

Alternative considered: use live credentials to prove exploitability. Rejected because static source-to-sink validation and controlled tests can establish most findings without risking production data.

### Validate findings before remediation

Each candidate records attacker prerequisites, source, transformations, sink, existing controls, affected asset, reproducibility, and calibrated severity. Findings without a plausible reachable path are rejected or documented as defense-in-depth opportunities rather than vulnerabilities.

Alternative considered: assign severity directly from scanner output. Rejected because generic severity commonly ignores the application's authorization and deployment context.

### Fix one security property at a time

Validated findings are grouped only when they share the same root cause and security invariant. Tests demonstrate the failing security behavior before the minimal fix where feasible. Broad refactors are deferred unless they are necessary to make the invariant enforceable and testable.

Alternative considered: perform one large security rewrite. Rejected because it obscures causality, complicates verification, and increases regression risk in privileged workflows.

### Separate verification from implementation

Every completed fix receives an independent verification pass that re-evaluates the original attack path and checks for bypasses or adjacent regressions. Full lint, tests, build, audit, and runtime smoke remain final gates but do not substitute for finding-specific verification.

### Keep external tracking approval-gated

The repository report may contain sanitized findings and outcomes. Creating GitHub issues, advisories, or other external records remains a separate, previewed action requiring explicit user approval.

## Risks / Trade-offs

- **[Deep scanning produces false positives]** → Require source-to-sink validation and explicit rejection rationale before remediation.
- **[Security fixes regress editorial workflows]** → Add finding-specific tests and rerun the complete container workflow after each risk group.
- **[Evidence leaks sensitive implementation details]** → Sanitize paths, identifiers, diagnostics, payloads, and environment references before persisting or publishing artifacts.
- **[Repository-only analysis misses deployment controls]** → Record deployment assumptions and request separately authorized read-only staging verification where static evidence is insufficient.
- **[Rate limiting or CSRF controls conflict with Netlify architecture]** → Model the actual Identity token and Function request flow before selecting a control; do not add generic middleware blindly.
- **[Large findings exceed one change]** → Fix critical/high reachable issues first and create explicit follow-up changes for architectural work, retaining compensating controls.
- **[Third-party behavior changes]** → Verify assumptions against official provider documentation during implementation and pin tests to the project's boundary contract.

## Migration Plan

1. Define or update repository security policy and create the threat model without reading secret files.
2. Capture the current security validation baseline inside the container.
3. Run repeated complete repository scans and consolidate candidate findings.
4. Validate candidates, trace reachable attack paths, and prioritize confirmed findings.
5. Add or update affected security requirements before behavior-changing fixes.
6. Implement and independently verify fixes in severity and trust-boundary order.
7. Run clean install, audit, lint, tests, build, runtime smoke, and approved non-destructive deployment checks.
8. Document fixed, rejected, deferred, and accepted findings with sanitized evidence.

Rollback is a focused Git revert for each remediation group. Emergency rollback of a security control must restore the prior application behavior only alongside an explicit compensating control and follow-up record.

## Open Questions

- Which non-destructive staging checks will be authorized after static validation identifies deployment assumptions that cannot be proven locally?
- Should validated findings be tracked only in the repository report or later mirrored to private GitHub issues or draft security advisories?
- Which rate-limiting facility is available in the deployed Netlify plan if endpoint abuse controls are confirmed as a gap?
