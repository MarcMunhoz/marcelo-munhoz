# Group 6: Coverage Baseline And Test Quality Review

## Policy

Coverage is a diagnostic and non-regression signal. Tests are required for changed behavior, defects, security boundaries, authorization, state transitions, recovery, and material contracts. An uncovered branch alone is not a reason to add a test.

The gate uses global thresholds rather than per-file thresholds. File-level HTML and LCOV reports remain available for risk review.

## Clean container baseline

The complete Vitest suite passed in the isolated test runtime with 376 tests across 34 files. The measured global coverage was:

| Metric | Measured | Enforced floor |
| --- | ---: | ---: |
| Statements | 91.16% | 91% |
| Branches | 83.56% | 83% |
| Functions | 86.67% | 86% |
| Lines | 92.48% | 92% |

The integer floors tolerate reporting precision while preventing silent regression below the migration baseline.

## Review results

- Removed tests that enumerated defensive null shapes, incidental table slots, direct component methods, and duplicate proxy outcomes solely to execute branches.
- Retained observable frontend behavior for recovery, authorization, routing, concurrency, accessibility, media handling, and session lifecycle.
- Retained backend and script coverage for sanitized failures, runtime authentication, malformed navigation, cyclic provider links, configuration validation, and credential scanning.
- Reverted test-only production seams that did not represent a useful boundary. Narrow injectable script entrypoints remain where they exercise actual command behavior deterministically.
- Removed broad coverage-ignore directives. The coverage exclusion ledger is empty, so no source path is hidden from the report.
- Kept the container ownership correction because a clean coverage run otherwise cannot replace its output directory as the non-root runtime user.
