import type { Metadata } from "next";
import Link from "next/link";
import { NotificationIndicator } from "../../components/assistance/notifications";
import { SiteHeader } from "../../components/site-header";
import { WorkspaceContent } from "../../components/workspace-content";
import { sellerSwitchKey } from "../../lib/seller-cookie";
import { currentSeller } from "../../lib/seller-session";
import "./seller.css";

export const metadata: Metadata = { title: "Seller workspace | BhuSutra" };
export const dynamic = "force-dynamic";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const seller = await currentSeller();
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="seller" />
      <main id="main-content" tabIndex={-1} className="shell seller-workspace">
        <WorkspaceContent role="Seller" name={seller?.displayName} notifications={seller ? <NotificationIndicator actor={{kind:"Seller",id:seller.id}} /> : undefined} switcher={sellerSwitchKey() ? <Link href="/seller/switch">Switch Demo Seller</Link> : undefined}>{children}</WorkspaceContent>
      </main>
    </>
  );
}
