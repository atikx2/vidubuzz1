"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Clock3,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { videos } from "@/lib/demo-content";
import { performers } from "@/lib/public-model-cards";
import { channelDirectory, categoryDirectory, publicBrandName } from "@/lib/public-catalog-cards";

const jumpLinks = [
  { label: "Trending videos", href: "/#trending-videos" },
  { label: "All pornstars", href: "/pornstars/" },
  { label: "All channels", href: "/channels/" },
  { label: "All categories", href: "/categories/" },
];

function BrandMark() {
  return (
    <Link className="brand-lockup" href="/" aria-label={`${publicBrandName} home`}>
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M7 10.5h8.3l4.8 14.2 4.8-14.2H33L23.4 31h-6.7L7 10.5Z" fill="currentColor" />
          <path d="M28.2 7.2h5.3v5.2h-5.3z" fill="#FFB2C2" />
        </svg>
      </span>
      <span className="brand-word">{publicBrandName.toLowerCase() === "vidubuzz" ? <>VIDU<span>BUZZ</span></> : publicBrandName}</span>
    </Link>
  );
}

function SearchBox({
  value,
  onChange,
  onClose,
  mobile = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const query = value.trim().toLowerCase();
  const results = query ? [
    ...videos.filter((video) => `${video.title} ${video.actors.join(" ")} ${video.channel}`.toLowerCase().includes(query)).slice(0, 3).map((video) => ({ name: video.title, image: video.imageSmall, href: `/video/${video.id}/`, detail: `${video.performer} · ${video.channel}`, kind: "Video", duration: video.duration })),
    ...performers.filter((model) => model.name.toLowerCase().includes(query)).slice(0, 2).map((model) => ({ name: model.name, image: model.image, href: `/${model.slug}/`, detail: `${model.videos} · Model profile`, kind: "Model", duration: "" })),
    ...channelDirectory.filter((channel) => channel.name.toLowerCase().includes(query)).slice(0, 2).map((channel) => ({ name: channel.name, image: channel.image, href: `/${channel.slug}/`, detail: `${channel.videos} · Channel`, kind: "Channel", duration: "" })),
    ...categoryDirectory.filter((category) => category.name.toLowerCase().includes(query)).slice(0, 2).map((category) => ({ name: category.name, image: category.image, href: `/categories/${category.slug}/`, detail: `${category.videos} · Category`, kind: "Category", duration: "" })),
  ].slice(0, 7) : [];

  useEffect(() => {
    if (mobile) inputRef.current?.focus();
  }, [mobile]);

  return (
    <div className={`search-box ${mobile ? "search-box-mobile" : ""}`}>
      <div className="search-field-wrap">
        <Search className="search-field-icon" size={18} strokeWidth={2} />
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose?.();
          }}
          placeholder="Search videos or models..."
          aria-label="Search videos and models"
          autoComplete="off"
          className="search-field"
        />
        {value && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            onClick={() => onChange("")}
          >
            <X size={15} />
          </button>
        )}
        {mobile && (
          <button type="button" className="mobile-close" onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        )}
      </div>
      {query && (
          <div className="search-results" role="region" aria-label="Search results">
            <div className="search-results-heading">
              <span>LIVE RESULTS</span>
              <span role="status">{results.length ? `${results.length} matches` : "No matches"}</span>
            </div>
            {results.length ? (
              results.map((result) => (
                <Link href={result.href} className="search-result" key={result.href} onClick={() => { onClose?.(); onChange(""); }}>
                  <span className="search-result-thumb"><img src={result.image} alt="" />{result.duration && <span><Clock3 size={11} /> {result.duration}</span>}</span>
                  <span className="search-result-copy"><strong>{result.name}</strong><span>{result.detail}</span></span>
                  <ChevronRight size={16} className="search-result-arrow" />
                </Link>
              ))
            ) : (
              <div className="search-empty">
                Try a video title, model name, or channel.
              </div>
            )}
            {results.length > 0 && (
              <div className="search-footnote"><Sparkles size={12} /> Videos, models, channels and categories</div>
            )}
          </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const [searchValue, setSearchValue] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const shellRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (shellRef.current && !shellRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setSearchValue("");
      }
    }
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); setMobileSearchOpen(false); setSearchValue(""); } };
    document.addEventListener("mousedown", handlePointerDown); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", handlePointerDown); document.removeEventListener("keydown", escape); };
  }, []);

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setSearchValue("");
  };

  return (
    <header className="site-header" ref={shellRef}>
      <div className="header-inner">
        <div className="header-left">
          <Button
            variant="ghost"
            size="icon"
            className="header-icon menu-trigger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </Button>
          <BrandMark />
        </div>

        <div className="desktop-search">
          <SearchBox value={searchValue} onChange={setSearchValue} />
        </div>

        <div className="header-actions">
          <Button
            variant="ghost"
            size="icon"
            className="header-icon mobile-search-trigger"
            aria-label={mobileSearchOpen ? "Close search" : "Open search"}
            onClick={() => setMobileSearchOpen((open) => !open)}
          >
            {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
          </Button>
          <Button variant="ghost" size="icon" className="header-icon account-trigger" asChild><Link href="/admin/login/" aria-label="Administrator sign in"><ShieldCheck size={21} strokeWidth={1.8} /></Link></Button>
          <span className="header-divider" />
          <Button
            variant="ghost"
            size="icon"
            className="header-icon desktop-menu-trigger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </Button>
        </div>
      </div>

      {mobileSearchOpen && (
          <div className="mobile-search-row">
            <SearchBox value={searchValue} onChange={setSearchValue} onClose={closeMobileSearch} mobile />
          </div>
      )}

      {menuOpen && (
          <nav className="menu-popover" aria-label="Main menu">
            <div className="menu-popover-top">
              <span>Explore</span>
              <span className="menu-live"><i /> TRENDING</span>
            </div>
            {jumpLinks.map((link, index) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="menu-link">
                <span className="menu-link-number">0{index + 1}</span>
                <span>{link.label}</span>
                <ArrowUpRight size={15} />
              </Link>
            ))}
            <div className="menu-popover-bottom">Fresh picks. Every day.</div>
          </nav>
      )}
    </header>
  );
}
