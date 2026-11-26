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
    const workflow = loadWorkflow();
    assert.deepEqual(validateReleaseWorkflow(workflow), { jobs: 10, artifactUploads: 4 });

    const coverageRun = workflow.jobs.coverage.steps.find((step) => step.run?.includes("test:vitest:coverage")).run;
    assert.match(coverageRun, /-v \.\/app\/artifacts:\/app\/artifacts/);
    assert.match(coverageRun, /--coverage\.reportsDirectory=artifacts\/coverage-raw/);
    assert.doesNotMatch(coverageRun, /\/app\/coverage/);
  });

  it("uses Node 24 actions and validates a pre-applied version bump on protected develop", () => {
    const workflow = loadWorkflow();
    const allSteps = Object.values(workflow.jobs).flatMap((job) => job.steps || []);
    const checkoutSteps = allSteps.filter((step) => step.uses?.startsWith("actions/checkout@"));
    const uploadSteps = allSteps.filter((step) => step.uses?.startsWith("actions/upload-artifact@"));
    assert.ok(checkoutSteps.length > 0);
    assert.ok(checkoutSteps.every((step) => step.uses === "actions/checkout@v5"));
    assert.equal(uploadSteps.length, 4);
    assert.ok(uploadSteps.every((step) => step.uses === "actions/upload-artifact@v5"));

    const bump = workflow.jobs["version-bump"];
    assert.equal(bump.needs, "source-policy");
    assert.match(bump.if, /needs\.source-policy\.result == 'success'/);
    assert.match(bump.if, /github\.event\.pull_request\.head\.ref == 'develop'/);
    assert.match(bump.if, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
    assert.deepEqual(bump.permissions, { contents: "read" });
    assert.equal(bump.outputs["head-sha"], "${{ steps.release-head.outputs.sha }}");
    assert.equal(bump.steps[0].uses, "actions/checkout@v5");
    assert.equal(bump.steps[0].with.ref, "${{ github.event.pull_request.head.sha }}");
    assert.equal(bump.steps[0].with["persist-credentials"], false);
    assert.equal(bump.steps[0].with["fetch-depth"], 0);

    const updateStep = bump.steps.find((step) => step.run?.includes("release-version.js"));
    assert.match(updateStep.run, /git fetch origin main/);
    assert.match(updateStep.run, /git show origin\/main:app\/package\.json/);
    assert.match(updateStep.run, /git log -z --format=%B origin\/main\.\.HEAD/);
    assert.match(updateStep.run, /Release metadata is not synchronized/);
    assert.match(updateStep.run, /exit 1/);
    assert.doesNotMatch(updateStep.run, /git add|git commit/);
    assert.doesNotMatch(updateStep.run, /git push/);
    assert.doesNotMatch(updateStep.run, /CHANGELOG/);
    assert.equal(bump.steps.some((step) => step.run?.includes("git push")), false);

    for (const name of ["lint", "build", "credential-scan", "coverage", "e2e-chrome", "e2e-firefox", "remote-smoke"]) {
      assert.equal(workflow.jobs[name].needs, "version-bump");
      assert.match(workflow.jobs[name].if, /needs\.version-bump\.result == 'success'/);
      assert.equal(workflow.jobs[name].steps[0].with.ref, "${{ needs.version-bump.outputs.head-sha }}");
    }
    assert.equal(workflow.jobs.build.steps.find((step) => step.env?.COMMIT_REF).env.COMMIT_REF, "${{ needs.version-bump.outputs.head-sha }}");
    assert.equal(workflow.jobs["remote-smoke"].env.EXPECTED_COMMIT_SHA, "${{ needs.version-bump.outputs.head-sha }}");
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
