---
trigger: always_on
---

# AGENTS

## Mandatory rules
- When necessary, run build or package manager scripts ONLY within the container context, not on the host.
- When committing, follow the GitHub standard with messages in English and correct accentuation.
- In the commit title, use a verb in the present indicative tense, start with a capital letter, and ensure agreement with the scope of the change.
- Prefer titles in the format `type(scope): Adjusts ...`, `Adds ...`, `Fixes ...`, `Removes ...`, `Updates ...`.
- Do not use the imperative mood in the title (e.g., avoid `Adjust ...`, `Add ...`, `Fix ...`).
- In the commit description, do not insert blank lines between items.
- The commit title must appear only on the first line, without an attached description.
- The description must be placed in the commit body, using a separate `-m` flag so it does not merge with the title.
- Mandatory commit message format:
`type(scope): Brief message`
`- Explanatory description 01`
`- Explanatory description 02`
- Allowed commit types:
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
