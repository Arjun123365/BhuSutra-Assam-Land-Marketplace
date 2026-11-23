import { currentBuyer } from "../lib/buyer-session";
import type { DemoParcel } from "../lib/demo-marketplace";
import { assessDueDiligence } from "../lib/due-diligence";
import { getBuyerCheckHistory } from "../lib/due-diligence-store";
import type { ParcelGovernmentRecords } from "../lib/parcel-records";
import { getParcelVerification } from "../lib/verification-model";
import { BuyerVerificationView } from "./buyer-verification-workspace-view";
import { BuyerCheckForm } from "./verification-checklist";
export async function BuyerVerificationWorkspace({parcel,records,compact=false}:{parcel:DemoParcel;records:ParcelGovernmentRecords;compact?:boolean}) { const buyer=await currentBuyer();const review=assessDueDiligence(getParcelVerification(parcel,records),buyer?getBuyerCheckHistory(buyer.id,parcel.id):[]);return <BuyerVerificationView {...{parcel,review,compact}} buyer={!!buyer} CheckForm={BuyerCheckForm} />;}
