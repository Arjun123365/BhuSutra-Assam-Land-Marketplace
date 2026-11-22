export const recordStatusLabels = {
  demo: "Demo data",
  "seller-declared": "Seller-declared",
  "not-connected": "Not connected",
  "needs-review": "Needs review",
  "government-verified": "Government-record verified",
} as const;

export type RecordStatus = keyof typeof recordStatusLabels;

export const unavailableGovernmentStatus = "Not connected / Not verified";

const governmentCheckDefinitions = {
  ownership: {
    label: "Ownership verification and disclosure",
    unavailable: "Authorised ownership information is unavailable. The demo discloses no owner names or ownership particulars.",
    nextStep: "Request the current ownership record and compare the Dag and Patta identifiers.",
  },
  zonalValue: {
    label: "Zonal valuation",
    unavailable: "An official zonal value is unavailable. A seller’s asking price is a separate figure.",
    nextStep: "Obtain the applicable official zonal valuation independently of the asking price.",
  },
  revenue: {
    label: "Land revenue and outstanding dues",
    unavailable: "Authorised revenue, payment and outstanding-dues records are unavailable.",
    nextStep: "Request the latest land revenue and outstanding-dues statement.",
  },
  encumbrances: {
    label: "Recorded encumbrances",
    unavailable: "The existence or absence of recorded encumbrances has not been verified.",
    nextStep: "Request an authorised encumbrance search for the parcel.",
  },
  court: {
    label: "Court-related restrictions",
    unavailable: "Authorised information on court proceedings, orders or court-related flags is unavailable.",
    nextStep: "Ask an authorised source about applicable court proceedings or orders.",
  },
  restrictions: {
    label: "Transfer and other land restrictions",
    unavailable: "Any applicable legal or administrative transfer restrictions remain unverified.",
    nextStep: "Ask the relevant authority which restrictions apply to this parcel.",
  },
  eligibility: {
    label: "Transaction eligibility",
    unavailable: "Eligibility for a transaction has not been determined by an authorised source.",
    nextStep: "Ask the relevant authority what conditions apply to transaction eligibility.",
  },
  registrationMutation: {
    label: "Registration and mutation workflow status",
    unavailable: "Authorised registration and mutation records are unavailable. No workflow status has been confirmed.",
    nextStep: "Confirm the applicable registration and mutation requirements.",
  },
} satisfies Record<string, { label: string; unavailable: string; nextStep: string }>;

export type GovernmentCheckId = keyof typeof governmentCheckDefinitions;
export const governmentCheckIds = Object.keys(governmentCheckDefinitions) as GovernmentCheckId[];

export type GovernmentRecordResult =
  | { source: "authorised-government"; status: "not-connected" }
  | { source: "authorised-government"; status: "government-verified"; value: string; checkedAt: string };

export type ParcelGovernmentRecords = {
  parcelId: string;
  checks: Partial<Record<GovernmentCheckId, GovernmentRecordResult>>;
};

/** Future adapters must obtain authorised records before returning verified values. */
export interface GovernmentRecordProvider {
  getParcelRecords(parcelId: string): Promise<ParcelGovernmentRecords>;
}

export function disconnectedGovernmentRecords(parcelId: string): ParcelGovernmentRecords {
  return { parcelId, checks: {} };
}

export function getGovernmentRecordSections({ checks }: ParcelGovernmentRecords) {
  return governmentCheckIds.map((id) => {
    const result: GovernmentRecordResult = checks[id] ?? { source: "authorised-government", status: "not-connected" };
    return { id, ...governmentCheckDefinitions[id], result };
  });
}
