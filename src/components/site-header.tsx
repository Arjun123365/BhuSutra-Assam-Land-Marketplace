"use client";

import { Menu,X } from "lucide-react";
import Link from "next/link";
import { useRef,useState } from "react";
import { Brand } from "./brand";

export function SiteHeader({ activePage = "home" }: { activePage?: "home" | "explore" | "seller" | "admin" | "buyer" | "verify" | "about" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <div className="shell header-inner">
        <Brand href="/" />
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen(!menuOpen)}
          ref={menuButton}
        >
          {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>
        <nav id="main-navigation" aria-label="Main navigation" className="main-nav" data-open={menuOpen}>
          <ul>
            <li><Link href="/" aria-current={activePage === "home" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Home</Link></li>
            <li><Link href="/explore" aria-current={activePage === "explore" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Explore Land</Link></li>
            <li><Link href="/seller/list-property" aria-current={activePage === "seller" ? "page" : undefined} onClick={() => setMenuOpen(false)}>List Property</Link></li>
            <li><Link href="/buyer/dashboard" aria-current={activePage === "buyer" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Buyer Dashboard</Link></li>
            <li><Link href="/verify-records" aria-current={activePage === "verify" ? "page" : undefined} onClick={() => setMenuOpen(false)}>Verify Records</Link></li>
            <li><Link href="/about" aria-current={activePage === "about" ? "page" : undefined} onClick={() => setMenuOpen(false)}>About</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
