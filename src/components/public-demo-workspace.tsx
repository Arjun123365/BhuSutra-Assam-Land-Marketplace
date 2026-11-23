"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { SiteHeader } from "./site-header";
import { HomepageFooter } from "./homepage-content";
import { ParcelVerification } from "./parcel-verification";
import { ParcelMap } from "./parcel-map-loader";
import { getGovernmentRecordSections, disconnectedGovernmentRecords } from "../lib/parcel-records";
import { demoStages, emptyPublicState, publicNotice, publicParcels, publicListings, updatePublicDemo, type PublicAction, type PublicDemoState } from "../lib/public-demo";
import { formatIndicativePrice } from "../lib/demo-marketplace";

let memory = "";
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function snapshot() { return memory; }
function serverSnapshot() { return ""; }
const Simulation = createContext<{ state: PublicDemoState; act: (action: PublicAction) => void }>({ state: emptyPublicState, act: () => {} });

// State stays in this browser tab. No cookies, identity data, server actions or fetches.
export function PublicDemoFrame({ children }: { children: React.ReactNode }) {
  const homepage = usePathname() === "/";
  const serialized = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const state = useMemo(() => serialized ? JSON.parse(serialized) as PublicDemoState : emptyPublicState, [serialized]);
  function act(action: PublicAction) {
    memory = JSON.stringify(updatePublicDemo(state, action, new Date().toISOString()));
    listeners.forEach(listener => listener());
  }
  const navigation = <nav className="shell public-workspace-nav" aria-label="Public demonstration workspaces"><Link href="/seller/dashboard">Seller preview</Link><Link href="/buyer/dashboard">Buyer preview</Link><Link href="/admin/dashboard">Administrator simulation</Link><Link href="/buyer/transactions">Transaction assistance</Link><Link href="/buyer/notifications">Activity & notifications</Link></nav>;
  return <Simulation.Provider value={{ state, act }}><div id="home">
    <a href="#main-content" className="skip-link">Skip to content</a><SiteHeader />
    {!homepage && <><PublicDemoNotice />{navigation}</>}
    <main id="main-content" tabIndex={-1}>{children}</main>
    <HomepageFooter>
      <div className="shell public-footer-tools"><p>{publicNotice}</p><p>Nothing is saved to a server. This tab’s simulated activity resets on refresh.</p><button type="button" onClick={() => { memory = ""; listeners.forEach(listener => listener()); }}>Reset this tab’s simulation</button></div>
      {homepage && navigation}
    </HomepageFooter>
  </div></Simulation.Provider>;
}

export function PublicDemoNotice({ compact = false }: { compact?: boolean }) {
  return <aside className={compact ? "public-banner public-home-banner" : "public-banner"} aria-label="Public demonstration limitations"><div className="shell">
    <strong>PUBLIC DEMO · Browser-only simulation</strong>
    {compact ? <details><summary>Demo limitations</summary><p>{publicNotice}</p><p>No saved transactions, real accounts, contact exchange, payments or Government integration. Refresh resets this tab’s activity.</p></details> : <><p>{publicNotice}</p><p>Nothing is saved to a server. No real accounts, contact exchange, approvals, payments or transactions. This tab’s simulated activity resets on refresh.</p></>}
  </div></aside>;
}

export function PublicWorkspace({ section, parcelId }: { section: string; parcelId: string }) {
  const { state, act } = useContext(Simulation);
  const router = useRouter();
  const parcel = publicParcels.find(p => p.id === parcelId) ?? publicParcels.find(p => p.id === "P-15")!;
  const id = parcel.id;
  const listing = publicListings.find(p => p.id === id);
  const checks = state.checks[id] ?? [];
  const records = getGovernmentRecordSections(disconnectedGovernmentRecords(id));
  const stage = state.transactions[id];
  function report() {
    const text = ["BhuSutra — NESFIC PUBLIC DEMONSTRATION", "DEMONSTRATION ONLY — NOT AN OFFICIAL GOVERNMENT LAND RECORD, SALE AGREEMENT OR LEGAL CLEARANCE.", publicNotice, `${id} · ${parcel.district} → ${parcel.circle}`, `${parcel.dagNumber} / ${parcel.pattaNumber} · ${parcel.area} ${parcel.areaUnit}`, `Seller-declared price: ${listing ? formatIndicativePrice(listing.price) : "Not listed"}`, `Buyer-marked checks: ${checks.length}/8; all official sources: Not connected / Not verified`, `Coordination: ${stage === undefined ? "Not started" : stage < 0 ? "Cancelled" : demoStages[stage]}`, "Outstanding checks:", ...records.filter(r => !checks.includes(r.id)).map(r => r.label + ": " + r.nextStep), "Browser-only activity (not a persisted audit record):", ...state.events].join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `BhuSutra-DEMO-${id}.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const headings: Record<string, string> = { buyer: "Buyer Dashboard", seller: "Seller Dashboard", listing: "Simulate a voluntary listing", admin: "Administrator coordination preview", transactions: "Transaction assistance simulation", notifications: "Notifications and activity history", verify: "Land Verification Dashboard", parcel: "Synthetic parcel record" };
  return <div className="shell public-workspace"><h1>{headings[section]}</h1><p className="public-muted">Public presentation personas only · No access to local buyer, seller or administrator accounts.</p><div className="public-toolbar"><label>Demo parcel <select value={id} onChange={event => { const base = section === "parcel" ? "/verify-records" : location.pathname; router.push(base + "?parcel=" + event.target.value); }}>{publicParcels.map(p => <option key={p.id} value={p.id}>{p.id} · {p.district} · {p.circle}</option>)}</select></label><Link href={`/explore?parcel=${id}`}>Back to Map</Link><Link href={`/verify-records?parcel=${id}`}>Buyer due diligence</Link><button onClick={report}>Download demo summary (.txt)</button></div>
    <section className="public-card"><h2>{id} · {parcel.district} → {parcel.circle}</h2><dl className="public-facts"><div><dt>Dag / Patta · synthetic</dt><dd>{parcel.dagNumber} / {parcel.pattaNumber}</dd></div><div><dt>Classification / Patta type</dt><dd>{parcel.category} / {parcel.pattaType}</dd></div><div><dt>Area · synthetic</dt><dd>{parcel.area} {parcel.areaUnit}</dd></div><div><dt>Seller-declared indicative price</dt><dd>{listing ? formatIndicativePrice(listing.price) : "Not listed"}</dd></div><div><dt>Public snapshot listing</dt><dd>{listing ? "Approved for demo publication · voluntary listing consent" : "Not published"}</dd></div><div><dt>Government status</dt><dd>Not connected / Not verified</dd></div></dl><p>Illustrative demo map — not an official cadastral map. Publication does not certify legal title.</p></section>
    {(section === "parcel" || section === "verify") && <><div className="public-context-map"><ParcelMap parcels={[parcel]} selectedId={id} onSelect={() => {}} focusRequest={{ parcelId: id }} /></div><ParcelVerification parcel={parcel} /><section className="public-card"><h2>Buyer due-diligence simulation</h2><p>{checks.length} buyer-completed checks · {8 - checks.length} pending · 8 unavailable official verifications</p><p>Checking an item records only a simulated buyer action. Unavailable records are information gaps, not evidence of a dispute.</p>{records.map(check => <div className="public-check" key={check.id} data-complete={checks.includes(check.id)}><label><input type="checkbox" checked={checks.includes(check.id)} onChange={() => act({ type: "check", parcelId: id, checkId: check.id })} />{check.label}</label><span>Official source: Not connected / Not verified</span><p>{check.nextStep}</p></div>)}<h3>Rule-based observations</h3><p>Ownership, encumbrances, revenue dues, court checks and zonal valuation remain unavailable. Seller declarations need independent verification.</p><p>{parcel.restriction ? `Synthetic review flag: ${parcel.restriction}` : "No synthetic restriction flag recorded; this does not establish legal clearance."}</p></section></>}
    {section === "buyer" && <section className="public-card"><h2>Public Demo Buyer · fictional presentation persona</h2><p>No registration or personal information is required. This preview cannot access existing local buyer records.</p>{listing ? <><button disabled={state.enquiries.includes(id)} onClick={() => act({ type: "interest", parcelId: id })}>{state.enquiries.includes(id) ? "Demo enquiry submitted" : "Simulate Express Interest"}</button><Link href={`/buyer/transactions?parcel=${id}`}>Explore transaction assistance</Link></> : <p>Enquiries are unavailable: this parcel has no approved public demo listing.</p>}<h3>This tab’s enquiries ({state.enquiries.length})</h3>{state.enquiries.length ? state.enquiries.map(p => <p key={p}>{p} · {state.responses.includes(p) ? "Responded — Demonstration response: please arrange independent document review." : "Submitted — awaiting simulated seller response"}</p>) : <p>No simulated enquiries yet.</p>}</section>}
    {(section === "seller" || section === "listing") && <section className="public-card"><h2>Public Demo Seller · fictional presentation persona</h2><p>Existing local seller profiles and private listings are not deployed.</p><h3>Voluntary listing preview · P-16</h3><p>This sample creates no saved listing and does not change the published parcel snapshot.</p><button onClick={() => act({ type: "draft", parcelId: "P-16" })}>Simulate Save Draft</button><button disabled={!state.draft || state.submitted} onClick={() => act({ type: "submit", parcelId: "P-16" })}>Simulate Submit for Review</button><p role="status">{state.approved ? "Simulated publication approved" : state.submitted ? "Simulated submission awaiting administrator review" : state.draft ? "Draft held in this tab only" : "No simulated draft"}</p><Link href="/admin/dashboard">View administrator simulation</Link><h3>Enquiry management</h3>{state.enquiries.length ? state.enquiries.map(p => <div key={p}><p>{p} · Public Demo Buyer · {state.responses.includes(p) ? "Responded" : "Submitted"}</p><button disabled={state.responses.includes(p)} onClick={() => act({ type: "respond", parcelId: p })}>Send preset demonstration response</button></div>) : <p>No enquiries in this tab. Start in the Buyer preview.</p>}</section>}
    {section === "admin" && <section className="public-card"><h2>Public, non-privileged coordination simulation</h2><p>This screen is an interactive presentation. It is not an authenticated administrator dashboard and exposes no local accounts or records.</p><div className="public-summary"><strong>{publicParcels.length} synthetic parcels</strong><strong>{publicListings.length} snapshot listings</strong><strong>{state.enquiries.length} tab enquiries</strong><strong>{Object.keys(state.transactions).length} tab requests</strong></div><h3>Listing review preview · P-16</h3><p>{state.submitted ? "Voluntary demonstration submission ready for presentation review." : "No simulated submission. Use Seller preview to draft and submit."}</p><button disabled={!state.submitted || state.approved} onClick={() => act({ type: "approve", parcelId: "P-16" })}>Simulate publication review approval</button><p>Publication review is never Government title certification. P-15 and the public listing snapshot remain unchanged.</p><h3>District distribution · actual synthetic geometry counts</h3>{["Jorhat", "Kamrup", "Dibrugarh"].map(d => <p key={d}>{d}: {publicParcels.filter(p => p.district === d).length} parcels</p>)}<h3>This tab’s coordination monitoring</h3>{Object.entries(state.transactions).map(([p, s]) => <p key={p}>{p} · {s < 0 ? "Cancelled" : demoStages[s]}</p>)}</section>}
    {section === "transactions" && <section className="public-card"><h2>Assisted coordination · {id}</h2><p>No sale agreement, booking, payment or ownership transfer is created. Buyer and seller actions below are guided simulation steps, not authenticated role actions.</p>{stage === undefined ? <button disabled={!listing} onClick={() => act({ type: "start", parcelId: id })}>Simulate assistance request</button> : <><p role="status">Public reference DEMO-{id} · {stage < 0 ? "Cancelled" : demoStages[stage]}</p><ol className="public-progress">{demoStages.map((s, i) => <li key={s} aria-current={stage === i ? "step" : undefined} data-complete={stage >= i}>{s} <small>{i < 3 ? "Buyer / seller coordination" : "Independent review required"}</small></li>)}</ol><button disabled={stage < 0 || stage >= 7} onClick={() => act({ type: "advance", parcelId: id })}>Simulate next coordination step</button><button disabled={stage < 0 || stage >= 7} onClick={() => act({ type: "cancel", parcelId: id })}>Cancel simulated request</button></>}<p>Checklist completion cannot establish transaction eligibility. Complete independent identity, ownership, Dag/Patta, encumbrance, revenue, court, permissions, legal and registration checks through authorised professionals.</p></section>}
    <section className="public-card"><h2>Activity & in-app notifications · this tab only</h2><p>No SMS, email or external messages are sent. Refresh clears this simulated timeline.</p>{state.events.length ? <ol>{state.events.slice().reverse().map((event, index) => <li key={index}>{event}</li>)}</ol> : <p>No browser simulation activity yet.</p>}</section>
  </div>;
}
