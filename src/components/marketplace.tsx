"use client";

import { ArrowUpRight, ChevronDown, CircleDollarSign, FileText, Info, MapPin, Search, Square, Trees } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { demoDistricts, formatIndicativePrice, parcelHref, parcelRecordHref } from "../lib/demo-marketplace";
import { interestHref } from "../lib/buyer-demo";
import type { PublicMarketplace } from "../lib/public-marketplace";
import { DashboardMapPreview } from "./dashboard-map-preview";
import { LandIllustration } from "./land-illustration";

const budgets = [
  { value: 2000000, label: "Up to ₹20 lakh" },
  { value: 3000000, label: "Up to ₹30 lakh" },
  { value: 5000000, label: "Up to ₹50 lakh" },
];

const emptyFilters = { district: "", category: "", budget: 0 };

export function Marketplace({ listings: activeListings, previewParcels }: Pick<PublicMarketplace, "listings" | "previewParcels">) {
  const landTypes = [...new Set(activeListings.map(({ category }) => category))].sort();
  const [filters, setFilters] = useState(emptyFilters);
  const filtered = Boolean(filters.district || filters.category || filters.budget);
  const listings = activeListings.filter((listing) =>
    (!filters.district || listing.district === filters.district) &&
    (!filters.category || listing.category === filters.category) &&
    (!filters.budget || listing.price <= filters.budget),
  );

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setFilters({
      district: String(values.get("district") ?? ""),
      category: String(values.get("category") ?? ""),
      budget: Number(values.get("budget")),
    });
    document.getElementById("featured-title")?.scrollIntoView({ block: "nearest" });
  }

  return (
    <>
      <div className="shell home-search">
          <form id="property-search" className="property-search" aria-label="Filter demo listings" onSubmit={applyFilters} onReset={() => setFilters(emptyFilters)}>
            <label className="search-field">
              <MapPin className="field-icon" size={19} aria-hidden="true" />
              <span className="field-content"><span>District</span>
                <select name="district" aria-label="District">
                  <option value="">All three districts</option>
                  {demoDistricts.map((district) => <option key={district}>{district}</option>)}
                </select>
              </span>
              <ChevronDown className="field-chevron" size={15} aria-hidden="true" />
            </label>
            <label className="search-field">
              <Trees className="field-icon" size={19} aria-hidden="true" />
              <span className="field-content"><span>Land type</span>
                <select name="category" aria-label="Land type">
                  <option value="">All land types</option>
                  {landTypes.map((category) => <option key={category}>{category}</option>)}
                </select>
              </span>
              <ChevronDown className="field-chevron" size={15} aria-hidden="true" />
            </label>
            <label className="search-field">
              <CircleDollarSign className="field-icon" size={19} aria-hidden="true" />
              <span className="field-content"><span>Budget</span>
                <select name="budget" aria-label="Budget">
                  <option value="">Any budget</option>
                  {budgets.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </span>
              <ChevronDown className="field-chevron" size={15} aria-hidden="true" />
            </label>
            <button type="submit" className="search-button"><Search size={18} aria-hidden="true" /> Search land</button>
          </form>
      </div>

      <div className="shell dashboard">
        <div className="marketplace-grid">
          <section id="featured" aria-labelledby="featured-title" tabIndex={-1}>
            <div className="section-heading">
              <div>
                <h2 id="featured-title">Featured Land Listings</h2>
                <p role="status">{listings.length} {listings.length === 1 ? "demo listing" : "demo listings"}{filtered ? " match your filters" : " available"}</p>
              </div>
              {filtered && <button type="reset" form="property-search" className="clear-filters">Clear filters</button>}
            </div>
            {listings.length > 0 ? (
              <ul className="listing-grid">
                {listings.map((listing) => (
                  <li key={listing.id}>
                    <article className="listing-card">
                      <div className="listing-image">
                        <LandIllustration category={listing.category} />
                        <span className="listing-category">{listing.category}</span>
                      </div>
                      <div className="listing-body">
                        <h3><Link href={parcelHref(listing.id)}>{listing.title}</Link></h3>
                        <ul className="listing-facts" aria-label="Seller-declared listing details">
                          <li><MapPin size={14} aria-hidden="true" /> {listing.district} · {listing.circle}</li>
                          <li><Square size={13} aria-hidden="true" /> {listing.area} {listing.areaUnit}</li>
                        </ul>
                        <div className="listing-price">
                          <strong>{formatIndicativePrice(listing.price)}</strong>
                          <span>Indicative price</span>
                        </div>
                        <span className="listing-status"><FileText size={14} aria-hidden="true" /> {listing.seeded ? "Seeded demo · Seller-declared" : "Seller-declared"}</span>
                        <p className="publication-label">Approved for demo publication</p>
                        <div className="listing-card-actions">
                          <Link href={parcelRecordHref(listing.id)} className="listing-details-link" aria-label={"View details for parcel " + listing.id}>View Details <ArrowUpRight size={14} aria-hidden="true" /></Link>
                          <Link href={interestHref(listing.listingId)} className="listing-enquiry-link" aria-label={"Express Interest in parcel " + listing.id}>Express Interest</Link>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <Search size={23} aria-hidden="true" />
                <h3>No demo listings match these filters</h3>
                <p>Choose a different district, land type or budget.</p>
              </div>
            )}
          </section>

          <aside className="marketplace-aside" aria-label="Map preview and listing sources">
            <DashboardMapPreview parcels={previewParcels} />
            <div className="data-note">
              <Info size={18} aria-hidden="true" />
              <div>
                <h2>Listing information sources</h2>
                <p>Listing details are seller-declared in the demo. Government-record-derived fields are unavailable.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
