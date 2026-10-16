import type { Metadata } from "next";
import "./admin.css";
import "./models/models.css";
import "./workspace.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
