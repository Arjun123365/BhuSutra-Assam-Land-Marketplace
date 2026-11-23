// Creates a new isolated test database only. Never reads or modifies local accounts.
import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve, sep } from "node:path";
const target=resolve(process.argv[2]??"");
assert.ok(target.startsWith(resolve(".next")+sep)&&target.endsWith("reference.sqlite")&&!existsSync(target),"Reference fixture must be a new database inside .next");
process.env.BHUSUTRA_DEMO_DB=target;
registerHooks({resolve(specifier,context,next){if(specifier==="server-only")return {url:"data:text/javascript,",shortCircuit:true};if(specifier.startsWith(".")&&context.parentURL?.endsWith(".ts")&&!specifier.endsWith(".ts"))return next(specifier+".ts",context);return next(specifier,context);}});
const store=await import("../src/lib/seller-store.ts"),buyers=await import("../src/lib/buyer-store.ts");
const {emptyListingDetails}=await import("../src/lib/seller-demo.ts");
store.getApprovedListings();
const seller=store.seededSellerId;
store.withDatabase(db=>{db.prepare("UPDATE sellers SET displayName='Public Demo Seller',district='Kamrup',mobile='0000000002',email='seller@example.test' WHERE id=?").run(seller);const at="2026-01-01T06:00:00Z";db.prepare("INSERT INTO listings VALUES ('reference-p15',?,'P-15','Approved',?,?,?,0,?,'')").run(seller,at,at,at,JSON.stringify({...emptyListingDetails,askingPrice:"250000",description:"Agricultural parcel in Kamrup",declaration:true,consent:true,acknowledgePending:true}));});
const buyer=buyers.registerBuyer({displayName:"Public Demo Buyer",mobile:"0000000001",email:"buyer@example.test",district:"Kamrup",buyerType:"Individual"});
writeFileSync(target+".profiles.json",JSON.stringify({seller,buyer}));
console.log("Isolated reference profiles created; original database was not opened.");
