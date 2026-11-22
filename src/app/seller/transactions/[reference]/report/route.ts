import { downloadAssistanceReport } from "../../../../../lib/assistance-report";

export async function GET(_request: Request, { params }: RouteContext<"/seller/transactions/[reference]/report">) {
  return downloadAssistanceReport("Seller", (await params).reference);
}
