import { rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const browser = process.argv[2];
if (!["chrome", "firefox"].includes(browser)) {
  console.error("Usage: node scripts/run-cypress-matrix.js <chrome|firefox>");
  process.exitCode = 2;
} else {
  rmSync("artifacts/cypress", { recursive: true, force: true });
  const display = ":99";
  const xvfb = spawn("Xvfb", [display, "-screen", "0", "1440x900x24", "-nolisten", "tcp"], {
    stdio: "inherit"
  });

  // Give Xvfb a short deterministic window to publish its socket before
  // Cypress performs the Electron smoke test.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);

  try {
    for (const viewportClass of ["desktop", "mobile"]) {
      const result = spawnSync(
        process.execPath,
        ["node_modules/cypress/bin/cypress", "run", "--browser", browser, "--env", `viewportClass=${viewportClass}`],
        { stdio: "inherit", env: { ...process.env, DISPLAY: display } }
      );
      if (result.status !== 0) {
        process.exitCode = result.status || 1;
        break;
      }
    }
  } finally {
    xvfb.kill("SIGTERM");
  }
}
