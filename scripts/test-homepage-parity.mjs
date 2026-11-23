// Optional production-browser comparison. No app dependencies or original DB copies.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const output = resolve("output/ui-parity");
mkdirSync(output, { recursive: true });
mkdirSync(".next", { recursive: true });
const temporary = mkdtempSync(resolve(".next/homepage-parity-"));
const app = join(temporary, "app");
mkdirSync(app);
const database = resolve(".bhusutra-demo/seller.sqlite");
const hash = () => createHash("sha256").update(readFileSync(database)).digest("hex");
const before = hash();
for (const name of ["src", "public", "scripts", "tests", "package.json", "package-lock.json", "tsconfig.json", "tsconfig.public.json", "next-env.d.ts", "postcss.config.mjs"]) cpSync(name, join(app, name), { recursive: true });
const config = readFileSync("next.config.ts", "utf8").replace("const nextConfig: NextConfig = {", `const nextConfig: NextConfig = {\n turbopack: { root: ${JSON.stringify(root)} },`);
writeFileSync(join(app, "next.config.ts"), config);
symlinkSync(resolve("node_modules"), join(app, "node_modules"), "junction");
const env = { ...process.env, BHUSUTRA_PUBLIC_DEMO: "1", NEXT_TELEMETRY_DISABLED: "1" };
async function run(args) {
  const child = spawn(process.execPath, args, { cwd: app, windowsHide: true, env, stdio: "inherit" });
  const code = await new Promise((done, reject) => { child.on("error", reject); child.on("exit", done); });
  assert.equal(code, 0, `Command failed: ${args.join(" ")}`);
}
await run(["scripts/build-public-demo.mjs"]);
await run(["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--test", "tests/public-demo.test.mjs"]);
await run(["scripts/test-public-browser.mjs"]);
const { chromium } = await import(pathToFileURL(resolve(process.env.BHUSUTRA_PLAYWRIGHT_MODULE)).href);
const probe = createServer();
await new Promise(done => probe.listen(0, "127.0.0.1", done));
const port = probe.address().port;
await new Promise(done => probe.close(done));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: app, env, windowsHide: true, stdio: "ignore" });
let browser;
let checks = 0;
const results = [];
function check(value, message) { assert.ok(value, message); checks++; }
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await new Promise(done => setTimeout(done, 200));
  }
  check(ready, "Production comparison server ready");
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ reducedMotion: "reduce", serviceWorkers: "block" });
  const page = await context.newPage();
  const selectors = [".site-header", ".presentation-hero", ".presentation-hero h1", ".dashboard-metric", ".property-search", ".listing-card", ".listing-enquiry-link", ".map-preview", ".home-analytics"];
  for (const width of [1440, 1280, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const pair = {};
    for (const [label, url] of [["localhost", process.env.BHUSUTRA_LOCAL_PREVIEW_URL || "http://localhost:3000"], ["public-after", base]]) {
      const response = await page.goto(url, { waitUntil: "networkidle" });
      check(response.status() === 200, `${label} ${width}px homepage loads`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator(".map-preview").scrollIntoViewIfNeeded();
      await page.locator(".map-preview .leaflet-container").waitFor();
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: join(output, `${label}-${width}.png`), fullPage: true, animations: "disabled" });
      await page.screenshot({ path: join(output, `${label}-${width}-first-screen.png`), animations: "disabled" });
      check(await page.locator(".dashboard-metric").count() === 6, `${label} has six cards`);
      check(await page.locator(".listing-card").count() === 4, `${label} has four listings`);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} ${width}px has no overflow`);
      const styles = {};
      for (const selector of selectors) styles[selector] = await page.locator(selector).first().evaluate(element => {
        const css = getComputedStyle(element), box = element.getBoundingClientRect();
        return { x: box.x, y: box.y + scrollY, width: box.width, height: box.height, fontFamily: css.fontFamily, fontSize: css.fontSize, lineHeight: css.lineHeight, fontWeight: css.fontWeight, color: css.color, background: css.backgroundColor, padding: css.padding, borderRadius: css.borderRadius };
      });
      pair[label] = styles;
      if (label === "public-after") {
        check(await page.getByText("Synthetic demonstration snapshots", { exact: false }).count() > 0, "Snapshot provenance visible");
        await page.getByRole("combobox", { name: "District", exact: true }).selectOption("Kamrup");
        await page.getByRole("combobox", { name: "Land type", exact: true }).selectOption("Agricultural");
        await page.getByRole("combobox", { name: "Budget", exact: true }).selectOption("2000000");
        await page.getByRole("button", { name: "Search land", exact: true }).click();
        check(await page.locator(".listing-card").count() === 1, "Combined filters select P-15");
        await page.getByRole("button", { name: "Clear filters", exact: true }).click();
        check(await page.locator(".listing-card").count() === 4, "Clear filters restores four listings");
      }
    }
    for (const selector of selectors) {
      const local = pair.localhost[selector], actual = pair["public-after"][selector];
      for (const property of ["fontFamily", "fontSize", "lineHeight", "fontWeight", "color", "background", "padding", "borderRadius"]) check(local[property] === actual[property], `${width}px ${selector} ${property} matches localhost`);
      check(Math.abs(local.width - actual.width) < 1, `${width}px ${selector} width matches`);
      check(Math.abs(local.height - actual.height) < 1, `${width}px ${selector} height matches`);
    }
    check(pair.localhost[".presentation-hero"].y === pair["public-after"][".presentation-hero"].y, `${width}px hero starts at identical position`);
    results.push({ width, ...pair });
  }
  check(hash() === before, "Original SQLite bytes preserved");
  check(!existsSync(join(app, ".bhusutra-demo")), "Public build created no local store");
  writeFileSync(join(output, "comparison.json"), JSON.stringify({ checks, databaseUnchanged: true, buildDirectory: app, results }, null, 2));
  console.log(`PASS: ${checks} homepage parity assertions; production screenshots saved to ${output}`);
} finally { await browser?.close(); server.kill(); }
