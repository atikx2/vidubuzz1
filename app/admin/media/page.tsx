import type { Metadata } from "next";
import { AdminMediaLibrary } from "@/components/admin-media-library";

export const metadata: Metadata = { title: "R2 Media Library | Vidubuzz" };

export default function AdminMediaPage() {
  return <AdminMediaLibrary />;
}
