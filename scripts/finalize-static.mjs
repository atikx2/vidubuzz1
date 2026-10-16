import { readFileSync, writeFileSync } from "node:fs";
const platform = JSON.parse(readFileSync(".generated/platform.json", "utf8"));
const noindex = platform.source === "d1" && platform.settings.indexSite === false;
// These do not restrict iframe embedding, so Cloudflare/Arena previews remain usable.
writeFileSync("out/_headers", `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
${noindex ? "  X-Robots-Tag: noindex, nofollow\n" : ""}
/admin/*
  Cache-Control: no-store
  X-Robots-Tag: noindex, nofollow
`);
