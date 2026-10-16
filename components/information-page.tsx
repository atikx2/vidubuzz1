import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { InformationBody } from "@/components/information-body";
import { siteOrigin, siteSettings } from "@/lib/public-platform";
import type { PublicInformationPage } from "@/lib/platform";
export function InformationPageView({ page }: { page: PublicInformationPage }) {
  const address = page.slug === "contact" ? siteSettings.publicEmail : page.slug === "content-removal" ? siteSettings.removalEmail : "";
  const [local, domain] = address.split("@");
  const url = `${siteOrigin}/${page.slug}/`;
  const structuredData = { "@context": "https://schema.org", "@graph": [
    { "@type": page.slug === "about" ? "AboutPage" : page.slug === "contact" ? "ContactPage" : "WebPage", "@id": url,
      url, name: page.title, description: page.description, dateModified: page.updatedAt,
      isPartOf: { "@type": "WebSite", name: siteSettings.brandName, url: siteOrigin } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteOrigin}/` },
      { "@type": "ListItem", position: 2, name: page.title, item: url },
    ] },
  ] };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /><SiteHeader /><main className="page-shell information-page"><nav aria-label="Breadcrumb"><Link href="/"><ArrowLeft size={14} />Home</Link><span>/</span><span>{page.title}</span></nav><article><header><p className="information-eyebrow">{siteSettings.brandName} · INFORMATION</p><h1>{page.title}</h1><p>{page.description}</p><small>Updated {new Date(page.updatedAt).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</small></header><InformationBody body={page.body} />{address && <div className="information-contact"><Mail size={23} /><div><strong>{page.slug === "content-removal" ? "Reporting address" : "Contact the team"}</strong><a href={`mailto:${encodeURIComponent(local)}@${domain}`}>{address}</a><small>Opens your email app. This website does not submit a contact form or claim delivery.</small></div></div>}</article></main></>;
}
