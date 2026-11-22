import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "../../components/site-header";
import "../seller/seller.css";
import { currentBuyer } from "../../lib/buyer-session";
import { NotificationIndicator } from "../../components/assistance/notifications";
import { buyerSwitchKey } from "../../lib/buyer-switch-policy";

export const metadata: Metadata = { title: "Buyer workspace | BhuSutra" };
export const dynamic = "force-dynamic";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const buyer = await currentBuyer();
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="buyer" />
      <main id="main-content" tabIndex={-1} className="shell seller-workspace">
        <p className="seller-notice"><strong>NESFIC Demonstration Prototype.</strong> Buyer profiles, enquiries and seller responses use synthetic data. This is a local demo session without real identity verification. Use fictional information only.</p>
        <nav className="seller-nav" aria-label="Buyer workspace"><Link href="/buyer/dashboard">Buyer dashboard</Link><Link href="/buyer/transactions">Transaction assistance</Link><Link href="/#featured">Browse approved listings</Link>{buyerSwitchKey() && <Link href="/buyer/switch">Switch Demo Buyer</Link>}{buyer && <NotificationIndicator actor={{ kind: "Buyer", id: buyer.id }} />}</nav>
        {children}
      </main>
    </>
  );
}
