# Major Dependency Upgrades

## Purpose

Define the compatibility, browser-support, implementation, and validation requirements for coordinated major dependency upgrades.

## Requirements

### Requirement: Major Upgrades Preserve Application Behavior
The project SHALL upgrade major dependency groups only when the application routes, admin workflows, lint configuration, production build, and runtime startup remain validated in the container.

#### Scenario: A major group is upgraded
- **WHEN** a Quasar/Router, ESLint, extras, or Tailwind major group is changed
- **THEN** its compatibility issues are resolved or explicitly documented before the next group is migrated

#### Scenario: Validation follows major upgrades
- **WHEN** all selected major groups are updated
- **THEN** clean install, audit, lint, tests, production build, and runtime smoke checks pass inside the container

### Requirement: Browser Support Changes Are Explicit
The project MUST document and validate any browser-support change introduced by a major dependency, especially the Tailwind CSS v4 baseline.

#### Scenario: A major raises browser requirements
- **WHEN** an upgraded dependency requires newer browsers than the current project target
- **THEN** the change records the new minimum, validates representative public and administrative pages, and defers the upgrade if the new baseline is not accepted

### Requirement: Deferred Majors Have A Follow-up Record
Any major dependency that cannot be safely migrated in this change MUST have its compatibility blocker, current version, mitigation, and follow-up path documented.

#### Scenario: A major migration is deferred
- **WHEN** compatibility or browser review rejects a major upgrade
- **THEN** the report records the decision and prevents the dependency from being treated as silently current

### Requirement: Vue Components Use Script Setup
Every Vue single-file component SHALL use Composition API through `<script setup>` and SHALL NOT retain Options API declarations, component mixins, `defineComponent`, or component-instance `this` access.

#### Scenario: A Vue component is migrated
- **WHEN** an existing public or administrative SFC is converted
- **THEN** its props, emits, reactive state, computed values, watchers, lifecycle work, router access, template refs, and metadata use explicit Composition APIs

#### Scenario: Shared component behavior is required
- **WHEN** behavior was previously inherited through a component mixin
- **THEN** the behavior is expressed through an explicit function or composable without component inheritance

### Requirement: Composition Migration Preserves Behavior
The Composition API migration MUST preserve templates, styles, routes, SEO metadata, responsive behavior, public content flows, authentication and authorization, administrative workflows, request race guards, and navigation protections.

#### Scenario: Stateful behavior is migrated
- **WHEN** a component owns watchers, asynchronous requests, callbacks, timers, DOM listeners, or route guards
- **THEN** equivalent trigger timing, stale-response protection, cleanup, and navigation behavior remain in place

#### Scenario: Migration validation completes
- **WHEN** all SFC migration waves finish
- **THEN** every SFC contains `<script setup>`, structural Options API remnants are absent, lint and the complete test suite pass, the production build succeeds, and representative public and admin routes pass runtime smoke checks in the container

### Requirement: Tests Do Not Depend On Options API Objects
Tests covering migrated Vue behavior SHALL test observable behavior or independently importable functions instead of executing or inspecting an Options API component object.

#### Scenario: An Options-coupled test reaches a migration wave
- **WHEN** the component no longer exposes `data`, `methods`, `computed`, `watch`, or lifecycle object properties
- **THEN** the test is adapted before conversion to retain its behavioral regression coverage without recreating the Options API shape
