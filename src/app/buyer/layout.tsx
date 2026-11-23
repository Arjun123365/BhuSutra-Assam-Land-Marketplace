import type { Metadata } from "next";
import Link from "next/link";
import { NotificationIndicator } from "../../components/assistance/notifications";
import { SiteHeader } from "../../components/site-header";
import { WorkspaceContent } from "../../components/workspace-content";
import { currentBuyer } from "../../lib/buyer-session";
import { buyerSwitchKey } from "../../lib/buyer-switch-policy";
import "../seller/seller.css";

export const metadata: Metadata = { title: "Buyer workspace | BhuSutra" };
export const dynamic = "force-dynamic";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const buyer = await currentBuyer();
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="buyer" />
      <main id="main-content" tabIndex={-1} className="shell seller-workspace">
        <WorkspaceContent role="Buyer" notifications={buyer ? <NotificationIndicator actor={{kind:"Buyer",id:buyer.id}} /> : undefined} switcher={buyerSwitchKey() ? <Link href="/buyer/switch">Switch Demo Buyer</Link> : undefined}>{children}</WorkspaceContent>
      </main>
    </>
  );
}
