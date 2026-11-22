import Link from "next/link";
import { EnquiryList } from "../../../components/buyer/enquiry-list";
import { requireAdmin } from "../../../lib/admin-session";
import { getAdministratorEnquiries } from "../../../lib/admin-monitoring";

export default async function AdministratorEnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  await requireAdmin();
  const { buyer } = await searchParams;
  const buyerId = typeof buyer === "string" ? buyer.slice(0, 80) : "";
  const enquiries = await getAdministratorEnquiries(buyerId);
  return (
    <>
      <div className="seller-heading"><div><h1>Buyer enquiry monitoring</h1><p>{enquiries.length} saved {enquiries.length === 1 ? "enquiry" : "enquiries"}{buyerId ? " for the selected buyer" : " across all demo buyers"}. Read-only administrator monitoring.</p></div><Link className="seller-secondary" href="/admin/dashboard">Back to dashboard</Link></div>
      <div className="seller-actions"><Link href="/admin/profiles" className="seller-secondary">Demo profiles</Link>{buyerId && <Link href="/admin/enquiries" className="seller-secondary">Show all enquiries</Link>}</div>
      <EnquiryList enquiries={enquiries} readOnly />
    </>
  );
}
