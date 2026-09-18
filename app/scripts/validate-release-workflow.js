import { REQUIRED_RELEASE_JOBS } from "./release-quality-policy.js";

const VALIDATION_JOBS = REQUIRED_RELEASE_JOBS.filter((job) => job !== "source-policy");

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
const conditionIncludes = (value, expression) => typeof value === "string" && value.includes(expression);

export const validateReleaseWorkflow = (workflow = {}) => {
  const pullRequest = workflow.on?.pull_request;
  if (!pullRequest || JSON.stringify(asArray(pullRequest.branches)) !== JSON.stringify(["main"])) {
    throw new Error("Release workflow must target main pull requests.");
  }
  if (!conditionIncludes(workflow.concurrency?.group, "github.event.pull_request.number")) {
    throw new Error("Release concurrency must be scoped by pull request number.");
  }
  if (workflow.concurrency?.["cancel-in-progress"] !== true) throw new Error("Superseded release runs must be cancelled.");

  const jobs = workflow.jobs || {};
  const expectedJobs = [...REQUIRED_RELEASE_JOBS, "quality-gate"];
  if (JSON.stringify(Object.keys(jobs).sort()) !== JSON.stringify(expectedJobs.sort())) throw new Error("Release workflow must expose the complete stable job set.");
  if (jobs["source-policy"].if) throw new Error("Source policy must always run for main pull requests.");

  for (const name of VALIDATION_JOBS) {
    const job = jobs[name];
    if (job.needs !== "source-policy" || !conditionIncludes(job.if, "needs.source-policy.result == 'success'")) {
      throw new Error(`${name} must depend explicitly on a successful source policy.`);
    }
    for (const step of job.steps || []) {
      if (step.run && !step.run.trim().startsWith("docker compose")) {
        throw new Error("Project commands must execute inside Docker Compose.");
      }
      if (step.uses && !/^actions\/(checkout|upload-artifact)@v4$/.test(step.uses)) {
        throw new Error("Workflow actions are limited to checkout and artifact upload.");
      }
    }
  }

  const gate = jobs["quality-gate"];
  if (!conditionIncludes(gate.if, "always()")) throw new Error("Quality gate must use always().");
  if (JSON.stringify(asArray(gate.needs).sort()) !== JSON.stringify(REQUIRED_RELEASE_JOBS.toSorted())) {
    throw new Error("Quality gate must depend on every required job.");
  }

  const uploads = Object.values(jobs).flatMap((job) => job.steps || []).filter((step) => step.uses === "actions/upload-artifact@v4");
  for (const upload of uploads) {
    if (!conditionIncludes(upload.if, "always()") || !String(upload.with?.path || "").includes("sanitized")) {
      throw new Error("Only an unconditional sanitized artifact path may be published.");
    }
    if (upload.with?.["if-no-files-found"] !== "error") throw new Error("Missing diagnostic artifacts must fail publication.");
  }
  if (uploads.length !== 4) throw new Error("Coverage and browser jobs must publish four diagnostic artifacts.");
  return { jobs: Object.keys(jobs).length, artifactUploads: uploads.length };
};
