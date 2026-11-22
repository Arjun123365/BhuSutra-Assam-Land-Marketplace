import { downloadMonitoringReport } from "../../../../lib/coordination-report";

export async function GET(request: Request) {
  return downloadMonitoringReport(new URL(request.url));
}
