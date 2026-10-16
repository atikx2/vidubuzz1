import { modelMetaDescription, slugifyModel, type ModelStatus } from "./models";

export const CATALOG_KINDS = ["channel", "category"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];
export const INFORMATION_PAGES = [
  { slug: "about", title: "About us", summary: "Introduce your website and its purpose." },
  { slug: "contact", title: "Contact", summary: "Tell visitors how to reach your team." },
  { slug: "privacy", title: "Privacy policy", summary: "Explain the data you collect and how it is used." },
  { slug: "terms", title: "Terms of use", summary: "Set your website's rules and conditions." },
  { slug: "content-removal", title: "Content removal", summary: "Explain how rights holders and affected people can report content." },
] as const;
export type InformationSlug = (typeof INFORMATION_PAGES)[number]["slug"];
export const INFORMATION_SLUGS: readonly string[] = INFORMATION_PAGES.map((page) => page.slug);
export type CatalogInput = {
  id?: string; revision?: number; kind: CatalogKind; name: string; slug: string;
  description: string; seoTitle: string; metaDescription: string; imageAlt: string;
  photoAssetId: string | null; status: ModelStatus;
};
export type ManagedCatalogEntry = CatalogInput & {
  id: string; revision: number; imageUrl: string | null; source: "admin" | "demo"; createdAt: string; updatedAt: string;
};
export type CatalogList = {
  entries: ManagedCatalogEntry[]; page: number; total: number; totalPages: number;
  stats: { total: number; published: number; drafts: number; archived: number };
};
export type PublicCatalogEntry = Omit<ManagedCatalogEntry, "photoAssetId" | "status"> & { imageUrl: string };
export type InformationPage = {
  slug: InformationSlug; title: string; description: string; body: string;
  status: "draft" | "published"; reviewConfirmed: boolean; noindex: boolean; revision: number; updatedAt: string;
};
export type PublicInformationPage = Omit<InformationPage, "status" | "reviewConfirmed">;
export type ThemeColors = { accent: string; background: string; surface: string; text: string };
export const THEME_PRESETS: Array<{ id: string; name: string; colors: ThemeColors }> = [
  { id: "rose", name: "Midnight rose", colors: { accent: "#f04d71", background: "#17151b", surface: "#211f27", text: "#fcfbfd" } },
  { id: "violet", name: "Electric violet", colors: { accent: "#a78bfa", background: "#161321", surface: "#231c34", text: "#faf7ff" } },
  { id: "blue", name: "Ocean blue", colors: { accent: "#60a5fa", background: "#101923", surface: "#1b2938", text: "#f5f9ff" } },
  { id: "emerald", name: "Deep emerald", colors: { accent: "#34d399", background: "#111c1a", surface: "#1b2b26", text: "#f3fff9" } },
];
export type SiteSettings = {
  brandName: string; tagline: string; siteUrl: string; publicEmail: string; removalEmail: string; footerText: string;
  homeTitle: string; homeDescription: string; googleVerification: string; bingVerification: string;
  indexSite: boolean; indexModels: boolean; indexChannels: boolean; indexCategories: boolean; indexPages: boolean;
  theme: ThemeColors;
};
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brandName: "Vidubuzz", tagline: "Discover videos, models and channels.", siteUrl: "", publicEmail: "", removalEmail: "",
  footerText: "Adults only · 18+ or the legal age in your location.",
  homeTitle: "Trending Videos | Vidubuzz", homeDescription: "Discover videos, explore model profiles, and browse channels and categories on Vidubuzz.",
  googleVerification: "", bingVerification: "", indexSite: true, indexModels: true, indexChannels: true, indexCategories: true, indexPages: true,
  theme: { ...THEME_PRESETS[0].colors },
};
export type SettingsRecord = { settings: SiteSettings; revision: number; updatedAt: string | null };
export type PlatformSnapshot = {
  version: 1; source: "demo" | "d1"; builtAt: string | null; settings: SiteSettings;
  settingsRevision: number; entries: PublicCatalogEntry[]; pages: PublicInformationPage[];
};
export type ConnectionStatus = {
  key: string; name: string; state: "ready" | "missing" | "error"; message: string; missing?: string[];
};
export type PlatformConfig = {
  migrationApplied: boolean; publishingConfigured: boolean; publishMissing: string[];
  snapshotSource: "demo" | "d1"; snapshotBuiltAt: string | null; publicSiteUrl: string; connections: ConnectionStatus[];
};

export function hasStarterCopy(body: string) { return /DRAFT FOR OWNER REVIEW|NOT LEGAL ADVICE|Replace this draft|Add your public contact email|Introduce your website, who operates it/i.test(body); }
export function catalogSlug(name: string, kind: CatalogKind | "model", fallback: string) {
  return slugifyModel(name) || `${kind}-${fallback}`;
}
export function catalogTitle(name: string, custom = "", brand = "Vidubuzz") { return custom.trim() || `${name} Videos | ${brand}`; }
export function catalogDescription(name: string, description: string, custom = "") {
  return custom.trim() || modelMetaDescription(description) || `Explore ${name} and browse its video collection.`;
}
export function plainText(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || /<\/?[a-z][^>]*>/i.test(value)) {
    throw new Error(`${label} must be plain text, up to ${max.toLocaleString("en")} characters.`);
  }
  const result = value.trim();
  if (required && !result) throw new Error(`${label} is required.`);
  return result;
}
export function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
export function validSiteOrigin(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/"
      || !url.hostname.includes(".") || /^(?:localhost|127\.|0\.|\[)/i.test(url.hostname)) throw new Error();
    return url.origin;
  } catch { throw new Error("Canonical site URL must be an HTTPS origin only, such as https://example.com (no path, query or credentials)."); }
}
function email(value: unknown, label: string) {
  const result = plainText(value, label, 254);
  if (result && (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(result) || result.includes(".."))) throw new Error(`${label} must be a valid public email address or left empty.`);
  return result;
}
export function normalizeHex(value: unknown) {
  if (typeof value !== "string" || !/^#[a-f\d]{6}$/i.test(value)) throw new Error("Theme colors must be six-digit hex values, such as #f04d71.");
  return value.toLowerCase();
}
function luminance(hex: string) {
  const parts = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * parts[0] + .7152 * parts[1] + .0722 * parts[2];
}
export function contrastRatio(first: string, second: string) {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
export function accentText(accent: string) { return contrastRatio(accent, "#ffffff") >= contrastRatio(accent, "#000000") ? "#ffffff" : "#000000"; }
export function validateSiteSettings(value: unknown): SiteSettings {
  const input = objectValue(value, "Settings");
  const defaults = DEFAULT_SITE_SETTINGS;
  const themeInput = objectValue(input.theme, "Theme");
  const theme = { accent: normalizeHex(themeInput.accent), background: normalizeHex(themeInput.background), surface: normalizeHex(themeInput.surface), text: normalizeHex(themeInput.text) };
  if (contrastRatio(theme.text, theme.background) < 4.5 || contrastRatio(theme.text, theme.surface) < 4.5) throw new Error("Text needs at least 4.5:1 contrast against both the page and card backgrounds. Choose more readable colors.");
  if (contrastRatio(theme.accent, theme.background) < 3 || contrastRatio(theme.accent, theme.surface) < 3) throw new Error("Accent needs at least 3:1 contrast against both backgrounds so links and controls remain visible.");
  const flags = {} as Pick<SiteSettings, "indexSite" | "indexModels" | "indexChannels" | "indexCategories" | "indexPages">;
  for (const key of ["indexSite", "indexModels", "indexChannels", "indexCategories", "indexPages"] as const) {
    if (typeof input[key] !== "boolean") throw new Error(`${key} must be true or false.`);
    flags[key] = input[key];
  }
  const google = plainText(input.googleVerification ?? "", "Google verification token", 256);
  const bing = plainText(input.bingVerification ?? "", "Bing verification token", 256);
  if ([google, bing].some((token) => token && !/^[A-Za-z0-9_-]{4,256}$/.test(token))) throw new Error("Paste only the verification content token, not a meta tag, URL, password or API key.");
  return {
    brandName: plainText(input.brandName, "Site name", 40, true), tagline: plainText(input.tagline ?? defaults.tagline, "Tagline", 140),
    siteUrl: validSiteOrigin(plainText(input.siteUrl ?? "", "Canonical site URL", 300)),
    publicEmail: email(input.publicEmail ?? "", "Contact email"), removalEmail: email(input.removalEmail ?? "", "Content removal email"),
    footerText: plainText(input.footerText ?? "", "Footer notice", 300), homeTitle: plainText(input.homeTitle, "Homepage SEO title", 100, true),
    homeDescription: plainText(input.homeDescription, "Homepage description", 300, true), googleVerification: google, bingVerification: bing, ...flags, theme,
  };
}
function mixHex(first: string, second: string, percent: number) {
  return "#" + [1, 3, 5].map((offset) => Math.round(parseInt(first.slice(offset, offset + 2), 16) * (1 - percent / 100)
    + parseInt(second.slice(offset, offset + 2), 16) * percent / 100).toString(16).padStart(2, "0")).join("");
}
function readableText(preferred: string, theme: ThemeColors) {
  for (let amount = 0; amount <= 100; amount++) {
    const color = mixHex(preferred, theme.text, amount);
    if (contrastRatio(color, theme.background) >= 4.5 && contrastRatio(color, theme.surface) >= 4.5) return color;
  }
  return theme.text;
}
export function siteThemeStyle(theme: ThemeColors): Record<string, string> {
  const light = luminance(theme.background) > .179, hover = mixHex(theme.accent, light ? "#000000" : "#ffffff", 16);
  return { "--background": theme.background, "--surface": theme.surface, "--surface-raised": theme.surface,
    "--foreground": theme.text, "--muted": readableText(mixHex(theme.text, theme.background, 25), theme),
    "--soft-muted": readableText(mixHex(theme.text, theme.background, 40), theme), "--accent": theme.accent,
    "--accent-bright": readableText(hover, theme), "--accent-text": accentText(theme.accent),
    "--accent-hover": hover, "--accent-hover-text": accentText(hover), colorScheme: light ? "light" : "dark",
    "--border": `color-mix(in srgb, ${theme.text}, transparent 88%)` };
}
