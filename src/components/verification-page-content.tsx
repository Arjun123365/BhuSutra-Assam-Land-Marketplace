import { Download,Info,MapPin } from "lucide-react";
import Link from "next/link";
import { demoDistricts,demoParcels,parcelHref } from "../lib/demo-marketplace";
import { verificationReportHref } from "../lib/verification-model";
import { ParcelVerification,VerificationStatusSummary } from "./parcel-verification";


import type { FormEvent,ReactNode } from "react";
import type { DemoParcel } from "../lib/demo-marketplace";
import type { ParcelGovernmentRecords } from "../lib/parcel-records";
export function VerificationPageContent({selection,verification,workspace,onSubmit,onDownload}:{selection:string;verification?:{parcel:DemoParcel;records:ParcelGovernmentRecords};workspace:ReactNode;onSubmit?:(e:FormEvent<HTMLFormElement>)=>void;onDownload?:()=>void}) {return <>
        <section className="explore-intro records-page-intro" aria-labelledby="verify-title">
          <div className="shell">
            <h1 id="verify-title">Land Verification Dashboard</h1>
            <p>Review synthetic parcel records, public seller declarations and the checks a buyer would request from authorised sources.</p>
            <p className="prototype-notice"><Info size={15} aria-hidden="true" /> NESFIC demonstration prototype. No Government record systems are connected.</p>
          </div>
        </section>
        <div className="shell records-page-content">
          <div className="records-card verification-toolbar">
            <form action="/verify-records" onSubmit={onSubmit}>
              <label htmlFor="verification-parcel">Demonstration parcel</label>
              <div className="verification-controls">
                <select key={selection} id="verification-parcel" name="parcel" defaultValue={verification?.parcel.id ?? ""} required>
                  {!verification && <option value="" disabled>Select a parcel</option>}
                  {demoDistricts.map((district) => (
                    <optgroup key={district} label={district}>
                      {demoParcels.filter((parcel) => parcel.district === district).map(({ id, circle }) => (
                        <option key={id} value={id}>{id} · {circle}, {district}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button className="verification-primary" type="submit">View records</button>
              </div>
            </form>
            {verification && <div className="verification-controls">
              <Link className="open-parcel-record" href={parcelHref(verification.parcel.id)}><MapPin size={16} aria-hidden="true" /> View on map</Link>
              <a className="open-parcel-record" href={verificationReportHref(verification.parcel.id)} download onClick={onDownload ? e=>{e.preventDefault();onDownload();}:undefined}><Download size={16} aria-hidden="true" /> Download demo report</a>
            </div>}
          </div>
          {verification ? (
            <>
              <VerificationStatusSummary {...verification} dashboard />
              <ParcelVerification
                {...verification}
                workspace={workspace}
              />
            </>
          ) : <p className="prototype-notice">Parcel unavailable. Select a parcel from the demonstration dataset.</p>}
        </div>
      </>; }
