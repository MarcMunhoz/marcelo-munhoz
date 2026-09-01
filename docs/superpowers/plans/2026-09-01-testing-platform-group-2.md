# Testing Platform Group 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide isolated Node and browser test containers that never load local environment files.

**Architecture:** A dedicated Compose file separates test execution from the existing development service. Docker build stages install dependencies in-image, exclude environment files from context, use a private service network, and pin the Node and Cypress browser images.

**Tech Stack:** Docker Compose, Node 22.22.2, Cypress browsers image with Chrome 141.0.7390.107-1 and Firefox 144.0.

**Spec:** `openspec/changes/establish-comprehensive-testing-platform/design.md`

## Global Constraints

- Do not access local `.env` or credential files.
- All package installation happens inside the build stages.
- Do not commit without explicit user approval.

---

### Task 1: Add isolated test images and Compose profiles

**Files:**
- Create: `.dockerignore`
- Create: `docker-compose.test.yaml`
- Modify: `Dockerfile`
- Create: `docs/testing.md`

- [x] **Step 1: Exclude local environment files from Docker contexts**
- [x] **Step 2: Add non-root Node and pinned browser test stages**
- [x] **Step 3: Add private-network Node, frontend, backend, Chrome, and Firefox profiles**
- [x] **Step 4: Document complete and focused container commands**
- [x] **Step 5: Validate Compose rendering, image builds, exit propagation, and ownership**

The legacy source-inspection suite resolves selected paths relative to `/app/tests`; test stages therefore retain `/app` as their working directory, matching the existing application image.
