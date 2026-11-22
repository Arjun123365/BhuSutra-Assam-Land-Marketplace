import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { sellerSwitchKey } from "../../lib/seller-cookie";
import { currentSeller } from "../../lib/seller-session";
import "./seller.css";
import { NotificationIndicator } from "../../components/assistance/notifications";

export const metadata: Metadata = { title: "Seller workspace | BhuSutra" };
export const dynamic = "force-dynamic";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const seller = await currentSeller();
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="seller" />
      <main id="main-content" tabIndex={-1} className="shell seller-workspace">
        <p className="seller-notice"><strong>NESFIC Demonstration Prototype.</strong> Use fictional details only. Demo profiles are browser sessions on this local installation and provide no secure authentication or access control. Government verification is unavailable.</p>
        <nav className="seller-nav" aria-label="Seller workspace">
          <Link href="/seller/dashboard">Seller dashboard</Link>
          <Link href="/seller/transactions">Transaction assistance</Link>
          {seller && <NotificationIndicator actor={{ kind: "Seller", id: seller.id }} />}
          <Link href="/seller/list-property">List property</Link>
          <Link href="/seller/register">Register</Link>
          {sellerSwitchKey() && <Link href="/seller/switch">Switch Demo Seller</Link>}
        </nav>
        <p className="seller-active"><strong>Active demo seller</strong> {seller?.displayName ?? "No profile selected"}</p>
        {children}
      </main>
    </>
  );
}
