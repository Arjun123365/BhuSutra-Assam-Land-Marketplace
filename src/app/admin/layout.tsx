import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../../components/site-header";
import { currentAdmin } from "../../lib/admin-session";
import { lockAdminAction } from "./actions";
import "../seller/seller.css";
import "./admin.css";
import { NotificationIndicator } from "../../components/assistance/notifications";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demo administrator | BhuSutra" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="admin" />
      <main id="main-content" tabIndex={-1} className="shell seller-workspace admin-workspace">
        <div className="admin-banner">
          <strong>DEMO ADMINISTRATOR — NOT AN OFFICIAL GOVERNMENT USER</strong>
          <p>NESFIC Demonstration Prototype. Decisions control demo marketplace publication only.</p>
        </div>
        {admin && (
          <nav className="seller-nav admin-nav" aria-label="Administrator workspace">
            <Link href="/admin/dashboard">Dashboard</Link>
            <Link href="/admin/listings">Review queue</Link>
            <Link href="/admin/profiles">Demo profiles</Link>
            <Link href="/admin/enquiries">Buyer enquiries</Link>
            <Link href="/admin/transactions">Transaction monitoring</Link>
            <NotificationIndicator actor={{ kind: "Admin", id: admin }} />
            <form action={lockAdminAction}><button type="submit" className="seller-secondary">Lock workspace</button></form>
          </nav>
        )}
        {children}
      </main>
    </>
  );
}
