// Builds a public production copy and compares against the same local UI on a new,
// isolated synthetic reference store. Never copies original accounts or signing keys.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root=process.cwd(),output=resolve("output/full-workspace-parity");mkdirSync(output,{recursive:true});mkdirSync(".next",{recursive:true});
const reuse=process.env.BHUSUTRA_PARITY_PUBLIC_APP;
if(reuse)assert.ok(resolve(reuse).startsWith(resolve(".next")+"/" )||resolve(reuse).startsWith(resolve(".next")+"\\"));
const folder=reuse?dirname(resolve(reuse)):mkdtempSync(resolve(".next/full-workspace-parity-"));
const original=resolve(".bhusutra-demo/seller.sqlite");const hash=()=>createHash("sha256").update(readFileSync(original)).digest("hex");const before=hash();
const cleanEnv={...process.env,NEXT_TELEMETRY_DISABLED:"1"};for(const key of Object.keys(cleanEnv))if(key.startsWith("BHUSUTRA_DEMO_")||key==="BHUSUTRA_PUBLIC_DEMO"||key==="VERCEL")delete cleanEnv[key];
function copyApp(name){const app=join(folder,name);mkdirSync(app,{recursive:true});for(const item of ["src","public","scripts","tests","package.json","package-lock.json","tsconfig.json","tsconfig.public.json","next-env.d.ts","postcss.config.mjs"])cpSync(item,join(app,item),{recursive:true,filter:(source,destination)=>statSync(source).isDirectory()||!existsSync(destination)||!readFileSync(source).equals(readFileSync(destination))});writeFileSync(join(app,"next.config.ts"),readFileSync("next.config.ts","utf8").replace("const nextConfig: NextConfig = {",`const nextConfig: NextConfig = {\n turbopack: {root:${JSON.stringify(root)}},`));if(!existsSync(join(app,"node_modules")))symlinkSync(resolve("node_modules"),join(app,"node_modules"),"junction");return app;}
async function run(cwd,args,env){const child=spawn(process.execPath,args,{cwd,env,windowsHide:true,stdio:"inherit"});const code=await new Promise((done,reject)=>{child.on("error",reject);child.on("exit",done);});assert.equal(code,0,args.join(" "));}
function sourceHash(directory){const h=createHash("sha256");function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const full=join(dir,item.name);if(item.isDirectory())walk(full);else{h.update(full.slice(directory.length));h.update(readFileSync(full));}}}walk(directory);return h.digest("hex");}
const skipBuild=process.env.BHUSUTRA_PARITY_SKIP_BUILD==="1";
if(skipBuild)assert.ok(reuse&&sourceHash(resolve("src"))===sourceHash(join(resolve(reuse),"src")),"Cannot reuse a production artifact after source changes");
const app=copyApp("public");const publicEnv={...cleanEnv,BHUSUTRA_PUBLIC_DEMO:"1"};
await run(app,[skipBuild?"scripts/audit-public-build.mjs":"scripts/build-public-demo.mjs"],publicEnv);
await run(app,["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON","--test","tests/public-demo.test.mjs","tests/browser-workspaces.test.mjs"],publicEnv);
await run(app,["scripts/test-public-browser.mjs"],publicEnv);
writeFileSync(join(output,"public-build.json"),JSON.stringify({app,databaseUnchanged:hash()===before}));
const reference=copyApp("local-reference");const database=join(mkdtempSync(join(folder,"reference-store-")),"reference.sqlite");
await run(root,["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON","scripts/create-ui-reference-fixture.mjs",database],cleanEnv);
const profiles=JSON.parse(readFileSync(database+".profiles.json"));const signingKey=randomBytes(32).toString("hex"),adminKey=randomBytes(32).toString("hex");writeFileSync(database+".session-key",signingKey);
async function port(){const probe=createServer();await new Promise(done=>probe.listen(0,"127.0.0.1",done));const p=probe.address().port;await new Promise(done=>probe.close(done));return p;}
const publicPort=await port(),referencePort=await port();const publicBase=`http://127.0.0.1:${publicPort}`,referenceBase=`http://127.0.0.1:${referencePort}`;
const servers=[];let browser;
const launch=(cwd,args,env)=>{const child=spawn(process.execPath,[resolve("node_modules/next/dist/bin/next"),...args],{cwd,env,windowsHide:true,stdio:["ignore","pipe","pipe"]});let logs="";child.stdout.on("data",b=>{logs+=b;});child.stderr.on("data",b=>{logs+=b;});servers.push(child);return ()=>logs;};
const publicLogs=launch(app,["start","--hostname","127.0.0.1","--port",String(publicPort)],publicEnv);
const referenceLogs=launch(reference,["dev","--hostname","127.0.0.1","--port",String(referencePort)],{...cleanEnv,BHUSUTRA_DEMO_DB:database,BHUSUTRA_DEMO_ADMIN:"1",BHUSUTRA_DEMO_ADMIN_KEY:adminKey});
const results=[];let assertions=0;const check=(v,m)=>{assert.ok(v,m);assertions++;};
try{
  for(const base of [publicBase,referenceBase]){let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+"/buyer/register",{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{}await new Promise(done=>setTimeout(done,300));}check(ready,"Comparison server ready");}
  const {chromium}=await import(pathToFileURL(resolve(process.env.BHUSUTRA_PLAYWRIGHT_MODULE)).href);browser=await chromium.launch({headless:true,channel:"chrome"});
  const publicContext=await browser.newContext({reducedMotion:"reduce",serviceWorkers:"block"}),referenceContext=await browser.newContext({reducedMotion:"reduce",serviceWorkers:"block"}),guest=await browser.newContext({reducedMotion:"reduce",serviceWorkers:"block"});
  const expires=Math.floor(Date.now()/1000)+3600;
  const token=(purpose,id)=>{const payload=`${id}.${expires}`;return payload+"."+createHmac("sha256",signingKey).update(`bhusutra:${purpose}:${payload}`).digest("hex");};
  await referenceContext.addCookies([{name:"bhusutra_demo_seller",value:token("seller-session",profiles.seller),domain:"127.0.0.1",path:"/seller"},{name:"bhusutra_demo_buyer_workspace",value:token("buyer-session",profiles.buyer),domain:"127.0.0.1",path:"/"},{name:"bhusutra_demo_admin",value:`${expires}.`+createHmac("sha256",adminKey).update(`bhusutra-admin-session:${expires}`).digest("hex"),domain:"127.0.0.1",path:"/admin"}]);
  const pages=[['home','/'],['explore','/explore?parcel=P-15'],['parcel','/explore/parcels/P-15'],['buyer-registration','/buyer/register'],['buyer-dashboard','/buyer/dashboard'],['seller-registration','/seller/register'],['seller-dashboard','/seller/dashboard'],['listing-submission','/seller/list-property'],['verification','/verify-records?parcel=P-15'],['buyer-transactions','/buyer/transactions'],['seller-transactions','/seller/transactions'],['admin-dashboard','/admin/dashboard'],['admin-review-queue','/admin/listings'],['admin-profiles','/admin/profiles'],['admin-enquiries','/admin/enquiries'],['admin-monitoring','/admin/transactions'],['notifications','/buyer/notifications'],['about','/about']];
  for(const width of [1280,390])for(const [name,path] of pages){const pair={name,path,width};for(const [label,context,base]of [['local',name==='buyer-registration'?guest:referenceContext,['home','explore','buyer-registration','seller-registration','about'].includes(name)?'http://localhost:3000':referenceBase],['public',publicContext,publicBase]]){
      const page=await context.newPage();await page.setViewportSize({width,height:900});const errors=[];page.on("pageerror",e=>errors.push(e.message));
      const response=await page.goto(base+path,{waitUntil:"networkidle",timeout:180000});check(response.status()===200,`${label} ${path} loads`);check(!page.url().includes('/admin/access'),"Reference administrator is actually signed in");await page.evaluate(()=>document.fonts.ready);
      if(await page.locator(".map-preview").count()){await page.locator(".map-preview").scrollIntoViewIfNeeded();await page.waitForTimeout(250);await page.evaluate(()=>scrollTo(0,0));}
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} ${width}px ${path} fits`);check(errors.length===0,`${label} ${path} no runtime errors: ${errors.join('; ')}`);
      await page.screenshot({path:join(output,`${label}-${name}-${width}.png`),fullPage:true,animations:"disabled"});await page.screenshot({path:join(output,`${label}-${name}-${width}-screen.png`),animations:"disabled"});
      pair[label]={heading:await page.locator("main h1").first().innerText(),widgets:await page.locator(".dashboard-metric").count(),inputs:await page.locator("main :is(input,select,textarea)").count()};
      if(['buyer-registration','seller-registration'].includes(name))pair[label].form=await page.locator('.seller-fields').first().evaluate(e=>{const c=getComputedStyle(e);return {font:c.fontFamily,gap:c.gap,width:e.getBoundingClientRect().width};});
      await page.close();
    }check(pair.local.heading===pair.public.heading,`${name} corresponding page headings match`);if(name.endsWith('dashboard'))check(pair.local.widgets===pair.public.widgets,`${name} same dashboard widgets`);if(pair.local.form)check(JSON.stringify(pair.local.form)===JSON.stringify(pair.public.form),`${name} same form typography, gap and width`);results.push(pair);console.log(`Compared ${name} at ${width}px`);}
  check(hash()===before,"Original database bytes preserved");check(!existsSync(join(app,".bhusutra-demo")),"Public app has no SQLite store");check(!/SQLITE_|EROFS|EACCES/.test(publicLogs()),"No public storage errors");
  writeFileSync(join(output,"comparison.json"),JSON.stringify({assertions,databaseUnchanged:true,results,reference:"Local UI with isolated fictional fixture; no original account/session copy",publicApp:app},null,2));
  console.log(`PASS: ${assertions} desktop/mobile page comparisons; original SQLite unchanged. Evidence: ${output}`);
}finally{await browser?.close();for(const server of servers)if(server.exitCode===null){if(process.platform==="win32")execFileSync("taskkill",["/PID",String(server.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});else server.kill();}writeFileSync(join(output,"reference-build.log"),referenceLogs());}
