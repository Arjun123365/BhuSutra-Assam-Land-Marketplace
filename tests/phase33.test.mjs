import assert from "node:assert/strict";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) {
      return nextResolve(specifier + ".ts", context);
    }
    return nextResolve(specifier, context);
  },
});
const temporary = mkdtempSync(join(tmpdir(), "bhusutra-enquiries-"));
const path = join(temporary, "test.sqlite");
process.env.BHUSUTRA_DEMO_DB = path;
const sellers = await import("../src/lib/seller-store.ts");
const buyers = await import("../src/lib/buyer-store.ts");
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");
const { getPublicMarketplace } = await import("../src/lib/public-marketplace.ts");
const sellerId = sellers.registerSeller({ displayName: "Fictional Seller", district: "Kamrup", mobile: "0000012345", email: "", sellerType: "Individual" });
const buyerInfo = { displayName: "Fictional Buyer", district: "Kamrup", mobile: "0000054321", email: "buyer@example.test", buyerType: "Individual" };
const buyer = { kind: "Buyer", id: buyers.registerBuyer(buyerInfo) };
const otherBuyer = { kind: "Buyer", id: buyers.registerBuyer(buyerInfo) };
const seller = { kind: "Seller", id: sellerId };
const otherSeller = { kind: "Seller", id: sellers.seededSellerId };
const details = { ...emptyListingDetails, declaration: true, consent: true, askingPrice: "2200000", description: "Synthetic display fixture." };
const date = "2026-11-18T04:00:00Z";
const db = new DatabaseSync(path);
for (const [id, parcelId, status, overrides] of [
  ["published-p15", "P-15", "Approved", {}],
  ["draft-test", "P-04", "Draft", {}],
  ["submitted-test", "P-05", "Submitted", {}],
  ["rejected-test", "P-06", "Rejected", {}],
  ["previously-withdrawn-fixture", "P-08", "Withdrawn", {}],
  ["invalid-approved", "P-07", "Approved", {}],
  ["no-consent-approved", "P-09", "Approved", {consent:false}],
]) {
  db.prepare("INSERT INTO listings VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, '')")
    .run(id, sellerId, parcelId, status, date, date, date, JSON.stringify({ ...details, ...overrides }));
}
db.close();

after(() => {
  rmSync(path, { force: true });
  rmdirSync(temporary);
});

test("buyer registration is durable and actor cookie purposes cannot be reused", async () => {
  assert.deepEqual({ ...buyers.getBuyer(buyer.id) }, { ...buyerInfo, id: buyer.id, consentedAt: buyers.getBuyer(buyer.id).consentedAt });
  assert.match(buyers.getBuyer(buyer.id).consentedAt, /^\d{4}-\d\d-\d\dT/);
  const { signSellerCookie, verifySellerCookie } = await import("../src/lib/seller-cookie.ts");
  const token = signSellerCookie("buyer-session", buyer.id, 1060, "isolated test signing key");
  assert.equal(verifySellerCookie("buyer-session", token, "isolated test signing key", 1000), buyer.id);
  assert.equal(verifySellerCookie("seller-session", token, "isolated test signing key", 1000), undefined);
  assert.equal(verifySellerCookie("buyer-session", buyer.id, "isolated test signing key", 1000), undefined);
  assert.equal(verifySellerCookie("buyer-session", token, "isolated test signing key", 1060), undefined);
});

test("only a currently published listing accepts enquiries", () => {
  assert.equal(getPublicMarketplace().listings.find(row => row.id === "P-15").listingId, "published-p15");
  for (const id of ["draft-test", "submitted-test", "rejected-test", "previously-withdrawn-fixture", "invalid-approved", "no-consent-approved", "unknown"]) {
    assert.throws(() => buyers.submitEnquiry(buyer.id, id, "Fictional enquiry"), /not currently published/);
  }
  assert.throws(() => buyers.submitEnquiry(buyer.id, "published-p15", " "), /message/);
});

test("P-15 enquiry has unique active reservation, private ownership and audited transitions", () => {
  const id = buyers.submitEnquiry(buyer.id, "published-p15", "Please share synthetic parcel details.");
  assert.throws(() => buyers.submitEnquiry(buyer.id, "published-p15", "Duplicate"), /already have an active enquiry/);
  assert.equal(buyers.getEnquiries(buyer)[0].status, "Submitted");
  assert.deepEqual(buyers.getEnquiries(otherBuyer), []);
  assert.deepEqual(buyers.getEnquiries(otherSeller), []);
  const enquiry = buyers.getEnquiries(seller)[0];
  assert.equal(enquiry.parcelId, "P-15");
  assert(!JSON.stringify(enquiry).includes(buyerInfo.email));
  for (const [actor, status] of [[otherSeller, "Viewed"], [otherBuyer, "Closed"], [buyer, "Viewed"], [seller, "Responded"]]) {
    assert.throws(() => buyers.changeEnquiry(actor, id, status), /unavailable/);
  }
  buyers.changeEnquiry(seller, id, "Viewed");
  assert.throws(() => buyers.changeEnquiry(seller, id, "Responded", " "), /response/);
  buyers.changeEnquiry(seller, id, "Responded", "Synthetic response only.");
  assert.equal(buyers.getEnquiries(buyer)[0].events.at(-1).message, "Synthetic response only.");
  buyers.changeEnquiry(buyer, id, "Closed");
  assert.throws(() => buyers.changeEnquiry(seller, id, "Viewed"), /current enquiry status/);
  const events = buyers.getEnquiries(seller)[0].events;
  assert.deepEqual(events.map(event => [event.previousStatus, event.newStatus, event.actorKind]), [
    [null, "Submitted", "Buyer"], ["Submitted", "Viewed", "Seller"],
    ["Viewed", "Responded", "Seller"], ["Responded", "Closed", "Buyer"],
  ]);
  assert(events.every(event => event.recordedAt));
  const second = buyers.submitEnquiry(buyer.id, "published-p15", "New fictional enquiry");
  assert.notEqual(second, id);
  buyers.changeEnquiry(seller, second, "Closed");
  assert.equal(buyers.getEnquiries(buyer).find(item => item.id === second).status, "Closed");
  const readonly = new DatabaseSync(path, { readOnly: true });
  assert.equal(readonly.prepare("SELECT status FROM listings WHERE id = 'published-p15'").get().status, "Approved");
  assert.deepEqual(readonly.prepare("PRAGMA foreign_key_check").all(), []);
  readonly.close();
});
