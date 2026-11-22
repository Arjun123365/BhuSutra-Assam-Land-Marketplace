import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, rmdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export const cookies = async () => globalThis.buyerSwitchCookies", shortCircuit: true };
    if (specifier === "next/cache") return { url: "data:text/javascript,export const revalidatePath = (...args) => globalThis.buyerSwitchRevalidations.push(args)", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export const redirect = path => {throw new Error(path)}", shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !specifier.endsWith(".ts")) return nextResolve(specifier + ".ts", context);
    return nextResolve(specifier, context);
  },
});
const directory = mkdtempSync(join(tmpdir(), "bhusutra-buyer-switch-"));
const database = join(directory, "test.sqlite");
process.env.BHUSUTRA_DEMO_DB = database;
process.env.NODE_ENV = "development";
process.env.BHUSUTRA_DEMO_BUYER_SWITCH = "1";
// Deliberately fictional fixture value; never configures an actual demo server.
const fixtureKey = "fictional-buyer-switch-test-value";
process.env.BHUSUTRA_DEMO_BUYER_SWITCH_KEY = fixtureKey;
const jar = new Map();
const cookieOptions = new Map();
jar.set = (name, value, settings) => {
  cookieOptions.set(name, settings);
  return Map.prototype.set.call(jar, name, { value });
};
globalThis.buyerSwitchCookies = jar;
globalThis.buyerSwitchRevalidations = [];
const { buyerSwitchKey } = await import("../src/lib/buyer-switch-policy.ts");
const { listDemoBuyerProfiles } = await import("../src/lib/buyer-switch-store.ts");
const beforeDiscovery = listDemoBuyerProfiles();
const createdByDiscovery = existsSync(database);
const store = await import("../src/lib/buyer-store.ts");
const sellerStore = await import("../src/lib/seller-store.ts");
const { emptyListingDetails } = await import("../src/lib/seller-demo.ts");
const session = await import("../src/lib/buyer-session.ts");
const { ensureSigningKey } = await import("../src/lib/seller-session.ts");
const { signSellerCookie, verifySellerCookie } = await import("../src/lib/seller-cookie.ts");
const actions = await import("../src/app/buyer/switch/actions.ts");
const { startAssistance, listAssistance, getAssistance } = await import("../src/lib/assistance-store.ts");
const { getNotifications, markNotificationRead } = await import("../src/lib/coordination-store.ts");
const { saveBuyerCheck, getBuyerCheckHistory } = await import("../src/lib/due-diligence-store.ts");
const { updateAssistanceAction } = await import("../src/app/assistance-actions.ts");
const { saveBuyerCheckAction } = await import("../src/app/verify-records/actions.ts");
const profile = { displayName: "Switch Fixture One", mobile: "0000012345", email: "", district: "Kamrup", buyerType: "Individual" };
const one = store.registerBuyer(profile);
const two = store.registerBuyer({ ...profile, displayName: "Switch Fixture Two", email: "fictional@example.test" });
const ineligible = store.registerBuyer({ ...profile, displayName: "Ineligible fictional fixture", mobile: "invalid" });
const listing = "switch-fixture-p15";
sellerStore.withDatabase(db => {
  const at = "2026-11-22T00:00:00Z";
  db.prepare("INSERT INTO listings VALUES (?, ?, 'P-15', 'Approved', ?, ?, ?, 0, ?, '')").run(listing, sellerStore.seededSellerId, at, at, at, JSON.stringify({ ...emptyListingDetails, consent: true, declaration: true, askingPrice: "1900000" }));
});
const enquiryOne = store.submitEnquiry(one, listing, "Fictional first buyer enquiry.");
const enquiryTwo = store.submitEnquiry(two, listing, "Fictional second buyer enquiry.");
const requestOne = startAssistance(one, listing);
const requestTwo = startAssistance(two, listing);
saveBuyerCheck(one, "P-15", "ownership", "Completed");
saveBuyerCheck(two, "P-15", "ownership", "In Progress");
const signingKey = ensureSigningKey();
const hash = () => createHash("sha256").update(readFileSync(database)).digest("hex");
const initialHash = hash();
const form = (name, value) => { const data = new FormData(); data.set(name, value); return data; };
const switchCookie = "bhusutra_demo_buyer_switch";
const buyerCookie = "bhusutra_demo_buyer_workspace";
const now = () => Math.floor(Date.now() / 1000);

after(() => {
  assert.equal(hash(), initialHash, "Switch tests must not alter any stored records");
  rmSync(database, { force: true });
  rmSync(database + ".session-key", { force: true });
  rmdirSync(directory);
});

test("buyer switch requires explicit development opt-in and its separate bounded key", () => {
  const env = { NODE_ENV: "development", BHUSUTRA_DEMO_BUYER_SWITCH: "1", BHUSUTRA_DEMO_BUYER_SWITCH_KEY: fixtureKey };
  assert.equal(buyerSwitchKey(env), fixtureKey);
  for (const flag of [undefined, "true", "0", "yes"]) assert.equal(buyerSwitchKey({ ...env, BHUSUTRA_DEMO_BUYER_SWITCH: flag }), undefined);
  for (const mode of [undefined, "production", "test"]) assert.equal(buyerSwitchKey({ ...env, NODE_ENV: mode }), undefined);
  for (const value of [undefined, "", "x".repeat(19), "x".repeat(513)]) assert.equal(buyerSwitchKey({ ...env, BHUSUTRA_DEMO_BUYER_SWITCH_KEY: value }), undefined);
  assert.equal(buyerSwitchKey({ NODE_ENV: "development", BHUSUTRA_DEMO_SELLER_SWITCH: "1", BHUSUTRA_DEMO_SELLER_SWITCH_KEY: fixtureKey }), undefined);
});

test("profile discovery is read-only, excludes non-demo profiles and omits contact details", () => {
  assert.deepEqual(beforeDiscovery, []);
  assert.equal(createdByDiscovery, false);
  const profiles = listDemoBuyerProfiles();
  assert.deepEqual(profiles.map(profile => profile.id), [one, two]);
  assert.ok(profiles.every(profile => profile.enquiryCount === 1 && profile.assistanceCount === 1));
  assert.deepEqual(Object.keys(profiles[0]).sort(), ["assistanceCount", "displayName", "enquiryCount", "id"]);
  assert.equal(hash(), initialHash);
});

test("locked, incorrect-key and crafted-ID switching are rejected", async () => {
  assert.ok((await actions.switchDemoBuyerAction({}, form("buyerId", one))).error);
  assert.ok((await actions.unlockBuyerSwitchAction({}, form("key", "incorrect-fictional-unlock-value"))).error);
  assert.ok((await actions.unlockBuyerSwitchAction({}, form("key", "x".repeat(513)))).error);
  assert.equal(await session.currentBuyer(), undefined);
  await assert.rejects(actions.unlockBuyerSwitchAction({}, form("key", fixtureKey)), /\/buyer\/switch/);
  assert.equal(await session.buyerSwitchUnlocked(), true);
  const options = cookieOptions.get(switchCookie);
  assert.deepEqual(options, { path: "/buyer/switch", httpOnly: true, sameSite: "strict", maxAge: 900 });
  for (const id of [ineligible, "not-a-profile", "' OR 1=1 --"]) assert.ok((await actions.switchDemoBuyerAction({}, form("buyerId", id))).error);
  assert.equal(await session.currentBuyer(), undefined);
});

test("switching preserves buyer cookie security, expiry, seller session and database records", async () => {
  jar.set("bhusutra_demo_seller", "seller-session-sentinel");
  jar.set("bhusutra_demo_buyer", "legacy-cookie-sentinel");
  await assert.rejects(actions.switchDemoBuyerAction({}, form("buyerId", one)), /\/buyer\/dashboard/);
  assert.equal((await session.currentBuyer()).id, one);
  assert.deepEqual(cookieOptions.get(buyerCookie), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 });
  assert.equal(cookieOptions.get("bhusutra_demo_buyer").maxAge, 0);
  assert.equal(jar.get("bhusutra_demo_seller").value, "seller-session-sentinel");
  const token = jar.get(buyerCookie).value;
  assert.equal(verifySellerCookie("buyer-session", token, signingKey, now()), one);
  assert.equal(verifySellerCookie("seller-session", token, signingKey, now()), undefined);
  assert.ok(Number(token.split(".")[1]) > now() + 29 * 24 * 60 * 60);
  assert.equal((await session.currentBuyer()).id, one, "Subsequent request/refresh reads the selected profile");
  assert.ok(globalThis.buyerSwitchRevalidations.some(([path]) => path === "/buyer"));
  assert.ok(globalThis.buyerSwitchRevalidations.some(([path]) => path === "/verify-records"));
  assert.equal(hash(), initialHash);
});

test("each switched buyer sees only their enquiries, notifications, checks and assistance", async () => {
  for (const [id, ownEnquiry, ownRequest, foreignRequest, checkStatus] of [[one, enquiryOne, requestOne, requestTwo, "Completed"], [two, enquiryTwo, requestTwo, requestOne, "In Progress"]]) {
    await assert.rejects(actions.switchDemoBuyerAction({}, form("buyerId", id)), /\/buyer\/dashboard/);
    const buyer = await session.requireBuyer();
    const actor = { kind: "Buyer", id: buyer.id };
    assert.equal(buyer.id, id);
    assert.deepEqual(store.getEnquiries(actor).map(enquiry => enquiry.id), [ownEnquiry]);
    assert.deepEqual(listAssistance(actor).map(request => request.reference), [ownRequest]);
    assert.equal(getAssistance(actor, foreignRequest), undefined);
    const notifications = getNotifications(actor);
    assert.ok(notifications.length > 0 && notifications.every(notification => notification.reference === ownRequest));
    const foreignNotification = getNotifications({ kind: "Buyer", id: id === one ? two : one })[0];
    assert.throws(() => markNotificationRead(actor, foreignNotification.key), /unavailable/i);
    assert.equal(getBuyerCheckHistory(buyer.id, "P-15")[0].status, checkStatus);
    await assert.rejects(updateAssistanceAction("Buyer", foreignRequest, form("action", "cancel")), /notice=unavailable/);
    // A client-supplied buyerId cannot override the signed session.
    const checkForm = form("buyerId", id === one ? two : one);
    checkForm.set("status", checkStatus);
    await assert.rejects(saveBuyerCheckAction("P-15", "ownership", {}, checkForm), /\/verify-records\?parcel=P-15/);
    assert.equal(getBuyerCheckHistory(id === one ? two : one, "P-15")[0].status, id === one ? "In Progress" : "Completed");
  }
  assert.equal(hash(), initialHash);
});

test("expired, tampered and seller-purpose unlock cookies cannot select buyers", async () => {
  for (const token of [signSellerCookie("buyer-switch", "unlocked", now() - 1, fixtureKey), signSellerCookie("seller-switch", "unlocked", now() + 60, fixtureKey), "tampered.cookie.signature"]) {
    jar.set(switchCookie, token);
    assert.equal(await session.buyerSwitchUnlocked(), false);
    assert.ok((await actions.switchDemoBuyerAction({}, form("buyerId", one))).error);
  }
  assert.equal(await session.unlockBuyerSwitch(fixtureKey), true);
  const active = jar.get(buyerCookie).value;
  await assert.rejects(actions.lockBuyerSwitchAction(), /\/buyer\/switch/);
  assert.equal(await session.buyerSwitchUnlocked(), false);
  assert.equal(jar.get(buyerCookie).value, active);
});

test("production rejects valid unlock cookies and actions while preserving the active session", async () => {
  assert.equal(await session.unlockBuyerSwitch(fixtureKey), true);
  const active = jar.get(buyerCookie).value;
  process.env.NODE_ENV = "production";
  try {
    assert.equal(buyerSwitchKey(), undefined);
    assert.equal(buyerSwitchKey({ NODE_ENV: "development", BHUSUTRA_DEMO_BUYER_SWITCH: "1", BHUSUTRA_DEMO_BUYER_SWITCH_KEY: fixtureKey }), undefined);
    assert.equal(await session.buyerSwitchUnlocked(), false);
    assert.equal(await session.unlockBuyerSwitch(fixtureKey), false);
    assert.ok((await actions.switchDemoBuyerAction({}, form("buyerId", one))).error);
    assert.ok((await actions.unlockBuyerSwitchAction({}, form("key", fixtureKey))).error);
    assert.equal(jar.get(buyerCookie).value, active);
  } finally { process.env.NODE_ENV = "development"; }
});

test("unlock attempts are rate limited without changing profiles or sessions", async () => {
  await session.lockBuyerSwitch();
  const active = jar.get(buyerCookie).value;
  let limited;
  for (let attempt = 0; attempt < 11; attempt++) limited = await actions.unlockBuyerSwitchAction({}, form("key", "incorrect-fictional-unlock-value"));
  assert.match(limited.error, /Too many demo actions/);
  assert.equal(await session.buyerSwitchUnlocked(), false);
  assert.equal(jar.get(buyerCookie).value, active);
  assert.equal(hash(), initialHash);
});
