import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

globalThis.monitoringReact = React;
const jar = new Map();
jar.set = (key, value) => Map.prototype.set.call(jar, key, { value });
globalThis.adminMonitoringCookies = jar;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export const cookies = async () => globalThis.adminMonitoringCookies", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export const redirect = path => {throw new Error(path)}", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export const revalidatePath = () => {}", shortCircuit: true };
    if (specifier === "next/link") return { url: "data:text/javascript,export default function Link({href,children,...rest}) { return globalThis.monitoringReact.createElement('a',{...rest,href},children); }", shortCircuit: true };
    if (specifier.startsWith(".") && /\.tsx?$/.test(context.parentURL ?? "") && !/\.[a-z]+$/.test(specifier)) {
      for (const extension of [".ts", ".tsx"]) {
        const url = new URL(specifier + extension, context.parentURL);
        if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".tsx")) return {
      format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText,
    };
    return nextLoad(url, context);
  },
});
const directory = mkdtempSync(join(tmpdir(), "bhusutra-admin-monitoring-"));
const database = join(directory, "test.sqlite");
process.env.BHUSUTRA_DEMO_DB = database;
process.env.NODE_ENV = "development";
process.env.BHUSUTRA_DEMO_ADMIN = "1";
const fixtureKey = "fictional-admin-monitoring-test-value";
process.env.BHUSUTRA_DEMO_ADMIN_KEY = fixtureKey;
const { getAdministratorProfiles, getAdministratorEnquiries } = await import("../src/lib/admin-monitoring.ts");
const { unlockAdmin } = await import("../src/lib/admin-session.ts");
const { signAdminSession } = await import("../src/lib/admin-policy.ts");
const { signSellerCookie } = await import("../src/lib/seller-cookie.ts");
await unlockAdmin(fixtureKey);
const absentProfiles = await getAdministratorProfiles();
const absentEnquiries = await getAdministratorEnquiries();
const discoveryCreatedFile = existsSync(database);
jar.clear();
const sellers = await import("../src/lib/seller-store.ts");
const buyers = await import("../src/lib/buyer-store.ts");
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");
const profile = { displayName: "Monitoring Seller One", mobile: "0000012345", email: "contact-hidden@example.test", district: "Kamrup", sellerType: "Individual" };
const sellerOne = sellers.registerSeller(profile);
sellers.registerSeller({ ...profile, displayName: "Monitoring Seller Two" });
const one = buyers.registerBuyer({ ...profile, displayName: "Monitoring Buyer One", buyerType: "Individual" });
const two = buyers.registerBuyer({ ...profile, displayName: "Monitoring <Buyer Two>", buyerType: "Business" });
const listing = "monitoring-p15";
sellers.withDatabase(db => {
  const date = "2026-11-22T00:00:00Z";
  db.prepare("INSERT INTO listings VALUES (?, ?, 'P-15', 'Approved', ?, ?, ?, 0, ?, '')")
    .run(listing, sellerOne, date, date, date, JSON.stringify({ ...emptyListingDetails, consent: true, declaration: true, askingPrice: "1900000" }));
});
const enquiryOne = buyers.submitEnquiry(one, listing, "First fictional monitoring enquiry.");
const enquiryTwo = buyers.submitEnquiry(two, listing, "Second fictional <script>alert(1)</script> enquiry.");
buyers.changeEnquiry({ kind: "Seller", id: sellerOne }, enquiryOne, "Viewed");
buyers.changeEnquiry({ kind: "Seller", id: sellerOne }, enquiryOne, "Responded", "Fictional seller response.");
buyers.changeEnquiry({ kind: "Buyer", id: one }, enquiryOne, "Closed");
const ProfilesPage = (await import("../src/app/admin/profiles/page.tsx")).default;
const EnquiriesPage = (await import("../src/app/admin/enquiries/page.tsx")).default;
const DashboardPage = (await import("../src/app/admin/dashboard/page.tsx")).default;
const enquiriesPage = buyer => EnquiriesPage({ searchParams: Promise.resolve(buyer ? { buyer } : {}) });
const hash = () => createHash("sha256").update(readFileSync(database)).digest("hex");
const baseline = hash();

after(() => {
  assert.equal(hash(), baseline, "Administrator monitoring must leave every stored record unchanged");
  rmSync(database, { force: true });
  rmdirSync(directory);
});

test("authorized empty-store monitoring never initializes or seeds storage", () => {
  assert.deepEqual(absentProfiles, { sellers: [], buyers: [] });
  assert.deepEqual(absentEnquiries, []);
  assert.equal(discoveryCreatedFile, false);
});

test("pages and data functions reject guests and buyer/seller sessions", async () => {
  jar.clear();
  for (const role of ["guest", "buyer-session", "seller-session"]) {
    if (role !== "guest") {
      const token = signSellerCookie(role, one, Math.floor(Date.now() / 1000) + 600, fixtureKey);
      jar.set(role === "buyer-session" ? "bhusutra_demo_buyer_workspace" : "bhusutra_demo_seller", token);
      jar.set("bhusutra_demo_admin", token);
    }
    for (const operation of [getAdministratorProfiles, getAdministratorEnquiries, ProfilesPage, enquiriesPage, DashboardPage]) {
      await assert.rejects(operation(), /\/admin\/access/);
    }
    jar.clear();
  }
});

test("authorized directory includes all three sellers and two buyers without contact fields", async () => {
  await unlockAdmin(fixtureKey);
  const profiles = await getAdministratorProfiles();
  assert.equal(profiles.sellers.length, 3);
  assert.equal(profiles.buyers.length, 2);
  assert.deepEqual(new Set(profiles.buyers.map(row => row.id)), new Set([one, two]));
  for (const row of [...profiles.sellers, ...profiles.buyers]) assert.deepEqual(Object.keys(row).sort(), ["displayName", "district", "id", "profileType"]);
  const html = renderToStaticMarkup(await ProfilesPage());
  assert.match(html, /Demo sellers \(3\)/);
  assert.match(html, /Demo buyers \(2\)/);
  assert.doesNotMatch(html, /contact-hidden|0000012345/);
  assert.match(html, /Monitoring &lt;Buyer Two&gt;/);
  assert.ok(html.includes(`/admin/enquiries?buyer=${one}`));
  assert.ok(html.includes("/admin/listings?query=Monitoring%20Seller%20One"));
});

test("enquiry monitor preserves both statuses, parcel/listing references and full activity association", async () => {
  const enquiries = await getAdministratorEnquiries();
  assert.equal(enquiries.length, 2);
  const closed = enquiries.find(row => row.id === enquiryOne);
  const submitted = enquiries.find(row => row.id === enquiryTwo);
  assert.equal(closed.status, "Closed");
  assert.deepEqual(closed.events.map(event => event.newStatus), ["Submitted", "Viewed", "Responded", "Closed"]);
  assert.equal(closed.events[2].message, "Fictional seller response.");
  assert.equal(submitted.status, "Submitted");
  assert.equal(submitted.events.length, 1);
  assert.ok(enquiries.every(row => row.parcelId === "P-15" && row.listingId === listing));
  const html = renderToStaticMarkup(await enquiriesPage());
  assert.match(html, /2 saved enquiries/);
  for (const value of [enquiryOne, enquiryTwo, listing, "P-15", "Buyer enquiry monitoring", "Enquiry audit history (4)"]) assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /<form\b|Close enquiry|contact-hidden|0000012345/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert/);
});

test("dashboard cards navigate to protected destinations and existing monitoring pages", async () => {
  const html = renderToStaticMarkup(await DashboardPage());
  for (const [label, href] of [
    ["Demo sellers / buyers", "/admin/profiles"], ["Buyer enquiries", "/admin/enquiries"],
    ["Pending listing reviews", "/admin/listings"], ["Active assistance", "/admin/transactions"],
    ["Coordination follow-ups", "/admin/transactions?followup=pending"], ["Unread updates", "/admin/notifications"],
  ]) assert.ok(html.includes(`<a href="${href}">${label}</a>`), label);
  const css = readFileSync("src/app/presentation.css", "utf8");
  assert.match(css, /\.dashboard-metric dt a::after\s*\{[^}]*position: absolute;[^}]*inset: 0;/);
  assert.match(css, /\.dashboard-metric:has\(a:focus-visible\)/);
  assert.match(renderToStaticMarkup(await ProfilesPage()), /Demo sellers and buyers/);
  assert.match(renderToStaticMarkup(await enquiriesPage()), /Buyer enquiry monitoring/);
});

test("buyer links filter the saved enquiries with bound parameters and clear navigation", async () => {
  const rows = await getAdministratorEnquiries(one);
  assert.deepEqual(rows.map(row => row.id), [enquiryOne]);
  assert.deepEqual(await getAdministratorEnquiries("' OR 1=1 --"), []);
  assert.deepEqual(await getAdministratorEnquiries("missing-buyer"), []);
  const html = renderToStaticMarkup(await enquiriesPage(two));
  assert.ok(html.includes(enquiryTwo));
  assert.ok(!html.includes(enquiryOne));
  assert.match(html, /href="\/admin\/enquiries">Show all enquiries/);
  assert.match(renderToStaticMarkup(await enquiriesPage("missing-buyer")), /No saved enquiries match this view/);
});

test("expired, forged and production administrator access cannot read the new views", async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const token of ["forged.admin.cookie", signAdminSession(fixtureKey, now - 1)]) {
    jar.set("bhusutra_demo_admin", token);
    await assert.rejects(getAdministratorProfiles(), /\/admin\/access/);
    await assert.rejects(enquiriesPage(), /\/admin\/access/);
  }
  await unlockAdmin(fixtureKey);
  process.env.NODE_ENV = "production";
  try {
    for (const operation of [getAdministratorProfiles, getAdministratorEnquiries, ProfilesPage, enquiriesPage]) await assert.rejects(operation(), /\/admin\/access/);
  } finally { process.env.NODE_ENV = "development"; }
  assert.equal(hash(), baseline);
  assert.equal(sellers.getApprovedListings().find(row => row.parcelId === "P-15").listingId, listing);
});
