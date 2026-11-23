import Link from "next/link";
import type { ReactNode } from "react";

export function WorkspaceContent({ role, name, children, publicMode = false, notifications, switcher, lock, enabled = true }: { role: "Buyer" | "Seller" | "Admin"; name?: string; children: ReactNode; publicMode?: boolean; notifications?: ReactNode; switcher?: ReactNode; lock?: ReactNode; enabled?: boolean }) {
  const base = "/" + role.toLowerCase();
  return <>
    {role === "Admin" ? <div className="admin-banner"><strong>DEMO ADMINISTRATOR — NOT AN OFFICIAL GOVERNMENT USER</strong><p>NESFIC Demonstration Prototype. Decisions control demo marketplace publication only.{publicMode && " Public simulation only; no privileged administrator access."}</p></div> : <p className="seller-notice"><strong>NESFIC Demonstration Prototype.</strong> {publicMode ? "Use fictional information only. Profiles, messages, checks and workflow activity stay in this tab's memory and reset on refresh. Starter listings are public synthetic fixtures, not private account history. No authentication or Government verification occurs." : role === "Buyer" ? "Buyer profiles, enquiries and seller responses use synthetic data. This is a local demo session without real identity verification. Use fictional information only." : "Use fictional details only. Demo profiles are browser sessions on this local installation and provide no secure authentication or access control. Government verification is unavailable."}</p>}
    {enabled && <nav className={role === "Admin" ? "seller-nav admin-nav" : "seller-nav"} aria-label={role === "Admin" ? "Administrator workspace" : role + " workspace"}>
      <Link href={base + "/dashboard"}>{role === "Admin" ? "Dashboard" : role + " dashboard"}</Link>
      {role === "Admin" ? <><Link href="/admin/listings">Review queue</Link><Link href="/admin/profiles">Demo profiles</Link><Link href="/admin/enquiries">Buyer enquiries</Link><Link href="/admin/transactions">Transaction monitoring</Link></> : <><Link href={base + "/transactions"}>Transaction assistance</Link>{role === "Buyer" ? <Link href="/#featured">Browse approved listings</Link> : <Link href="/seller/list-property">List property</Link>}<Link href={base + "/register"}>Register</Link></>}
      {notifications}{switcher}{lock}
    </nav>}
    {role === "Seller" && <p className="seller-active"><strong>Active demo seller</strong> {name ?? "No profile selected"}</p>}
    {publicMode && <p className="workspace-eyebrow">Browser-only simulation · never saved to the server</p>}
    {children}
  </>;
}
