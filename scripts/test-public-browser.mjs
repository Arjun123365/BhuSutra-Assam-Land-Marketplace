import {exercisePublicWorkspaces} from "./public-workspace-browser.mjs";
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
  assertions += await exercisePublicWorkspaces(context,base);
  const page=await context.newPage();
  for(const width of [1440,1280,390,320]){await page.setViewportSize({width,height:900});for(const route of ["/","/explore?parcel=P-15","/buyer/register","/seller/register","/buyer/dashboard","/seller/dashboard","/admin/dashboard","/admin/listings","/verify-records?parcel=P-15","/about"]){await page.goto(base+route,{waitUntil:"networkidle"});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+"px "+route+" fits");}}
  const forged=await fetch(base+"/seller/list-property",{method:"POST",headers:{"Next-Action":"forged-private-action",Origin:base},body:"[]"});check(forged.status>=400,"Server-side write invocation unavailable");
  check(!existsSync(forbidden) && !existsSync(forbidden + ".session-key"), "No database or signing file created");
  check(hash() === before, "Original database bytes unchanged");
  check(!/node:sqlite|SQLITE_|EROFS|EACCES/.test(logs), "Production logs show no SQLite/filesystem failure");
  console.log(`PASS: ${assertions} public production browser assertions; original SQLite SHA-256 unchanged.`);
} finally {
  await browser?.close();
  server.kill();
}
