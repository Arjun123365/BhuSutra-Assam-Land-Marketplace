import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const actions = JSON.parse(readFileSync(".next/server/server-reference-manifest.json"));
assert.equal(Object.keys(actions.node).length + Object.keys(actions.edge).length, 0, "Public build must expose zero server actions");
const routes = JSON.parse(readFileSync(".next/server/app-paths-manifest.json"));
assert.ok(routes["/[[...path]]/page"], "Public entry point required");
assert.ok(!routes["/seller/dashboard/page"], "Local routes must be absent");
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(resolve(directory, entry.name)) : [resolve(directory, entry.name)]);
}
const traces = files(".next/server").filter(file => file.endsWith(".nft.json"));
let checked = 0;
for (const trace of traces) {
  for (const relative of JSON.parse(readFileSync(trace)).files) {
    const target = resolve(dirname(trace), relative);
    assert.doesNotMatch(target, /[\\/]\.bhusutra-demo[\\/]|\.sqlite(?:$|[-.])|\.session-key|[\\/]\.env(?:$|\.)|\.(?:pem|p12|pfx|key)$/i, "Private file in public deployment trace");
    checked++;
  }
}
// Compare in memory only. Never print private key contents or account records.
const keyFile = ".bhusutra-demo/seller.sqlite.session-key";
if (existsSync(keyFile)) {
  const key = readFileSync(keyFile, "utf8").trim();
  if (key.length >= 20) for (const file of [...files(".next/server"), ...files(".next/static")].filter(file => /\.(js|json)$/.test(file))) {
    assert.ok(!readFileSync(file, "utf8").includes(key), "Local signing secret found in public build");
  }
}
console.log(`PASS: public route graph, zero server actions, ${traces.length} function traces (${checked} references), no private database/key/environment files or local signing secret.`);
