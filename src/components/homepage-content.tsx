import { ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { demoParcels } from "../lib/demo-marketplace";
import type { PublicMarketplace } from "../lib/public-marketplace";
import { HomeHero } from "./home-hero";
import { Marketplace } from "./marketplace";
import { DistributionChart, MetricCards } from "./dashboard-ui";

export type HomepageCounts = { parcels: number; approved: number; sellers: number; buyers: number; enquiries: number; transactions: number };

// Both route sets use the same presentation; only their data provenance differs.
export function HomepageContent({ listings, previewParcels, counts, snapshot = false, notice }: Pick<PublicMarketplace, "listings" | "previewParcels"> & { counts: HomepageCounts; snapshot?: boolean; notice?: ReactNode }) {
  const districts = [...new Set(demoParcels.map(p => p.district))].sort();
  const categories = [...new Set(demoParcels.map(p => p.category))].sort();
  return <>
    <HomeHero />
    {notice}
    <div className="shell home-metrics">
      {snapshot && <p className="snapshot-caption">Synthetic demonstration snapshots · not live database totals. Browser simulations do not change these figures.</p>}
      <MetricCards label={snapshot ? "Synthetic demonstration snapshot totals — not live database totals" : "Stored demo marketplace totals"} items={[
        { label: "Synthetic parcels", value: counts.parcels, href: "/explore" },
        { label: "Approved listings", value: counts.approved, href: "/#featured" },
        { label: "Demo sellers", value: counts.sellers },
        { label: "Demo buyers", value: counts.buyers },
        { label: "Buyer enquiries", value: counts.enquiries },
        { label: "Assistance requests", value: counts.transactions },
      ]} />
    </div>
    <Marketplace listings={listings} previewParcels={previewParcels} />
    <section className="shell home-analytics" aria-label="Synthetic parcel analytics">
      <DistributionChart title="Land across three districts" description={`All ${counts.parcels} synthetic parcels, grouped by district.`} values={districts.map(label => ({ label, value: demoParcels.filter(p => p.district === label).length }))} />
      <DistributionChart title="Land classification" description="Classification from the synthetic parcel dataset." values={categories.map(label => ({ label, value: demoParcels.filter(p => p.category === label).length }))} />
    </section>
  </>;
}

export function HomepageFooter({ children }: { children?: ReactNode }) {
  return <footer id="about" className="site-footer" aria-labelledby="about-title" tabIndex={-1}>
    <div className="shell footer-inner">
      <div><h2 id="about-title">About BhuSutra</h2><p>BhuSutra explores how a government-facilitated land marketplace could connect willing landowners and buyers in Assam.</p></div>
      <a className="back-home" href="#home">Back to top <ArrowUp size={15} aria-hidden="true" /></a>
    </div>
    {children}
  </footer>;
}
