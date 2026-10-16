import { mkdir, rename, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildModelSnapshot } from "../lib/model-build";
import { buildPlatformSnapshot, platformReader, PLATFORM_FINGERPRINT_SQL } from "../lib/platform-build";
import { modelSnapshotArtifacts } from "./model-snapshot-artifacts.mjs";
import { platformSnapshotArtifacts } from "./platform-snapshot-artifacts.mjs";

async function main() {
  const env = { R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID, D1_DATABASE_ID: process.env.D1_DATABASE_ID,
    D1_READ_TOKEN: process.env.D1_READ_TOKEN, R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL };
  const query = env.D1_DATABASE_ID || env.D1_READ_TOKEN ? platformReader(env) : null;
  const before = query ? (await query(PLATFORM_FINGERPRINT_SQL))[0] : null;
  const snapshot = await buildModelSnapshot(env);
  const platform = await buildPlatformSnapshot(env);
  const after = query ? (await query(PLATFORM_FINGERPRINT_SQL))[0] : null;
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Site content changed between snapshots. Retry the static build without editing during export.");
  const directory = resolve(".generated");
  await mkdir(directory, { recursive: true });
  const artifacts = { ...modelSnapshotArtifacts(snapshot), ...platformSnapshotArtifacts(platform),
    "workspace-migration.json": (await readFile(resolve("migrations/0004_workspace.sql"), "utf8")) + "\nSELECT (SELECT COUNT(*) FROM catalog_entries) AS catalog_entries, (SELECT COUNT(*) FROM site_pages) AS information_pages;\n" };
  for (const [name, data] of Object.entries(artifacts)) {
    const destination = resolve(directory, name), temporary = `${destination}.tmp`;
    await writeFile(temporary, JSON.stringify(data) + "\n"); await rename(temporary, destination);
  }
  console.log(snapshot.source === "d1" ? `Static site snapshot: ${snapshot.models.length} public models, ${platform.entries.length} public catalog entries, ${platform.pages.length} reviewed pages.` : "Static site snapshot: demo fallback; no D1 publishing credentials configured.");
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Static site snapshot could not be built.");
  process.exitCode = 1;
});
