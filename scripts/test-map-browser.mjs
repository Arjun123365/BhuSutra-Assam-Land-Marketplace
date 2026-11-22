// Optional browser smoke runner. Uses a separately installed Playwright through
// BHUSUTRA_PLAYWRIGHT_MODULE, without adding a runtime or project dependency.
// Starts its own source copy and disposable database; never drives port 3000.
import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, parse, resolve, sep } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { demoParcels } from "../src/lib/demo-marketplace.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const playwrightPath = process.env.BHUSUTRA_PLAYWRIGHT_MODULE;
if (!playwrightPath) throw new Error("Set BHUSUTRA_PLAYWRIGHT_MODULE to an existing Playwright index.mjs path; no packages are installed automatically.");
const { chromium } = await import(pathToFileURL(resolve(playwrightPath)).href);
const sourceDatabase = resolve(process.env.BHUSUTRA_DEMO_DB || join(root, ".bhusutra-demo/seller.sqlite"));
const fingerprint = () => createHash("sha256").update(readFileSync(sourceDatabase)).digest("hex");
const originalHash = fingerprint();
mkdirSync(join(root, ".next"), { recursive: true });
const temporary = mkdtempSync(join(root, ".next/map-browser-"));
const app = join(temporary, "app");
const database = join(temporary, "test.sqlite");
let server;
let browser;
let linked = false;
let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed++; };

try {
  mkdirSync(app);
  for (const name of ["src", "public", "package.json", "package-lock.json", "tsconfig.json", "next-env.d.ts", "postcss.config.mjs"]) {
    cpSync(join(root, name), join(app, name), { recursive: true });
  }
  const config = readFileSync(join(root, "next.config.ts"), "utf8").replace("const nextConfig: NextConfig = {", `const nextConfig: NextConfig = {\n turbopack: { root: ${JSON.stringify(parse(root).root)} },`);
  writeFileSync(join(app, "next.config.ts"), config);
  symlinkSync(join(root, "node_modules"), join(app, "node_modules"), "junction");
  linked = true;
  const original = new DatabaseSync(sourceDatabase, { readOnly: true });
  let listing;
  let buyer;
  try {
    listing = original.prepare("SELECT id, sellerId, status FROM listings WHERE parcelId = 'P-15' AND status = 'Approved'").get();
    buyer = original.prepare("SELECT id FROM buyers LIMIT 1").get();
    await backup(original, database);
  } finally { original.close(); }
  check(Boolean(listing), "P-15 approval must already exist; tests never create or change it");
  const signingKey = existsSync(sourceDatabase + ".session-key") ? readFileSync(sourceDatabase + ".session-key", "utf8") : randomBytes(32).toString("hex");
  writeFileSync(database + ".session-key", signingKey, { mode: 0o600 });
  const adminKey = randomBytes(32).toString("hex");
  const portProbe = createServer();
  await new Promise(resolve => portProbe.listen(0, "127.0.0.1", resolve));
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: app, windowsHide: true, stdio: "ignore",
    env: { ...process.env, NODE_ENV: "development", BHUSUTRA_DEMO_DB: database, BHUSUTRA_DEMO_ADMIN: "1", BHUSUTRA_DEMO_ADMIN_KEY: adminKey, NEXT_TELEMETRY_DISABLED: "1" },
  });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error("Isolated map test server exited before readiness.");
    try { if ((await fetch(base + "/seller/register", { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch { /* Wait for this owned server. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  check(ready, "Isolated development server ready");
  browser = await chromium.launch({ headless: true, channel: process.env.BHUSUTRA_MAP_BROWSER_CHANNEL || "chrome" });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  let externalRequests = 0;
  await context.route("**/*", route => {
    if (route.request().url().startsWith(base + "/")) return route.continue();
    externalRequests++;
    return route.fulfill({ status: 403, body: "External services deliberately unavailable in map smoke test" });
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  const goto = path => page.goto(base + path, { waitUntil: "networkidle", timeout: 120000 });
  const notice = "Illustrative demo map — not an official cadastral map";
  const waitMap = () => page.locator(".demo-background-tile").first().waitFor({ state: "visible" });
  await goto("/explore");
  await waitMap();
  check(await page.locator(".basemap-notice").textContent().then(text => text.includes(notice)), "Interactive map disclaimer");
  check(await page.locator(".demo-background-tile").first().evaluate(canvas => canvas.getContext("2d").getImageData(0, 0, 1, 1).data[3] === 255), "Local basemap actually painted");
  for (const district of ["Jorhat", "Kamrup", "Dibrugarh", ""]) {
    await page.getByRole("combobox", { name: "District", exact: true }).selectOption(district);
    const circle = page.getByRole("combobox", { name: "Revenue Circle", exact: true });
    const expected = demoParcels.filter(parcel => !district || parcel.district === district);
    check(await page.locator("#parcel-list li").count() === expected.length, "District list count");
    check(await page.locator("path.demo-parcel").count() === expected.length, "District polygon count");
    if (district) {
      for (const name of [...new Set(expected.map(parcel => parcel.circle))]) {
        await circle.selectOption(name);
        check(await page.locator("path.demo-parcel").count() === expected.filter(parcel => parcel.circle === name).length, "Circle polygon count");
      }
    }
  }
  for (const parcel of demoParcels) {
    await goto(`/explore?parcel=${parcel.id}`);
    await waitMap();
    check(await page.getByRole("combobox", { name: "District", exact: true }).inputValue() === parcel.district, "Deep-link district association");
    const button = page.locator("#parcel-list button").filter({ hasText: new RegExp(`^${parcel.id} ·`) });
    await button.click();
    check(await button.getAttribute("aria-pressed") === "true", "List selection");
    check(await page.locator(`.parcel-${parcel.id}`).getAttribute("stroke") === "#d4af37", "Gold selected polygon");
    await page.getByRole("link", { name: "Open full record" }).click();
    await page.locator(".parcel-context svg polygon").first().waitFor();
    check(await page.locator("h1").textContent() === `Parcel ${parcel.id} Records`, "Correct record navigation");
    check((await page.locator(".parcel-context figcaption").textContent()).includes(notice), "Record context disclaimer");
    await page.getByRole("link", { name: "Back to Map", exact: true }).first().click();
    await waitMap();
    check((await page.locator("#parcel-details-title").textContent()).includes(parcel.id), "Back-to-map selection retained");
  }
  await goto("/explore?parcel=P-15");
  await waitMap();
  await page.locator(".parcel-P-16").click({ force: true });
  check((await page.locator("#parcel-details-title").textContent()).includes("P-16"), "Polygon click updates detail panel");
  check(await page.locator("#parcel-list button[aria-pressed='true']").textContent().then(text => text.includes("P-16")), "Polygon click updates list");
  const beforeZoom = await page.locator(".parcel-P-16").getAttribute("d");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  check(await page.locator(".parcel-P-16").getAttribute("d") !== beforeZoom, "Zoom control changes geometry projection");
  const beforePan = await page.locator(".leaflet-map-pane").getAttribute("style");
  const bounds = await page.locator(".parcel-map-canvas").boundingBox();
  await page.mouse.move(bounds.x + 120, bounds.y + 160);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 210, bounds.y + 190, { steps: 8 });
  await page.mouse.up();
  check(await page.locator(".leaflet-map-pane").getAttribute("style") !== beforePan, "Pan retained");
  await context.setOffline(true);
  await page.getByRole("combobox", { name: "District", exact: true }).selectOption("Dibrugarh");
  await page.locator("#parcel-list button").first().click();
  check(await page.locator("path.demo-parcel").count() === 3, "Offline district selection and polygons");
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await page.getByRole("button", { name: "Fit parcels", exact: true }).click();
  await context.setOffline(false);
  await page.screenshot({ path: join(root, ".next/map-repair-desktop.png"), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await goto("/explore?parcel=P-15");
    await waitMap();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow at ${width}px`);
    check(await page.locator(".parcel-P-15").isVisible(), "Mobile parcel visible");
    await page.screenshot({ path: join(root, `.next/map-repair-mobile-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto("/");
  await page.locator(".dashboard-parcel-map").scrollIntoViewIfNeeded();
  await waitMap();
  check(await page.locator(".dashboard-parcel-map path.demo-parcel").count() > 0, "Homepage preview rendered");
  await page.locator(".dashboard-parcel-map path.demo-parcel").first().click({ force: true });
  await page.waitForURL(/\/explore\?parcel=/);
  check(true, "Homepage preview navigates to selected parcel");
  await goto("/verify-records?parcel=P-15");
  await page.getByRole("link", { name: "View on map" }).click();
  await waitMap();
  check((await page.locator("#parcel-details-title").textContent()).includes("P-15"), "Verification-to-map selection");
  const expires = Math.floor(Date.now() / 1000) + 1800;
  function profileToken(purpose, id) {
    const payload = `${id}.${expires}`;
    return payload + "." + createHmac("sha256", signingKey).update(`bhusutra:${purpose}:${payload}`).digest("hex");
  }
  const cookies = [{ name: "bhusutra_demo_seller", value: profileToken("seller-session", listing.sellerId), domain: "127.0.0.1", path: "/seller" }];
  if (buyer) cookies.push({ name: "bhusutra_demo_buyer_workspace", value: profileToken("buyer-session", buyer.id), domain: "127.0.0.1", path: "/" });
  cookies.push({ name: "bhusutra_demo_admin", value: `${expires}.` + createHmac("sha256", adminKey).update(`bhusutra-admin-session:${expires}`).digest("hex"), domain: "127.0.0.1", path: "/admin" });
  await context.addCookies(cookies);
  for (const path of ["/seller/dashboard", "/seller/list-property", "/buyer/dashboard", "/admin/dashboard", `/admin/listings/${listing.id}`]) {
    const response = await goto(path);
    check(response.ok(), "Workspace route available");
  }
  check(await page.locator(".parcel-context svg polygon").count() === 3, "Administrator context uses same offline parcel geometry");
  check((await page.locator(".parcel-context figcaption").textContent()).includes(notice), "Administrator map disclaimer");
  check(pageErrors.length === 0, `No browser runtime errors: ${pageErrors.join("; ")}`);
  check(externalRequests === 0, "All maps work with external services blocked; no tile requests attempted");
  console.log(`Map browser smoke passed: ${passed} checks, all 17 parcels, 3 districts, 4 circles, map/list selection, record navigation, zoom/pan, offline operation, mobile, homepage, verification and authenticated workspaces. No external requests.`);
} finally {
  await browser?.close();
  if (server?.pid && server.exitCode === null) {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else server.kill("SIGTERM");
  }
  if (linked) unlinkSync(join(app, "node_modules"));
  if (!resolve(temporary).startsWith(join(root, ".next") + sep)) throw new Error("Refusing cleanup outside the isolated test directory.");
  rmSync(temporary, { recursive: true, force: true });
  assert.equal(fingerprint(), originalHash, "Original SQLite database must remain byte-identical");
}
