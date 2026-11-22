import { ArrowRight, MapPinned } from "lucide-react";
import Link from "next/link";

export function HomeHero() {
  return (
    <section className="presentation-hero" aria-labelledby="hero-title">
      <div className="shell presentation-hero-grid">
        <div className="presentation-hero-copy">
          <p className="hero-tagline"><span /> Connecting Land. Building Trust.</p>
          <h1 id="hero-title">Discover Land. Build Trust.<br /><em>Empower Assam.</em></h1>
          <p>Explore a demonstration of Assam’s land marketplace, from parcel discovery to transparent due diligence and assisted coordination.</p>
          <nav className="hero-actions" aria-label="Marketplace actions">
            <Link href="/explore" className="hero-primary"><MapPinned size={17} aria-hidden="true" /> Explore Land <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/seller/list-property">List Property</Link>
            <Link href="/verify-records">Verify Records</Link>
            <Link href="/buyer/dashboard">Buyer Dashboard</Link>
          </nav>
        </div>
        <div className="hero-land-art" aria-hidden="true">
          <svg viewBox="0 0 430 230" fill="none">
            <path d="M20 170 122 103 206 125 315 51 407 79M18 95 106 54 204 71 293 14M87 227 173 168 279 181 401 112" stroke="#a6c2ac" strokeWidth="2" />
            <g fill="#dce9cf" stroke="#fff" strokeWidth="3">
              <path d="m30 111 69-32 40 36-63 40z" /><path d="m112 71 77 13 18 42-54-15z" />
              <path d="m87 164 65-43 53 18-35 47-45 15z" />
              <path d="m220 91 65-46 35 18-50 55-53 19z" /><path d="m288 126 48-52 58 18-9 49-72 22z" />
              <path d="m183 181 34-34 54-14 29 39-48 37z" />
            </g>
            <path d="m153 121 54 18 18-42 58-42-40-15-51 28-51 10z" fill="#588e65" stroke="#14532d" strokeWidth="2" />
            <path d="m158 133 48 17-29 32-45 15-32-29z" fill="#d6ba66" stroke="#a8872d" strokeWidth="2" />
            <path className="hero-map-connection" d="M116 174Q220 8 349 109" stroke="#397452" strokeWidth="2" strokeDasharray="5 6" />
            <g fill="#14532d" stroke="#fff" strokeWidth="3">
              <circle cx="116" cy="174" r="7" /><circle cx="349" cy="109" r="7" /><circle cx="230" cy="82" r="7" />
            </g>
            <circle className="hero-map-marker" cx="230" cy="82" r="15" stroke="#d4af37" strokeWidth="2" />
          </svg>
          <span className="hero-art-caption">Illustrative parcels · Assam demo</span>
        </div>
      </div>
      <div className="shell"><p className="home-demo-notice">NESFIC demonstration prototype using synthetic data. Not an official Government portal or certification of land title.</p></div>
    </section>
  );
}
