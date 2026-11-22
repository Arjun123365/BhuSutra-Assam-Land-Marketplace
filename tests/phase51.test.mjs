import assert from "node:assert/strict";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export const cookies = async () => globalThis.assistanceTestCookies", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export const revalidatePath = () => {}", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export const redirect = path => {throw new Error(path)}", shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) {
      return nextResolve(specifier + ".ts", context);
    }
    return nextResolve(specifier, context);
  },
});

const temporary = mkdtempSync(join(tmpdir(), "bhusutra-assistance-"));
const path = join(temporary, "test.sqlite");
process.env.BHUSUTRA_DEMO_DB = path;
const { assistanceChecklist, assistanceWatermark, preparedChecks } = await import("../src/lib/assistance.ts");
const { getAssistance, getAssistanceStart, listAssistance, startAssistance, updateAssistance } = await import("../src/lib/assistance-store.ts");
const { registerBuyer, submitEnquiry } = await import("../src/lib/buyer-store.ts");
const { setDemoBuyer } = await import("../src/lib/buyer-session.ts");
const { saveBuyerCheck } = await import("../src/lib/due-diligence-store.ts");
const { setDemoSeller } = await import("../src/lib/seller-session.ts");
const { registerSeller, withDatabase, getApprovedListings } = await import("../src/lib/seller-store.ts");
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");
const { demoParcels } = await import("../src/lib/demo-marketplace.ts");
const { startAssistanceAction, updateAssistanceAction } = await import("../src/app/assistance-actions.ts");
const { GET: buyerReport } = await import("../src/app/buyer/transactions/[reference]/report/route.ts");
const { GET: sellerReport } = await import("../src/app/seller/transactions/[reference]/report/route.ts");

const jar = new Map();
jar.set = (key, value) => Map.prototype.set.call(jar, key, { value });
globalThis.assistanceTestCookies = jar;
const registerDemoBuyer = name => ({ kind: "Buyer", id: registerBuyer({
  displayName: name, mobile: "0000012345", email: "buyer@fixture.test", district: "Kamrup", buyerType: "Individual",
}) });
const registerDemoSeller = name => ({ kind: "Seller", id: registerSeller({
  displayName: name, mobile: "0000054321", email: "seller@fixture.test", district: "Kamrup", sellerType: "Individual",
}) });
const buyer = registerDemoBuyer("Fixture <Buyer>");
const otherBuyer = registerDemoBuyer("Other Buyer");
const directBuyer = registerDemoBuyer("Direct Buyer");
const seller = registerDemoSeller("Fixture Seller");
const otherSeller = registerDemoSeller("Other Seller");
const details = { ...emptyListingDetails, declaration: true, consent: true, askingPrice: "2200000" };
const date = "2026-11-18T04:00:00Z";
const listing = "published-p15";
withDatabase(db => {
  const insert = db.prepare("INSERT INTO listings VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Fixture listing')");
  insert.run(listing, seller.id, "P-15", "Approved", date, date, date, JSON.stringify(details));
  insert.run("draft-p14", seller.id, "P-14", "Draft", date, date, null, JSON.stringify(details));
  insert.run("flag-p07", seller.id, "P-07", "Approved", date, date, date, JSON.stringify(details));
  insert.run("no-consent", seller.id, "P-08", "Approved", date, date, date, JSON.stringify({ ...details, consent: false }));
});
const enquiry = submitEnquiry(buyer.id, listing, "Fictional enquiry");
saveBuyerCheck(buyer.id, "P-15", "ownership", "Completed");

after(() => {
  rmSync(path, { force: true });
  rmSync(path + ".session-key", { force: true });
  rmdirSync(temporary);
});

const action = (actor, reference, id) => updateAssistance(actor, reference, { action: id });
const mark = (actor, reference, check, completed = true) => updateAssistance(actor, reference, { check, completed });
const existingTables = ["sellers", "seller_consent", "listings", "listing_audit", "buyers", "buyer_enquiries", "enquiry_audit", "buyer_check_history"];
const snapshot = () => withDatabase(db => Object.fromEntries(existingTables.map(name => [name, db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()])));

test("eligible initiation is idempotent and additive, preserves earlier data and binds the buyer enquiry", () => {
  const before = snapshot();
  assert.equal(demoParcels.length, 17);
  for (const id of ["draft-p14", "flag-p07", "no-consent", "unknown"]) assert.throws(() => startAssistance(buyer.id, id), /currently published/);
  assert.throws(() => startAssistance("missing-buyer", listing), /active demo buyer/);
  assert.equal(getAssistanceStart(listing, otherBuyer.id).hasEnquiry, false);
  assert.equal(getAssistanceStart(listing, buyer.id).hasEnquiry, true);
  assert.deepEqual(listAssistance(buyer), []);
  const reference = startAssistance(buyer.id, listing);
  assert.match(reference, /^TX-[0-9a-f-]+$/);
  assert.equal(startAssistance(buyer.id, listing), reference);
  assert.equal(getAssistanceStart(listing, buyer.id).activeReference, reference);
  assert.deepEqual(withDatabase(db => db.prepare("SELECT enquiryId, buyerId FROM assistance_requests").all().map(row => [row.enquiryId, row.buyerId])), [[enquiry, buyer.id]]);
  const direct = startAssistance(directBuyer.id, "seed-P-03");
  assert.equal(getAssistance(directBuyer, direct).request.stage, "interest");
  assert.equal(withDatabase(db => db.prepare("SELECT enquiryId FROM assistance_requests WHERE reference = ?").get(direct).enquiryId), null);
  assert.equal(getAssistance(buyer, reference).events.length, 1);
  assert.equal(getAssistance(seller, reference).request.askingPrice, 2200000);
  assert.deepEqual(snapshot(), before);
  assert.ok(getApprovedListings().some(item => item.parcelId === "P-15"));
});

test("all ordered stages enforce ownership, role, checklist gates and an auditable terminal state", () => {
  const reference = startAssistance(buyer.id, listing);
  for (const outsider of [otherBuyer, otherSeller]) {
    assert.deepEqual(listAssistance(outsider), []);
    assert.equal(getAssistance(outsider, reference), undefined);
    assert.throws(() => action(outsider, reference, "cancel"), /active demo profile/);
  }
  assert.throws(() => action(buyer, reference, "start-documents"), /current stage/);
  markStage("interest");
  action(buyer, reference, "request-contact");
  markStage("contact");
  assert.throws(() => action(seller, reference, "accept"), /current stage/);
  action(seller, reference, "acknowledge");
  markStage("response");
  assert.throws(() => action(buyer, reference, "accept"), /current stage/);
  action(seller, reference, "accept");
  markStage("discussion");
  action(buyer, reference, "start-documents");
  markStage("documents");
  assert.throws(() => mark(seller, reference, "registration"), /current stage/);
  assert.throws(() => action(buyer, reference, "start-legal"), /preparation item/);
  for (const item of assistanceChecklist.filter(item => item.group === "documents")) mark(seller, reference, item.id);
  const historySize = getAssistance(buyer, reference).events.length;
  mark(seller, reference, "identity");
  assert.equal(getAssistance(buyer, reference).events.length, historySize);
  mark(buyer, reference, "identity", false);
  assert.throws(() => action(buyer, reference, "start-legal"), /preparation item/);
  mark(buyer, reference, "identity");
  action(buyer, reference, "start-legal");
  markStage("legal");
  assert.throws(() => action(buyer, reference, "refer"), /preparation item/);
  mark(buyer, reference, "legal");
  mark(seller, reference, "registration");
  action(buyer, reference, "refer");
  markStage("review");
  action(seller, reference, "close-seller");
  markStage("closed");
  assert.throws(() => action(buyer, reference, "cancel"), /current stage/);
  const { events } = getAssistance(seller, reference);
  assert.equal(preparedChecks(events).size, 9);
  assert.deepEqual(events.filter(event => event.toStage).map(event => event.toStage), ["interest", "contact", "response", "discussion", "documents", "legal", "review", "closed"]);
  assert.ok(events.every(event => !Number.isNaN(Date.parse(event.recordedAt))));
  assert.ok(events.some(event => event.checkId === "identity" && event.completed === 0));

  function markStage(stage) {
    assert.equal(getAssistance(buyer, reference).request.stage, stage);
  }
});

test("decline, cancellation and publication pauses preserve prior requests", () => {
  const cancelled = startAssistance(buyer.id, listing);
  action(buyer, cancelled, "cancel");
  const declined = startAssistance(buyer.id, listing);
  assert.notEqual(declined, cancelled);
  action(buyer, declined, "request-contact");
  action(seller, declined, "decline");
  assert.equal(getAssistance(seller, declined).events.at(-1).activity, "Decline request");
  assert.equal(getAssistance(seller, declined).request.stage, "cancelled");

  const seeded = submitEnquiry(buyer.id, "seed-P-01", "Another fictional enquiry");
  assert.ok(seeded);
  const paused = startAssistance(buyer.id, "seed-P-01");
  // Simulate the loss of public consent on a disposable fixture. P-15 stays untouched.
  withDatabase(db => db.prepare("UPDATE listings SET details = json_set(details, '$.consent', 0) WHERE id = 'seed-P-01'").run());
  assert.equal(getAssistance(buyer, paused).published, false);
  assert.throws(() => action(buyer, paused, "request-contact"), /current stage/);
  action({ kind: "Seller", id: "demo-seeded-seller" }, paused, "close-unpublished");
  assert.equal(getAssistance(buyer, paused).request.stage, "closed");
  assert.ok(getApprovedListings().some(item => item.parcelId === "P-15"));
});

test("server actions and private reports derive ownership from signed role sessions", async () => {
  await assert.rejects(startAssistanceAction(listing), /\/buyer\/register/);
  await setDemoBuyer(buyer.id);
  const reference = startAssistance(buyer.id, listing);
  const requestReport = (handler) => handler(new Request("http://localhost/report"), { params: Promise.resolve({ reference }) });
  const form = new FormData();
  form.set("action", "request-contact");
  form.set("buyerId", otherBuyer.id);
  await assert.rejects(updateAssistanceAction("Buyer", reference, form), error => error.message === "/buyer/transactions/" + reference);
  assert.equal(getAssistance(buyer, reference).request.stage, "contact");

  const personal = await requestReport(buyerReport);
  assert.equal(personal.status, 200);
  assert.equal(personal.headers.get("cache-control"), "private, no-store");
  const html = await personal.text();
  for (const text of [assistanceWatermark, reference, "P-15", "Fixture &lt;Buyer&gt;", "Fixture Seller", "Seller Contact Requested", "Completed and pending activities", "Activity history"]) {
    assert.ok(html.includes(text), text);
  }
  assert.doesNotMatch(html, /fixture\.test|0000012345|0000054321|Fictional enquiry|<Buyer>|Government-record verified/);
  assert.equal((await requestReport(sellerReport)).status, 404);
  await setDemoSeller(otherSeller.id);
  assert.equal((await requestReport(sellerReport)).status, 404);
  await setDemoSeller(seller.id);
  assert.equal((await requestReport(sellerReport)).status, 200);
  await setDemoBuyer(otherBuyer.id);
  assert.equal((await requestReport(buyerReport)).status, 404);
  await assert.rejects(updateAssistanceAction("Buyer", reference, form), /notice=unavailable/);
  jar.clear();
  assert.equal((await requestReport(buyerReport)).status, 404);
});
