import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildModelSnapshot } from "../lib/model-build";
import { modelSnapshotArtifacts } from "./model-snapshot-artifacts.mjs";

async function main() {
  const snapshot = await buildModelSnapshot({ R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID, D1_DATABASE_ID: process.env.D1_DATABASE_ID,
    D1_READ_TOKEN: process.env.D1_READ_TOKEN, R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL });
  const directory = resolve(".generated");
  await mkdir(directory, { recursive: true });
  for (const [name, data] of Object.entries(modelSnapshotArtifacts(snapshot))) {
    const destination = resolve(directory, name);
    const temporary = `${destination}.tmp`;
    await writeFile(temporary, JSON.stringify(data) + "\n");
    await rename(temporary, destination);
  }
  console.log(snapshot.source === "d1" ? `Static model snapshot: ${snapshot.models.length} published profiles.` : "Static model snapshot: existing demo catalog (D1 publishing not configured yet).");
}
main().catch((error: unknown) => {
  // Do not log access tokens, response bodies, or request headers.
  console.error(error instanceof Error ? error.message : "Model snapshot could not be built.");
  process.exitCode = 1;
});
