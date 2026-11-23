"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { publicNotice } from "../lib/public-demo";
import { BrowserDemoProvider,useBrowserDemo } from "./browser-demo-context";
import { HomepageFooter } from "./homepage-content";
import { SiteHeader } from "./site-header";
export function PublicDemoFrame({children}:{children:ReactNode}){return <BrowserDemoProvider><Frame>{children}</Frame></BrowserDemoProvider>;}
function Frame({children}:{children:ReactNode}){
 const path=usePathname(),{reset}=useBrowserDemo();const workspace=/^\/(buyer|seller|admin)(?:\/|$)/.test(path);const active=path.startsWith("/buyer")?"buyer":path.startsWith("/seller")?"seller":path.startsWith("/admin")?"admin":path.startsWith("/explore")?"explore":path.startsWith("/verify")?"verify":path==="/about"?"about":"home";
 return <div id="home"><a href="#main-content" className="skip-link">Skip to content</a><SiteHeader activePage={active}/><main id="main-content" tabIndex={-1} className={workspace?"shell seller-workspace"+(active==="admin"?" admin-workspace":""):undefined}>{children}</main><HomepageFooter><div className="shell public-footer-tools"><p>{publicNotice}</p><p>Browser-only activity resets on refresh. No authentication, privileged administrator operations or real transactions.</p><button type="button" className="seller-secondary" onClick={reset}>Reset this tab’s simulation</button></div><nav className="shell public-workspace-nav" aria-label="Public demonstration workspaces"><Link href="/buyer/register">Buyer registration</Link><Link href="/seller/register">Seller registration</Link><Link href="/buyer/dashboard">Buyer workspace</Link><Link href="/seller/dashboard">Seller workspace</Link><Link href="/admin/dashboard">Administrator simulation</Link><Link href="/about">About BhuSutra</Link></nav></HomepageFooter></div>;
}
export function PublicDemoNotice({compact=false}:{compact?:boolean}){return <aside className={compact?"public-banner public-home-banner":"public-banner"} aria-label="Public demonstration limitations"><div className="shell"><strong>PUBLIC DEMO · Browser-only simulation</strong>{compact?<details><summary>Demo limitations</summary><p>{publicNotice}</p><p>Refresh resets all profiles, forms, checks, enquiries and coordination activity. Nothing is saved to a server.</p></details>:<p>{publicNotice} All activity stays in this tab’s memory.</p>}</div></aside>;}
