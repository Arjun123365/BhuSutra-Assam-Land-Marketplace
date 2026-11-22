import { ArrowUp } from "lucide-react";
import { Marketplace } from "../components/marketplace";
import { SiteHeader } from "../components/site-header";
import { HomeHero } from "../components/home-hero";
import { DistributionChart, MetricCards } from "../components/dashboard-ui";
import { getHomepageStatistics, getParcelDistributions } from "../lib/dashboard-data";

import { getPublicMarketplace } from "../lib/public-marketplace";

export const dynamic = "force-dynamic";

export default function Home() {
  const { listings, previewParcels } = getPublicMarketplace();
  const counts = getHomepageStatistics();
  const distribution = getParcelDistributions();
  return (
    <div id="home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <HomeHero />
        <div className="shell home-metrics">
          <MetricCards label="Stored demo marketplace totals" items={[
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
          <DistributionChart title="Land across three districts" description={"All " + counts.parcels + " synthetic parcels, grouped by district."} values={distribution.districts} />
          <DistributionChart title="Land classification" description="Classification from the synthetic parcel dataset." values={distribution.categories} />
        </section>
      </main>
      <footer id="about" className="site-footer" aria-labelledby="about-title" tabIndex={-1}>
        <div className="shell footer-inner">
          <div>
            <h2 id="about-title">About BhuSutra</h2>
            <p>BhuSutra explores how a government-facilitated land marketplace could connect willing landowners and buyers in Assam.</p>
          </div>
          <a className="back-home" href="#home">Back to top <ArrowUp size={15} aria-hidden="true" /></a>
        </div>
      </footer>
    </div>
  );
}
