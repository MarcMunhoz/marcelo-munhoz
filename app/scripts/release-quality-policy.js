import { fileURLToPath } from "node:url";

export const REQUIRED_RELEASE_JOBS = [
  "source-policy",
  "lint",
  "build",
  "credential-scan",
  "coverage",
  "e2e-chrome",
  "e2e-firefox",
  "remote-smoke",
];

export const validateReleaseSource = ({ headRef, headRepository, baseRepository } = {}) => {
  if (headRef !== "develop") throw new Error("Only develop may target the production branch.");
  if (!headRepository || headRepository !== baseRepository) throw new Error("The release source must belong to the base repository.");
  return { accepted: true };
};

export const evaluateQualityGate = (results = {}) => {
  const failures = REQUIRED_RELEASE_JOBS
    .filter((job) => results[job] !== "success")
    .map((job) => ({ job, result: results[job] || "missing" }));
  return { accepted: failures.length === 0, failures };
};

const resultsFromEnvironment = (env) => Object.fromEntries(
  REQUIRED_RELEASE_JOBS.map((job) => [job, env[`RESULT_${job.toUpperCase().replaceAll("-", "_")}`]])
);

export const executeReleasePolicyCli = ({ action = process.argv[2], env = process.env, log = console.log, error = console.error, processRef = process } = {}) => {
  try {
    if (action === "source") {
      validateReleaseSource({ headRef: env.PR_HEAD_REF, headRepository: env.PR_HEAD_REPOSITORY, baseRepository: env.BASE_REPOSITORY });
      log("Release source policy passed.");
      return true;
    }
    if (action === "gate") {
      const result = evaluateQualityGate(resultsFromEnvironment(env));
      if (!result.accepted) throw new Error(`Required jobs did not succeed: ${result.failures.map(({ job, result: status }) => `${job}=${status}`).join(", ")}`);
      log("Release quality gate passed.");
      return true;
    }
    throw new Error("Usage: release-quality-policy.js <source|gate>");
  } catch (caught) {
    error(caught.message);
    processRef.exitCode = 1;
    return false;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) executeReleasePolicyCli();
