// Optional Playwright from an existing installation; no new application dependency.
// Tests the actual production build on an owned port, with a nonexistent database.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(resolve(process.env.BHUSUTRA_PLAYWRIGHT_MODULE)).href);
const probe = createServer();
await new Promise(r => probe.listen(0, "127.0.0.1", r));
const port = probe.address().port;
await new Promise(r => probe.close(r));
const base = `http://127.0.0.1:${port}`;
const original = ".bhusutra-demo/seller.sqlite";
const hash = () => existsSync(original) ? createHash("sha256").update(readFileSync(original)).digest("hex") : "absent";
const before = hash();
const forbidden = resolve(".next/public-demo-must-not-create.sqlite");
assert.ok(!existsSync(forbidden));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "production", BHUSUTRA_PUBLIC_DEMO: "1", BHUSUTRA_DEMO_DB: forbidden, BHUSUTRA_DEMO_ADMIN: "1", BHUSUTRA_DEMO_BUYER_SWITCH: "1", BHUSUTRA_DEMO_SELLER_SWITCH: "1" },
});
let logs = "";
server.stdout.on("data", b => { logs += b; });
server.stderr.on("data", b => { logs += b; });
let browser;
let assertions = 0;
const check = (value, description) => { assert.ok(value, description); assertions++; };
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  check(ready, "Production server ready");
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  let external = 0;
  await context.route("**/*", route => { if (new URL(route.request().url()).origin !== base) { external++; return route.abort(); } return route.continue(); });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/", "/explore", "/buyer/dashboard", "/seller/dashboard", "/seller/list-property", "/admin/dashboard", "/verify-records", "/buyer/transactions", "/buyer/notifications"]) {
    const response = await page.goto(base + route);
    check(response.status() === 200, `${route} succeeds`);
    check(await page.getByText("PUBLIC DEMO · Browser-only simulation").count() === 1, `${route} banner`);
    check(!(await page.locator("body").innerText()).includes("temporarily unavailable"), `${route} has no store error`);
  }
  for (let i = 1; i <= 17; i++) {
    const id = `P-${String(i).padStart(2, "0")}`;
    await page.goto(base + "/explore/parcels/" + id);
    check(await page.getByRole("heading", { name: new RegExp(`^${id} ·`) }).count() === 1, `${id} record association`);
  }
  await page.goto(base + "/explore?parcel=P-15");
  await page.locator(".leaflet-container").waitFor();
  check(await page.locator(".leaflet-interactive").count() >= 3, "Offline polygons render");
  for (const district of ["Jorhat", "Kamrup", "Dibrugarh"]) {
    await page.getByRole("combobox", { name: "District", exact: true }).selectOption(district);
    await page.waitForTimeout(250);
    check(await page.locator(".leaflet-interactive").count() >= 3, `${district} polygons`);
  }
  await page.goto(base + "/buyer/dashboard?parcel=P-15");
  await page.getByRole("button", { name: "Simulate Express Interest" }).click();
  check(await page.getByRole("button", { name: "Demo enquiry submitted" }).isDisabled(), "Duplicate interest blocked");
  await page.getByRole("link", { name: "Seller preview", exact: true }).click();
  await page.getByRole("button", { name: "Send preset demonstration response" }).click();
  await page.getByRole("button", { name: "Simulate Save Draft" }).click();
  await page.getByRole("button", { name: "Simulate Submit for Review" }).click();
  await page.getByRole("link", { name: "Administrator simulation", exact: true }).click();
  await page.getByRole("button", { name: "Simulate publication review approval" }).click();
  check(await page.getByRole("button", { name: "Simulate publication review approval" }).isDisabled(), "Simulated publication completes without database");
  await page.getByRole("link", { name: "Transaction assistance", exact: true }).click();
  await page.getByRole("button", { name: "Simulate assistance request" }).click();
  await page.getByRole("button", { name: "Simulate next coordination step" }).click();
  check((await page.getByRole("status").innerText()).includes("Seller Contact Requested"), "Transaction state progresses");
  await page.getByRole("link", { name: "Buyer due diligence", exact: true }).click();
  await page.getByRole("checkbox").first().check();
  check((await page.locator("body").innerText()).includes("1 buyer-completed checks"), "Buyer checklist remains separate from official status");
  await page.reload();
  check((await page.locator("body").innerText()).includes("0 buyer-completed checks"), "Refresh clears browser-only simulation");
  for (const route of ["/buyer/switch", "/seller/switch", "/admin/access", "/explore/parcels/P-99"]) {
    const response = await page.goto(base + route);
    check(response.status() === 404, `${route} unavailable`);
  }
  const post = await fetch(base + "/seller/list-property", { method: "POST", headers: { "Next-Action": "forged-private-action", Origin: base }, body: "[]" });
  check(post.status >= 400, "Forged server action rejected");
  for (const width of [1440, 1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/explore?parcel=P-15", "/verify-records", "/buyer/dashboard", "/admin/dashboard"]) {
      await page.goto(base + route);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px ${route} fits`);
    }
  }
  check(external === 0, "No external services requested, including map tiles");
  check(errors.length === 0, `No browser errors: ${errors.join(", ")}`);
  check(!existsSync(forbidden) && !existsSync(forbidden + ".session-key"), "No database or signing file created");
  check(hash() === before, "Original database bytes unchanged");
  check(!/node:sqlite|SQLITE_|EROFS|EACCES/.test(logs), "Production logs show no SQLite/filesystem failure");
  console.log(`PASS: ${assertions} public production browser assertions; original SQLite SHA-256 unchanged.`);
} finally {
  await browser?.close();
  server.kill();
}
