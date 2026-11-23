import type { Metadata } from "next";
import { NotificationIndicator } from "../../components/assistance/notifications";
import { SiteHeader } from "../../components/site-header";
import { WorkspaceContent } from "../../components/workspace-content";
import { currentAdmin } from "../../lib/admin-session";
import "../seller/seller.css";
import { lockAdminAction } from "./actions";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demo administrator | BhuSutra" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader activePage="admin" />
      <main id="main-content" tabIndex={-1} className="shell seller-workspace admin-workspace">
        <WorkspaceContent role="Admin" enabled={!!admin} notifications={admin ? <NotificationIndicator actor={{kind:"Admin",id:admin}} /> : undefined} lock={<form action={lockAdminAction}><button type="submit" className="seller-secondary">Lock workspace</button></form>}>{children}</WorkspaceContent>
      </main>
    </>
  );
}
