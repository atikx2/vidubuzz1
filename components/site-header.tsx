"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { videos } from "@/lib/demo-content";

const jumpLinks = [
  { label: "Trending videos", href: "#trending-videos" },
  { label: "Trending pornstars", href: "#trending-pornstars" },
  { label: "Trending channels", href: "#trending-channels" },
];

function BrandMark() {
  return (
    <Link className="brand-lockup" href="/" aria-label="Vidubuzz home">
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M7 10.5h8.3l4.8 14.2 4.8-14.2H33L23.4 31h-6.7L7 10.5Z" fill="currentColor" />
          <path d="M28.2 7.2h5.3v5.2h-5.3z" fill="#FFB2C2" />
        </svg>
      </span>
      <span className="brand-word">VIDU<span>BUZZ</span></span>
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
  const results = query
    ? videos
        .map((video, index) => ({ video, index }))
        .filter(({ video }) =>
          `${video.title} ${video.actors.join(" ")}`.toLowerCase().includes(query),
        )
        .slice(0, 5)
    : [];

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
      <AnimatePresence>
        {query && (
          <motion.div
            className="search-results"
            initial={{ opacity: 0, y: 7, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.99 }}
            transition={{ duration: 0.16 }}
            role="listbox"
          >
            <div className="search-results-heading">
              <span>LIVE RESULTS</span>
              <span>{results.length ? `${results.length} matches` : "No matches"}</span>
            </div>
            {results.length ? (
              results.map(({ video, index }) => (
                <a
                  href={`#video-${index}`}
                  className="search-result"
                  key={`${video.title}-${index}`}
                  onClick={onClose}
                >
                  <span className="search-result-thumb">
                    <img src={video.imageSmall} alt="" />
                    <span><Clock3 size={11} /> {video.duration}</span>
                  </span>
                  <span className="search-result-copy">
                    <strong>{video.title}</strong>
                    <span>{video.performer} <i>·</i> {video.channel}</span>
                  </span>
                  <ChevronRight size={16} className="search-result-arrow" />
                </a>
              ))
            ) : (
              <div className="search-empty">
                Try a video title, model name, or channel.
              </div>
            )}
            {results.length > 0 && (
              <div className="search-footnote"><Sparkles size={12} /> Matches video titles, models, and channels</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
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
          <Button variant="ghost" size="icon" className="header-icon account-trigger" aria-label="Account">
            <CircleUserRound size={21} strokeWidth={1.8} />
          </Button>
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

      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            className="mobile-search-row"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <SearchBox value={searchValue} onChange={setSearchValue} onClose={closeMobileSearch} mobile />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="menu-popover"
            aria-label="Main menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.16 }}
          >
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
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
