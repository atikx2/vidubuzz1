// Keep biographies, policies and SEO overrides out of public client and Function bundles.
export function platformSnapshotArtifacts(snapshot) {
  return {
    "platform.json": snapshot,
    "platform-index.json": { source: snapshot.source, builtAt: snapshot.builtAt, brandName: snapshot.settings?.brandName || "Vidubuzz",
      entries: snapshot.entries.map(({ id, kind, slug, name, imageUrl, imageAlt, source, createdAt }) => ({ id, kind, slug, name, imageUrl, imageAlt, source, createdAt })) },
    "platform-meta.json": { source: snapshot.source, builtAt: snapshot.builtAt, settingsRevision: snapshot.settingsRevision,
      channels: snapshot.entries.filter((entry) => entry.kind === "channel").map((entry) => entry.slug),
      categories: snapshot.entries.filter((entry) => entry.kind === "category").map((entry) => entry.slug), pages: snapshot.pages.map((page) => page.slug) },
  };
}
