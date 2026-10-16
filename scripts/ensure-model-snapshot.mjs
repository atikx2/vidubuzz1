import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { modelSnapshotArtifacts } from "./model-snapshot-artifacts.mjs";
const directory = resolve(".generated");
const file = resolve(directory, "models.json");
const snapshot = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { version: 1, source: "demo", builtAt: null, models: [] };
mkdirSync(directory, { recursive: true });
for (const [name, data] of Object.entries(modelSnapshotArtifacts(snapshot))) {
  const path = resolve(directory, name);
  if (!existsSync(path)) writeFileSync(path, JSON.stringify(data) + "\n");
}

// A clean clone can typecheck, test and develop without any Cloudflare credentials.
const platformFile = resolve(directory, "platform.json");
const platform = existsSync(platformFile) ? JSON.parse(readFileSync(platformFile, "utf8")) : { version: 1, source: "demo", builtAt: null, settings: null, settingsRevision: 0, entries: [], pages: [] };
const { platformSnapshotArtifacts } = await import("./platform-snapshot-artifacts.mjs");
for (const [name, data] of Object.entries(platformSnapshotArtifacts(platform))) {
  const path = resolve(directory, name);
  if (!existsSync(path)) writeFileSync(path, JSON.stringify(data) + "\n");
}
// This is public schema/demo SQL, never account data or credentials. The admin offers one-tap copy.
const migration = readFileSync(resolve("migrations/0004_workspace.sql"), "utf8");
writeFileSync(resolve(directory, "workspace-migration.json"), JSON.stringify(migration + "\nSELECT (SELECT COUNT(*) FROM catalog_entries) AS catalog_entries, (SELECT COUNT(*) FROM site_pages) AS information_pages;\n") + "\n");
