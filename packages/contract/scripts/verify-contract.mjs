#!/usr/bin/env node
// Fails the build when packages/contract/src/types.gen.ts is stale relative
// to openapi.yaml, i.e. someone edited the spec without running `npm run gen`.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);

const contractDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const specPath = path.join(contractDir, "openapi.yaml");
const committedPath = path.join(contractDir, "src", "types.gen.ts");
const openapiTypescriptPkgJson = require.resolve("openapi-typescript/package.json", {
  paths: [contractDir],
});
const openapiTypescriptCli = path.join(path.dirname(openapiTypescriptPkgJson), "bin", "cli.js");

const tempDir = mkdtempSync(path.join(tmpdir(), "contract-verify-"));
const generatedPath = path.join(tempDir, "types.gen.ts");

try {
  execFileSync(process.execPath, [openapiTypescriptCli, specPath, "-o", generatedPath], {
    stdio: "inherit",
  });

  const generated = readFileSync(generatedPath, "utf8");
  const committed = readFileSync(committedPath, "utf8");

  if (generated !== committed) {
    console.error(
      "\nContract drift detected: packages/contract/src/types.gen.ts is out of date with openapi.yaml.\n" +
        "Run `npm run gen -w @equipment-hub/contract` and commit the result.\n",
    );
    process.exit(1);
  }

  console.log("Contract types are in sync with openapi.yaml.");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
