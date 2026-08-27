# Security Change Handoff

## Resume command

Use `apply change audit-and-harden-application-security` from the repository root.

## Completed work

- Tasks 1.1 through 1.4 are complete and recorded in `tasks.md`.
- `SECURITY.md` defines scope, safe-review rules, boundaries, and security invariants.
- `docs/security/threat-model.md` records the sanitized trust model.
- `docs/security/baseline-2026-08-27.md` records the dependency, lint, test, build, and runtime-smoke baseline.
- `docs/security/discovery-report-2026-08-27.md` records unvalidated candidates, hardening observations, controls, and discovery limitations.

## Required next actions

1. Read the OpenSpec proposal, design, requirements, tasks, security policy, threat model, baseline, discovery report, and this handoff before changing code.
2. Confirm the current task status. Do not mark tasks 2.1 through 2.6 complete from the partial checkpoint.
3. Run the Codex Security Deep Scan once across the complete repository, keeping `.env`, `.env.*`, credentials, private keys, and secret-bearing files excluded. Do not read staging or production, mutate remote data, publish findings, or create external tickets.
4. If the scan returns a canonical manifest, complete that same scan exactly once and preserve its sealed report as scan evidence. Do not start duplicate scans or recreate coordinator artifacts manually.
5. Compare the completed scan with the candidate register. Consolidate only equivalent root causes, retain independently reachable sinks, and update the discovery report with completed coverage.
6. Mark tasks 2.1 through 2.6 complete only after the repeated full-repository coverage and all focused reviews are actually complete.
7. Pause for explicit approval before beginning task group 3. Finding validation must trace each candidate from source to sink, reject unsupported claims, and calibrate severity before any remediation.

## WSL runtime limitation

The current WSL-hosted Codex Security plugin could not start its Python helper. The environment had a working Python interpreter and an isolated Python container, but the plugin server did not successfully use either. This is not a project failure.

When resuming on native Suse:

1. Start Codex normally in the native environment.
2. Run the Deep Scan before using a manual fallback.
3. If the helper starts, use its result as the authoritative repeated scan evidence.
4. If it fails again, record the exact stable tool error and preserve the partial discovery work; do not claim the coordinator completed.

## Safety and repository rules

- Never read `.env`, `.env.*`, credentials, private keys, or secret-bearing files.
- Do not install dependencies or alter external systems without separate authorization.
- Keep all security evidence sanitized: repository-relative paths only, no local paths, private URLs, environment identifiers, credential names paired with values, tokens, or exploit-ready details.
- Do not commit, push, merge, archive, synchronize specifications, or publish findings without explicit user authorization for each action.
