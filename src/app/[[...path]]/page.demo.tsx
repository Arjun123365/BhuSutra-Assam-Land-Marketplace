import { notFound } from "next/navigation";
import { ExploreMarketplace } from "../../components/explore-marketplace";
import { HomepageContent } from "../../components/homepage-content";
import { PublicDemoNotice, PublicWorkspace } from "../../components/public-demo-workspace";
import { publicListings, publicParcels, publicHomepageSnapshot } from "../../lib/public-demo";

export default async function PublicPage({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const path = (await params).path ?? [];
  const query = await searchParams;
  const route = "/" + path.join("/");
  if (path.some(part => ["switch", "access", "report"].includes(part))) notFound();
  if (route === "/") return <HomepageContent listings={publicListings} previewParcels={publicParcels.filter(p => p.circle === "Teok")} counts={publicHomepageSnapshot} snapshot notice={<PublicDemoNotice compact />} />;
  if (route === "/explore") return <ExploreMarketplace initialParcel={publicParcels.find(p => p.id === query.parcel)} marketplaceParcels={publicParcels} />;
  const record = route.match(/^\/explore\/parcels\/(P-\d{2})$/);
  if (record) {
    if (!publicParcels.some(p => p.id === record[1])) notFound();
    return <PublicWorkspace section="parcel" parcelId={record[1]} />;
  }
  const sections: Record<string, string> = {
    "/verify-records": "verify", "/buyer/register": "buyer", "/buyer/dashboard": "buyer",
    "/buyer/transactions": "transactions", "/buyer/notifications": "notifications",
    "/seller/register": "seller", "/seller/dashboard": "seller", "/seller/list-property": "listing",
    "/seller/transactions": "transactions", "/seller/notifications": "notifications",
    "/admin/dashboard": "admin", "/admin/listings": "admin", "/admin/profiles": "admin",
    "/admin/enquiries": "admin", "/admin/transactions": "admin", "/admin/notifications": "notifications",
  };
  const interest = route.match(/^\/buyer\/interest\/public-(P-\d{2})$/);
  const start = route.match(/^\/buyer\/transactions\/start\/public-(P-\d{2})$/);
  if (interest || start) {
    const id = (interest ?? start)![1];
    if (!publicListings.some(p => p.id === id)) notFound();
    return <PublicWorkspace section={interest ? "buyer" : "transactions"} parcelId={id} />;
  }
  if (!sections[route]) notFound();
  return <PublicWorkspace section={sections[route]} parcelId={typeof query.parcel === "string" ? query.parcel : "P-15"} />;
}
