// Do not ship every biography/SEO override to every directory visitor or to API Functions.
export function modelSnapshotArtifacts(snapshot) {
  return {
    "models.json": snapshot,
    "model-index.json": { version: 1, source: snapshot.source, builtAt: snapshot.builtAt,
      models: snapshot.models.map(({ id, name, slug, countryCode, age, imageUrl, imageAlt, createdAt, source }) =>
        ({ id, name, slug, countryCode, age, imageUrl, imageAlt, createdAt, source })) },
    "model-meta.json": { source: snapshot.source, builtAt: snapshot.builtAt, slugs: snapshot.models.map((model) => model.slug) },
  };
}
