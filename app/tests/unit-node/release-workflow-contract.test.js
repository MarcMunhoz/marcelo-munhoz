import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, it } from "vitest";

import { validateReleaseWorkflow } from "../../scripts/validate-release-workflow.js";

const workflowPath = new URL("../../../../workspace/.github/workflows/release-quality.yml", import.meta.url);
const loadWorkflow = () => parse(readFileSync(workflowPath, "utf8"));
const clone = (value) => structuredClone(value);

describe("release workflow contract", () => {
  it("orchestrates the complete main release gate through containers", () => {
    assert.deepEqual(validateReleaseWorkflow(loadWorkflow()), { jobs: 9, artifactUploads: 4 });
  });

  it("rejects trigger, concurrency, dependency, and fail-open regressions", () => {
    const wrongTarget = clone(loadWorkflow());
    wrongTarget.on.pull_request.branches = ["develop"];
    assert.throws(() => validateReleaseWorkflow(wrongTarget), /target main/);

    const broadConcurrency = clone(loadWorkflow());
    broadConcurrency.concurrency.group = "release-quality-main";
    assert.throws(() => validateReleaseWorkflow(broadConcurrency), /pull request number/);

    const conditionalGate = clone(loadWorkflow());
    conditionalGate.jobs["quality-gate"].if = "success()";
    assert.throws(() => validateReleaseWorkflow(conditionalGate), /always/);

    const missingDependency = clone(loadWorkflow());
    missingDependency.jobs["quality-gate"].needs = missingDependency.jobs["quality-gate"].needs.filter((job) => job !== "remote-smoke");
    assert.throws(() => validateReleaseWorkflow(missingDependency), /every required job/);
  });

  it("rejects host package execution and raw artifact publication", () => {
    const hostPackageExecution = clone(loadWorkflow());
    hostPackageExecution.jobs.lint.steps.push({ run: "npm test" });
    assert.throws(() => validateReleaseWorkflow(hostPackageExecution), /inside Docker Compose/);

    const rawUpload = clone(loadWorkflow());
    rawUpload.jobs.coverage.steps.find((step) => step.uses?.startsWith("actions/upload-artifact")).with.path = "app/coverage";
    assert.throws(() => validateReleaseWorkflow(rawUpload), /sanitized artifact/);

    const unapprovedAction = clone(loadWorkflow());
    unapprovedAction.jobs.lint.steps.push({ uses: "third-party/package-manager@v1" });
    assert.throws(() => validateReleaseWorkflow(unapprovedAction), /limited to checkout and artifact upload/);

    const optionalArtifact = clone(loadWorkflow());
    optionalArtifact.jobs.coverage.steps.find((step) => step.uses?.startsWith("actions/upload-artifact")).with["if-no-files-found"] = "ignore";
    assert.throws(() => validateReleaseWorkflow(optionalArtifact), /must fail publication/);
  });
});
