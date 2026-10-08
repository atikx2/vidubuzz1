import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CategoryDirectory } from "@/components/category-directory";
import { siteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `${siteContent.categoriesPageTitle} | Vidubuzz`,
  description: siteContent.categoriesPageSubtitle,
  alternates: { canonical: "/categories/" },
  robots: { index: true, follow: true },
};

export default function CategoriesPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <CategoryDirectory />
      </main>
    </>
  );
}
