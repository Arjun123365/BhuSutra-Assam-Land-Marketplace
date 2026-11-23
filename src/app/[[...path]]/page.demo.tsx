import { notFound } from "next/navigation";
import { AboutBhuSutra } from "../../components/about-bhusutra";
import { HomepageContent } from "../../components/homepage-content";
import { PublicDemoNotice } from "../../components/public-demo-workspace";
import { PublicExplore,PublicRecords,PublicWorkspaces } from "../../components/public-workspaces";
import { publicHomepageSnapshot,publicListings,publicParcels } from "../../lib/public-demo";
export default async function PublicPage({params,searchParams}:{params:Promise<{path?:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const parts=(await params).path??[],query=await searchParams,route="/"+parts.join("/");
 if(parts.some(part=>["switch", "access", "report"].includes(part)))notFound();
 if(route==="/")return <HomepageContent listings={publicListings} previewParcels={publicParcels.filter(p=>p.circle==="Teok")} counts={publicHomepageSnapshot} snapshot notice={<PublicDemoNotice compact/>}/>;
 if(route==="/about")return <AboutBhuSutra/>;
 if(route==="/explore")return <PublicExplore parcelId={typeof query.parcel==="string"?query.parcel:undefined}/>;
 const record=route.match(/^\/explore\/parcels\/(P-\d{2})$/);
 if(record){if(!publicParcels.some(p=>p.id===record[1]))notFound();return <PublicRecords parcelId={record[1]} detail/>;}
 if(route==="/verify-records")return <PublicRecords parcelId={typeof query.parcel==="string"?query.parcel:"P-01"}/>;
 const allowed=/^\/(buyer|seller)\/(register|dashboard|transactions|notifications)$/.test(route)||/^\/seller\/list-property$/.test(route)||/^\/admin\/(dashboard|listings|profiles|enquiries|transactions|notifications)$/.test(route)||/^\/buyer\/(interest|transactions\/start)\/public-(?:P-\d{2}|request-\d+)$/.test(route)||/^\/admin\/listings\/public-(?:P-\d{2}|request-\d+)$/.test(route)||/^\/(buyer|seller|admin)\/transactions\/TX-PUBLIC-\d+$/.test(route);
 if(!allowed)notFound();
 return <PublicWorkspaces key={route} path={route} query={query}/>;
}
