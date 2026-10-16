import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CategoryDirectory } from "@/components/category-directory";
import { publicRobots, siteSettings } from "@/lib/public-platform";
import { siteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `${siteContent.categoriesPageTitle} | ${siteSettings.brandName}`,
  description: siteContent.categoriesPageSubtitle,
  alternates: { canonical: "/categories/" },
  robots: publicRobots("categories"),
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
