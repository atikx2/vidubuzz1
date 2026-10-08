"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight, ChartNoAxesCombined, Clapperboard, LayoutDashboard, LogOut,
  Radio, ShieldCheck, Tags, UserRound, UsersRound,
} from "lucide-react";
import { adminPost } from "@/lib/admin-api";

const navigation = [
  { label: "Dashboard", href: "/admin/", icon: LayoutDashboard, section: "dashboard" },
  { label: "Analytics", href: "/admin/#analytics", icon: ChartNoAxesCombined, section: "analytics" },
  { label: "Videos", href: "/admin/#videos", icon: Clapperboard, section: "videos" },
  { label: "Models", href: "/admin/#models", icon: UsersRound, section: "models" },
  { label: "Channels", href: "/admin/#channels", icon: Radio, section: "channels" },
  { label: "Categories", href: "/admin/#categories", icon: Tags, section: "categories" },
  { label: "Profile", href: "/admin/profile/", icon: UserRound, section: "profile" },
];

export function AdminShell({ children, title, subtitle, email }: { children: ReactNode; title: string; subtitle: string; email?: string }) {
  const rawPathname = usePathname();
  const pathname = rawPathname.replace(/\/+$/, "");
  const router = useRouter();
  const [hash, setHash] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const revealActiveMenu = () => {
      const nav = mobileNavRef.current;
      const item = nav?.querySelector<HTMLElement>("[aria-current]");
      if (!nav?.clientWidth || !item) return;
      nav.scrollLeft = Math.max(0, item.offsetLeft - (nav.clientWidth - item.offsetWidth) / 2);
    };
    revealActiveMenu();
    window.addEventListener("resize", revealActiveMenu);
    return () => window.removeEventListener("resize", revealActiveMenu);
  }, [pathname, hash]);

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await adminPost("/api/admin/logout");
      router.replace("/admin/login/");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Sign-out failed. Try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  function isActive(section: string) {
    if (section === "profile") return pathname === "/admin/profile";
    return pathname === "/admin" && (section === "dashboard" ? !hash : hash === `#${section}`);
  }

  const nav = (mobile = false) => (
    <nav ref={mobile ? mobileNavRef : undefined} className={mobile ? "admin-nav admin-nav-mobile" : "admin-nav admin-nav-desktop"} aria-label={mobile ? "Admin menu, swipe to see more" : "Admin menu"}>
      {navigation.map(({ label, href, icon: Icon, section }) => (
        <Link className={`admin-nav-link ${isActive(section) ? "admin-nav-link-active" : ""}`} href={href} key={section}
          aria-current={isActive(section) ? (section === "profile" || section === "dashboard" ? "page" : "location") : undefined}
          onClick={() => setHash(href.includes("#") ? `#${section}` : "")}>
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link href="/admin/" className="admin-brand">
          <span className="admin-brand-mark"><ShieldCheck size={21} aria-hidden="true" /></span>
          <span><strong>VIDUBUZZ</strong><small>ADMIN CONSOLE</small></span>
        </Link>
        <div className="admin-sidebar-caption">WORKSPACE</div>
        {nav()}
        <div className="admin-sidebar-bottom">
          <div className="admin-security-note"><ShieldCheck size={16} aria-hidden="true" /><span>Protected admin APIs</span></div>
          <Link className="admin-site-link" href="/"><span>View public site</span><ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <Link href="/admin/" className="admin-topbar-brand"><span className="admin-brand-mark"><ShieldCheck size={19} aria-hidden="true" /></span><strong>VIDUBUZZ <em>ADMIN</em></strong></Link>
          <span className="admin-topbar-location">Workspace <i>/</i> {title}</span>
          <div className="admin-topbar-right">
            <Link className="admin-view-site" href="/">View site<ArrowUpRight size={15} aria-hidden="true" /></Link>
            {email ? <><Link href="/admin/profile/" className="admin-topbar-profile" aria-label="Admin profile"><UserRound size={17} /></Link>
              <button className="admin-logout-button" type="button" disabled={loggingOut} onClick={() => void logout()}><LogOut size={15} aria-hidden="true" /><span>{loggingOut ? "Signing out…" : "Log out"}</span></button></>
              : <Link className="admin-logout-button" href="/admin/login/">Sign in</Link>}
          </div>
        </header>
        {nav(true)}
        <main className="admin-content" id="admin-main">
          <div className="admin-page-heading">
            <div><p>YOUR WORKSPACE, AT A GLANCE</p><h1>{title}</h1><span>{subtitle}</span></div>
            {email && <Link href="/admin/profile/" className="admin-account-chip"><span className="admin-account-avatar"><UserRound size={17} /></span><span><strong>Administrator</strong><small>{email}</small></span></Link>}
          </div>
          {logoutError && <p className="admin-form-error" role="alert">{logoutError}</p>}
          {children}
          <footer className="admin-footer"><span>VIDUBUZZ <i>ADMIN CONSOLE</i></span><span>Static site · Cloudflare D1</span></footer>
        </main>
      </div>
    </div>
  );
}
