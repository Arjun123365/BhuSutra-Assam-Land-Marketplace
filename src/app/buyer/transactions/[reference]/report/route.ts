import { downloadAssistanceReport } from "../../../../../lib/assistance-report";

export async function GET(_request: Request, { params }: RouteContext<"/buyer/transactions/[reference]/report">) {
  return downloadAssistanceReport("Buyer", (await params).reference);
}
