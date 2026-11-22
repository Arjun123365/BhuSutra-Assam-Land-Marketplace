import type { Metadata } from "next";
import { ExploreMarketplace } from "../../components/explore-marketplace";
import { SiteHeader } from "../../components/site-header";
import { getPublicMarketplace } from "../../lib/public-marketplace";

export const metadata: Metadata = {
  title: "Explore Land Across Assam | BhuSutra",
  description: "Explore illustrative land parcels in Assam in the BhuSutra demonstration map.",
};

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const { parcel } = await searchParams;
  const requestedId = typeof parcel === "string" ? parcel : undefined;
  const { parcels } = getPublicMarketplace();
  const initialParcel = parcels.find(({ id }) => id === requestedId);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="explore" />
      <main id="main-content" tabIndex={-1}>
        <ExploreMarketplace key={initialParcel?.id ?? "default"} initialParcel={initialParcel} marketplaceParcels={parcels} />
      </main>
    </>
  );
}
