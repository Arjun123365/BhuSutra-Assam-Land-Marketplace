import "server-only";

import { demoParcels, demonstrationArea, getActiveListing, marketplaceCounts, type DemoParcel } from "./demo-marketplace";
import { getEnquiryCount } from "./buyer-store";
import { getApprovedListings } from "./seller-store";
import { cache } from "react";

export function withPublishedListing(parcel: DemoParcel, approved?: ReturnType<typeof getApprovedListings>[number]): DemoParcel {
  return {
    ...parcel,
    sellerListing: approved
      ? { voluntaryConsent: true, title: approved.title || parcel.category + " parcel in " + parcel.district, price: approved.price, seeded: approved.seeded, restrictionReviewed: approved.restrictionReviewed, listingId: approved.listingId }
      : parcel.sellerListing?.voluntaryConsent === false ? parcel.sellerListing : undefined,
  };
}

export const getPublicMarketplace = cache(function getPublicMarketplace() {
  const listingsByParcel = new Map(getApprovedListings().map(listing => [listing.parcelId, listing]));
  const parcels = demoParcels.map(parcel => withPublishedListing(parcel, listingsByParcel.get(parcel.id)));

  const listings = parcels.flatMap(parcel => {
    const approved = getActiveListing(parcel);
    if (!approved) return [];
    const { id, district, circle, category, area, areaUnit } = parcel;
    const { title, price, seeded, listingId } = approved;
    return listingId ? [{ id, district, circle, category, area, areaUnit, title, price, seeded, listingId }] : [];
  });

  return {
    parcels,
    listings,
    counts: { ...marketplaceCounts, activeListings: listings.length, interestRequests: marketplaceCounts.interestRequests + getEnquiryCount() },
    previewParcels: parcels.filter(({ circle }) => circle === demonstrationArea.circle),
  };
});

export type PublicMarketplace = ReturnType<typeof getPublicMarketplace>;
