import Link from "next/link";
import { SiteHeader } from "../components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="shell recovery-page">
        <h1>Page or demo record unavailable</h1>
        <p>The link may be incomplete, or the record may be unavailable to this demo profile.</p>
        <div className="recovery-actions"><Link href="/explore">Explore demo parcels</Link><Link href="/">Return home</Link></div>
        <p>NESFIC demonstration prototype. Illustrative parcel boundaries use synthetic data.</p>
      </main>
    </>
  );
}
