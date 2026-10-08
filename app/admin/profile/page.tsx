import type { Metadata } from "next";
import { AdminProfileSettings } from "@/components/admin-profile-settings";

export const metadata: Metadata = {
  title: "Admin Profile | Vidubuzz",
  robots: { index: false, follow: false },
};

export default function AdminProfilePage() {
  return <AdminProfileSettings />;
}
