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
