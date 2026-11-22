import { renderVerificationReport } from "../../../../lib/verification-report";
import { getVerificationRecord } from "../../../../lib/verification-service";
import { currentBuyer } from "../../../../lib/buyer-session";
import { getBuyerCheckHistory } from "../../../../lib/due-diligence-store";

export async function GET(_request: Request, { params }: RouteContext<"/verify-records/report/[parcelId]">) {
  const { parcelId } = await params;
  const verification = await getVerificationRecord(parcelId);
  if (!verification) return new Response("Demonstration parcel unavailable.", { status: 404 });

  const buyer = await currentBuyer();
  const history = buyer ? getBuyerCheckHistory(buyer.id, verification.parcel.id) : undefined;
  return new Response(renderVerificationReport(verification.parcel, verification.records, history), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="bhusutra-${verification.parcel.id}-demo-verification.html"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
