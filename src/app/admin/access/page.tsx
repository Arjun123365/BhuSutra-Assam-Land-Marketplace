import { redirect } from "next/navigation";
import { AdminAccessForm } from "../../../components/admin/review-forms";
import { demoAdminKey } from "../../../lib/admin-policy";
import { currentAdmin } from "../../../lib/admin-session";

export default async function AdminAccessPage() {
  if (await currentAdmin()) redirect("/admin/dashboard");

  return (
    <section className="seller-card admin-access">
      <h1>Administrator access</h1>
      <p>This workspace uses a local demonstration key. It provides no production-grade administrator authentication.</p>
      {demoAdminKey()
        ? <AdminAccessForm />
        : <p className="seller-warning" role="status">Demo administrator access is disabled. The local development server must be explicitly configured before review is available. Production builds disable this workspace.</p>}
    </section>
  );
}
