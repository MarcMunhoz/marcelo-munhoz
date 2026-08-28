# Security Change Handoff

## Resume command

Use `apply change audit-and-harden-application-security` from the repository root.

## Completed work

- All tasks 1.1 through 6.4 are complete and recorded in `tasks.md`.
- `SECURITY.md` defines scope, safe-review rules, boundaries, and security invariants.
- `docs/security/threat-model.md` records the sanitized trust model.
- `docs/security/baseline-2026-08-27.md` records the dependency, lint, test, build, and runtime-smoke baseline.
- `docs/security/discovery-report-2026-08-27.md` records unvalidated candidates, hardening observations, controls, and discovery limitations.
- The group 2 fallback coverage is complete: three complete independent repository reviews in total, a focused specialist review of tasks 2.2 through 2.6, and secret-safe dependency-free Python static checks.
- The Codex Security Deep Scan did not complete; its WSL helper failure and openSUSE connector limitation remain recorded as external limitations rather than repository evidence.
- `docs/security/validation-report-2026-08-28.md` records per-candidate validation, attack-path facts, severity calibration, dispositions, and the prioritized remediation groups.
- Focused delta requirements for the reportable behavior changes are under `openspec/changes/audit-and-harden-application-security/specs/`.
- `docs/security/validation-report-2026-08-28.md` records independent fix verification and the complete security diff review.
- The final isolated container workflow passed dependency restore and audit, lint, all 316 tests, production build without dotenv files, built-asset credential scanning, and local backend/frontend smoke checks.
- Separately authorized read-only staging checks verified HTTPS transport, core response headers, public routing, safe public errors, and denial of untrusted cross-origin reads. They also recorded sanitized deployment-hardening observations and found that the administrative Function/redirect was not present in the checked deploy.

## Required next actions

1. Preserve the completed fallback coverage and validation records; do not retry Codex Security in the current session or claim that the Deep Scan completed.
2. Keep deferred/suppressed rows explicit and do not expand scope silently.
3. Before administrative acceptance testing, have the deployment owner verify that the staging artifact includes the administrative Function and redirect; then repeat the unauthenticated read-only checks under a separately authorized deployment activity.
4. Do not read production, mutate remote data, publish findings, or create external tickets without separate explicit authorization.
5. If archiving this change is authorized, synchronize its delta specifications first as required by repository policy.

## Deep Scan environment and service limitations

On 2026-08-27, the WSL-hosted Codex Security plugin could not start its Python helper. The environment had a working Python interpreter and an isolated Python container, but the plugin server did not successfully use either. This is not a project failure.

On 2026-08-28, the retry in native openSUSE was blocked before scan execution because the `codex_security_access` connector was not available or connectable under the active plan. This is an external environment or service limitation and provides no evidence about the repository.

For the current session:

1. Do not retry Codex Security.
2. Resume the authorized fallback using secret-safe static checks in isolated Python, independent specialist reviews, and independent complete repository reviews.
3. Preserve the partial discovery work and record fallback coverage explicitly.
4. Do not claim that the Codex Security Deep Scan or its coordinator completed.

## Safety and repository rules

- Never read `.env`, `.env.*`, credentials, private keys, or secret-bearing files.
- Do not install dependencies or alter external systems without separate authorization.
- Keep all security evidence sanitized: repository-relative paths only, no local paths, private URLs, environment identifiers, credential names paired with values, tokens, or exploit-ready details.
- Do not commit, push, merge, archive, synchronize specifications, or publish findings without explicit user authorization for each action.
