import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { evaluateQualityGate, executeReleasePolicyCli, validateReleaseSource } from "../../scripts/release-quality-policy.js";

const successfulResults = {
  "source-policy": "success",
  lint: "success",
  build: "success",
  "credential-scan": "success",
  coverage: "success",
  "e2e-chrome": "success",
  "e2e-firefox": "success",
  "remote-smoke": "success",
};

describe("release quality policy", () => {
  it("accepts only the repository develop branch as a production source", () => {
    assert.deepEqual(validateReleaseSource({ headRef: "develop", headRepository: "owner/project", baseRepository: "owner/project" }), { accepted: true });
    assert.throws(() => validateReleaseSource({ headRef: "feature", headRepository: "owner/project", baseRepository: "owner/project" }), /develop/);
    assert.throws(() => validateReleaseSource({ headRef: "develop", headRepository: "fork/project", baseRepository: "owner/project" }), /repository/);
  });

  it("passes the aggregate gate only when every current dependency succeeds", () => {
    assert.deepEqual(evaluateQualityGate(successfulResults), { accepted: true, failures: [] });
  });

  it("fails closed for missing or non-successful dependency results", () => {
    for (const result of ["failure", "cancelled", "skipped", "timed_out", undefined]) {
      const candidate = { ...successfulResults };
      if (result === undefined) delete candidate.coverage;
      else candidate.coverage = result;
      assert.deepEqual(evaluateQualityGate(candidate), { accepted: false, failures: [{ job: "coverage", result: result ?? "missing" }] });
    }
  });

  it("propagates source and aggregate decisions through the container CLI boundary", () => {
    const messages = [];
    const processRef = { exitCode: 0 };
    assert.equal(executeReleasePolicyCli({
      action: "source",
      env: { PR_HEAD_REF: "develop", PR_HEAD_REPOSITORY: "owner/project", BASE_REPOSITORY: "owner/project" },
      log: (message) => messages.push(message),
      error: (message) => messages.push(message),
      processRef,
    }), true);
    assert.equal(processRef.exitCode, 0);

    const resultEnvironment = Object.fromEntries(Object.entries(successfulResults).map(([job, result]) => [`RESULT_${job.toUpperCase().replaceAll("-", "_")}`, result]));
    assert.equal(executeReleasePolicyCli({ action: "gate", env: resultEnvironment, log: (message) => messages.push(message), processRef }), true);

    const failedResultEnvironment = { ...resultEnvironment, RESULT_COVERAGE: "cancelled" };
    assert.equal(executeReleasePolicyCli({ action: "gate", env: failedResultEnvironment, error: (message) => messages.push(message), processRef }), false);
    assert.equal(processRef.exitCode, 1);
    assert.match(messages.at(-1), /coverage=cancelled/);

    assert.equal(executeReleasePolicyCli({ action: "unsupported", env: {}, error: (message) => messages.push(message), processRef }), false);
    assert.equal(processRef.exitCode, 1);
    assert.match(messages.at(-1), /Usage/);
  });
});
