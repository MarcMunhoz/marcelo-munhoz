import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, it } from "vitest";

const workflowPath = new URL("../../../../workspace/.github/workflows/publish-release.yml", import.meta.url);

describe("release publication workflow", () => {
  it("publishes each validated main version exactly once", () => {
    const workflow = parse(readFileSync(workflowPath, "utf8"));
    assert.deepEqual(workflow.on.push.branches, ["main"]);
    assert.deepEqual(workflow.permissions, { contents: "read" });

    const metadataJob = workflow.jobs["validate-release"];
    assert.equal(metadataJob.outputs.tag, "${{ steps.release.outputs.tag }}");

    const job = workflow.jobs["publish-release"];
    assert.equal(job.needs, "validate-release");
    assert.deepEqual(job.permissions, { contents: "write" });
    assert.equal(job.concurrency.group, "publish-release-${{ needs.validate-release.outputs.tag }}");
    assert.equal(job.concurrency["cancel-in-progress"], false);
    assert.equal(job["runs-on"], "ubuntu-24.04");
    const checkout = job.steps.find((step) => step.uses?.startsWith("actions/checkout@"));
    assert.equal(checkout.uses, "actions/checkout@v5");
    assert.equal(checkout.with["persist-credentials"], false);

    const metadata = metadataJob.steps.find((step) => step.run?.includes("release-publication.js"));
    assert.match(metadata.run, /GITHUB_OUTPUT/);
    const publication = job.steps.find((step) => step.run?.includes("gh release create"));
    assert.equal(publication.env.GH_TOKEN, "${{ github.token }}");
    assert.match(publication.run, /gh release view/);
    assert.match(publication.run, /refs\/tags\/\$TAG\^\{commit\}/);
    assert.match(publication.run, /TAG_SHA.*GITHUB_SHA/);
    assert.match(publication.run, /--target "\$GITHUB_SHA"/);
    assert.match(publication.run, /--generate-notes/);
  });
});
