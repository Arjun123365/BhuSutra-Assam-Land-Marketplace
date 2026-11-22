import assert from "node:assert/strict";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export const cookies = async () => globalThis.verificationTestCookies", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export const revalidatePath = () => {}", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export const redirect = path => {throw new Error(path)}", shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) {
      return nextResolve(specifier + ".ts", context);
    }
    return nextResolve(specifier, context);
  },
});

const temporary = mkdtempSync(join(tmpdir(), "bhusutra-buyer-checklist-"));
const path = join(temporary, "test.sqlite");
process.env.BHUSUTRA_DEMO_DB = path;

const { registerBuyer } = await import("../src/lib/buyer-store.ts");
const { getBuyerCheckHistory, saveBuyerCheck } = await import("../src/lib/due-diligence-store.ts");
const { getVerificationRecord } = await import("../src/lib/verification-service.ts");
const { getParcelVerification, demonstrationReportWatermark } = await import("../src/lib/verification-model.ts");
const { assessDueDiligence, riskNotice } = await import("../src/lib/due-diligence.ts");
const { governmentCheckIds } = await import("../src/lib/parcel-records.ts");
const { saveBuyerCheckAction } = await import("../src/app/verify-records/actions.ts");
const { continueBuyerVerificationAction } = await import("../src/app/buyer/actions.ts");
const { GET } = await import("../src/app/verify-records/report/[parcelId]/route.ts");
const { currentBuyer, setDemoBuyer } = await import("../src/lib/buyer-session.ts");
const { signSellerCookie } = await import("../src/lib/seller-cookie.ts");
const { ensureSigningKey, withDatabase, getApprovedListings } = {
  ...await import("../src/lib/seller-session.ts"),
  ...await import("../src/lib/seller-store.ts"),
};
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");

const jar = new Map();
globalThis.verificationTestCookies = jar;
const buyerData = { displayName: "Fictional Buyer", mobile: "0000012345", email: "", district: "Kamrup", buyerType: "Individual" };
const alice = registerBuyer(buyerData);
const bob = registerBuyer({ ...buyerData, displayName: "Fictional Second Buyer" });
const form = (status) => {
  const fields = new FormData();
  fields.set("status", status);
  fields.set("buyerId", alice);
  return fields;
};
const report = (parcelId) => GET(new Request("http://localhost/verify-records/report/" + parcelId), { params: Promise.resolve({ parcelId }) });
const review = async (parcelId, buyerId) => {
  const { parcel, records } = await getVerificationRecord(parcelId);
  return assessDueDiligence(getParcelVerification(parcel, records), getBuyerCheckHistory(buyerId, parcelId));
};

after(() => {
  rmSync(path, { force: true });
  rmSync(path + ".session-key", { force: true });
  rmdirSync(temporary);
});

test("signed sessions scope writes even when a different buyer ID is submitted", async () => {
  assert.ok((await saveBuyerCheckAction("P-15", "ownership", {}, form("Completed"))).error);
  const legacyName = "bhusutra_demo_buyer";
  const workspaceName = "bhusutra_demo_buyer_workspace";
  jar.set(legacyName, { value: signSellerCookie("buyer-session", alice, Math.floor(Date.now() / 1000) + 60, ensureSigningKey()) });
  assert.equal((await currentBuyer()).id, alice);
  const continuation = new FormData();
  continuation.set("parcelId", "P-15");
  const originalSet = jar.set;
  const setCookies = new Map();
  jar.set = (name, value, settings) => {
    setCookies.set(name, settings);
    return originalSet.call(jar, name, { value });
  };
  try {
    await assert.rejects(continueBuyerVerificationAction(continuation), /\/verify-records\?parcel=P-15/);
    assert.equal(setCookies.get(workspaceName).path, "/");
    assert.equal(setCookies.get(workspaceName).httpOnly, true);
    assert.equal(setCookies.get(legacyName).maxAge, 0);
    assert.equal((await currentBuyer()).id, alice);
    await assert.rejects(saveBuyerCheckAction("P-15", "ownership", {}, form("In Progress")), /\/verify-records\?parcel=P-15/);
    await assert.rejects(saveBuyerCheckAction("P-15", "ownership", {}, form("Completed")), /\/verify-records\?parcel=P-15/);
    await assert.rejects(saveBuyerCheckAction("P-15", "ownership", {}, form("Completed")), /\/verify-records\?parcel=P-15/);
    await setDemoBuyer(bob);
    await assert.rejects(saveBuyerCheckAction("P-15", "ownership", {}, form("In Progress")), /\/verify-records\?parcel=P-15/);
    assert.ok((await saveBuyerCheckAction("P-15", "invented", {}, form("Completed"))).error);
    assert.ok((await saveBuyerCheckAction("P-99", "ownership", {}, form("Completed"))).error);
    assert.ok((await saveBuyerCheckAction("P-15", "ownership", {}, form("Officially confirmed"))).error);
    assert.throws(() => saveBuyerCheck("missing-buyer", "P-15", "ownership", "Completed"), /active demo buyer/);
  } finally {
    jar.set = originalSet;
    jar.clear();
  }
  const history = getBuyerCheckHistory(alice, "P-15");
  assert.deepEqual(history.map(event => [event.previousStatus, event.status]), [["In Progress", "Completed"], ["Not Started", "In Progress"]]);
  assert.ok(history.every(event => !Number.isNaN(Date.parse(event.recordedAt))));
  assert.deepEqual(getBuyerCheckHistory(bob, "P-15").map(event => event.status), ["In Progress"]);
  assert.deepEqual(getBuyerCheckHistory(alice, "P-14"), []);
});

test("completed buyer review leaves official gaps and synthetic restrictions unchanged", async () => {
  withDatabase(db => {
    const details = { ...emptyListingDetails, declaration: true, consent: true, askingPrice: "2200000" };
    const date = "2026-11-18T04:00:00Z";
    db.prepare("INSERT INTO listings VALUES ('public-p15', 'demo-seeded-seller', 'P-15', 'Approved', ?, ?, ?, 0, ?, 'Published P-15')")
      .run(date, date, date, JSON.stringify(details));
  });
  assert.equal((await review("P-14", alice)).buyerStatus, "Not Started");
  assert.equal((await review("P-15", alice)).buyerStatus, "In Progress");
  for (const id of governmentCheckIds) saveBuyerCheck(alice, "P-15", id, "Completed");
  const finished = await review("P-15", alice);
  assert.equal(finished.buyerStatus, "Completed");
  assert.equal(finished.completedCount, 8);
  assert.equal(finished.pending.length, 0);
  assert.equal(finished.unavailable.length, 8);
  assert.ok(finished.observations.some(({ id }) => id === "seller"));
  assert.ok(finished.recommendations.length >= 8);
  assert.equal((await review("P-07", alice)).riskIndicator, "Demo restriction flag for follow-up");
  assert.ok(getApprovedListings().some(listing => listing.parcelId === "P-15"));
});

test("report includes only the active buyer's history and public guests see no private data", async () => {
  const publicHtml = await (await report("P-15")).text();
  assert.ok(publicHtml.includes(demonstrationReportWatermark));
  assert.ok(publicHtml.includes(riskNotice));
  assert.doesNotMatch(publicHtml, /In Progress → Completed|Buyer workspace status/);
  const setWorkspace = (id) => jar.set("bhusutra_demo_buyer_workspace", {
    value: signSellerCookie("buyer-session", id, Math.floor(Date.now() / 1000) + 60, ensureSigningKey()),
  });
  setWorkspace(alice);
  const response = await report("P-15");
  const personalHtml = await response.text();
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  for (const label of ["Buyer workspace status · Completed", "Outstanding verification items", "Rule-based risk observations", "Verification history", "In Progress → Completed", "Recommended next steps"]) assert.ok(personalHtml.includes(label), label);
  assert.doesNotMatch(personalHtml, /Fictional Buyer|Government-record verified/);
  setWorkspace(bob);
  const otherHtml = await (await report("P-15")).text();
  assert.match(otherHtml, /Buyer workspace status · In Progress/);
  assert.doesNotMatch(otherHtml, /In Progress → Completed|Buyer workspace status · Completed/);
  jar.clear();
});
