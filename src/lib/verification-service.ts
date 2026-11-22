import "server-only";

import { findDemoParcel } from "./demo-marketplace";
import { disconnectedGovernmentRecords, type GovernmentRecordProvider } from "./parcel-records";
import { withPublishedListing } from "./public-marketplace";
import { getApprovedListingsReadOnly } from "./seller-store";

const governmentRecords: GovernmentRecordProvider = {
  async getParcelRecords(parcelId) {
    return disconnectedGovernmentRecords(parcelId);
  },
};

export async function getVerificationRecord(parcelId: string) {
  const syntheticParcel = findDemoParcel(parcelId);
  if (!syntheticParcel) return undefined;

  const listing = getApprovedListingsReadOnly().find(({ parcelId }) => parcelId === syntheticParcel.id);
  return {
    parcel: withPublishedListing(syntheticParcel, listing),
    records: await governmentRecords.getParcelRecords(parcelId),
  };
}
