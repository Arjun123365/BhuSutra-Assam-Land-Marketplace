import { SiteHeader } from "../components/site-header";
import { HomepageContent, HomepageFooter } from "../components/homepage-content";
import { getHomepageStatistics } from "../lib/dashboard-data";

import { getPublicMarketplace } from "../lib/public-marketplace";

export const dynamic = "force-dynamic";

export default function Home() {
  const { listings, previewParcels } = getPublicMarketplace();
  const counts = getHomepageStatistics();
  return (
    <div id="home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <HomepageContent listings={listings} previewParcels={previewParcels} counts={counts} />
      </main>
      <HomepageFooter />
    </div>
  );
}
