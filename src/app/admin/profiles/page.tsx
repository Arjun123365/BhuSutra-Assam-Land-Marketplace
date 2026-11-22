import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-session";
import { getAdministratorProfiles } from "../../../lib/admin-monitoring";

export default async function AdministratorProfilesPage() {
  await requireAdmin();
  const { sellers, buyers } = await getAdministratorProfiles();
  return (
    <>
      <div className="seller-heading"><div><h1>Demo sellers and buyers</h1><p>{sellers.length} sellers · {buyers.length} buyers. Existing synthetic demonstration profiles; contact details are omitted.</p></div><Link className="seller-secondary" href="/admin/dashboard">Back to dashboard</Link></div>
      <div className="admin-review">
        {[{ role: "Seller", profiles: sellers }, { role: "Buyer", profiles: buyers }].map(({ role, profiles }) => (
          <section className="seller-card" key={role} aria-labelledby={role.toLowerCase() + "-profiles"}>
            <h2 id={role.toLowerCase() + "-profiles"}>Demo {role.toLowerCase()}s ({profiles.length})</h2>
            {profiles.length ? <ul className="enquiry-list">{profiles.map(profile => (
              <li className="enquiry-item" key={profile.id}>
                <h3>{profile.displayName}</h3>
                <dl className="seller-facts">
                  <div><dt>Demo {role.toLowerCase()} ID</dt><dd className="admin-id">{profile.id}</dd></div>
                  <div><dt>District</dt><dd>{profile.district}</dd></div>
                  <div><dt>Profile type</dt><dd>{profile.profileType}</dd></div>
                </dl>
                <Link className="seller-secondary" href={role === "Seller" ? "/admin/listings?query=" + encodeURIComponent(profile.displayName) : "/admin/enquiries?buyer=" + encodeURIComponent(profile.id)}>{role === "Seller" ? "View listing requests" : "View buyer enquiries"}</Link>
              </li>
            ))}</ul> : <p className="seller-empty">No stored demonstration {role.toLowerCase()} profiles.</p>}
          </section>
        ))}
      </div>
    </>
  );
}
