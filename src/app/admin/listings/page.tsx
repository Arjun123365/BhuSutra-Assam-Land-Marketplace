import Link from "next/link";
import { requireAdmin } from "../../../lib/admin-session";
import { demoDistricts, demoParcels } from "../../../lib/demo-marketplace";
import { fullINR, listingStatuses } from "../../../lib/seller-demo";
import { getReviewQueue } from "../../../lib/seller-store";

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const sorts = { newest: "Newest submission", oldest: "Oldest submission", "price-high": "Highest asking price", "price-low": "Lowest asking price", status: "Status" };
const statuses = listingStatuses.filter(status => status !== "Draft");

export default async function ReviewQueue({ searchParams }: PageProps<"/admin/listings">) {
  await requireAdmin();
  const params = await searchParams;
  function read(key: string) {
    const value = params[key];
    return typeof value === "string" ? value.trim() : "";
  }
  const district = demoDistricts.find(value => value === read("district")) ?? "";
  const circles = [...new Set(demoParcels.filter(parcel => !district || parcel.district === district).map(parcel => parcel.circle))].sort();
  const requestedPage = Number(read("page"));
  const filters = {
    district, circle: circles.find(value => value === read("circle")) ?? "",
    status: statuses.find(value => value === read("status")) ?? "",
    date: /^\d{4}-\d{2}-\d{2}$/.test(read("date")) ? read("date") : "",
    sort: Object.keys(sorts).find(value => value === read("sort")) ?? "newest",
    query: read("query").slice(0, 100),
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
  const { rows, total, pages, page } = getReviewQueue(filters);
  function href(nextPage: number) {
    return "/admin/listings?" + new URLSearchParams({ ...filters, page: String(nextPage) }).toString();
  }

  return (
    <section className="seller-card">
      <h1>Listing review queue</h1>
      <form action="/admin/listings" className="seller-form" aria-label="Filter listing requests">
        <div className="seller-fields admin-filters">
          <label>Search <input name="query" defaultValue={filters.query} maxLength={100} placeholder="Listing, parcel, Dag, Patta or seller" /></label>
          <label>District <select name="district" defaultValue={filters.district}><option value="">All districts</option>{demoDistricts.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Revenue Circle <select name="circle" defaultValue={filters.circle}><option value="">All demo circles</option>{circles.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Status <select name="status" defaultValue={filters.status}><option value="">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Submission date (IST) <input type="date" name="date" defaultValue={filters.date} /></label>
          <label>Sort by <select name="sort" defaultValue={filters.sort}>{Object.entries(sorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="seller-actions"><button className="seller-primary" type="submit">Apply filters</button><Link href="/admin/listings" className="seller-secondary">Clear filters</Link></div>
      </form>
      <p role="status">{total} {total === 1 ? "listing request" : "listing requests"} found</p>
      {rows.length ? (
        <div className="admin-table-scroll" role="region" aria-label="Listing review results" tabIndex={0}>
          <table className="admin-table">
            <thead><tr><th scope="col">Listing ID</th><th scope="col">Parcel ID</th><th scope="col">District</th><th scope="col">Revenue Circle</th><th scope="col">Seller</th><th scope="col">Asking price</th><th scope="col">Submitted (IST)</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
            <tbody>{rows.map(row => (
              <tr key={row.id}>
                <td className="admin-id">{row.id}</td><td>{row.parcelId}</td>
                <td>{row.parcel?.district ?? "Unknown"}</td><td>{row.parcel?.circle ?? "Unknown"}</td>
                <td>{row.sellerName}</td><td>{row.price === null ? "Unavailable" : fullINR.format(row.price)}</td>
                <td>{row.submittedAt ? <time dateTime={row.submittedAt}>{dateFormat.format(new Date(row.submittedAt))}</time> : "Seeded demo"}</td>
                <td><span className="seller-status" data-status={row.status}>{row.status}</span></td>
                <td><Link href={"/admin/listings/" + encodeURIComponent(row.id)} aria-label={"Review listing " + row.id}>Review</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="seller-empty">No listing requests match these filters.</p>}
      {pages > 1 && (
        <nav className="admin-pagination seller-actions" aria-label="Review queue pages">
          {page > 1 && <Link className="seller-secondary" href={href(page - 1)}>Previous</Link>}
          <span>Page {page} of {pages}</span>
          {page < pages && <Link className="seller-secondary" href={href(page + 1)}>Next</Link>}
        </nav>
      )}
    </section>
  );
}
