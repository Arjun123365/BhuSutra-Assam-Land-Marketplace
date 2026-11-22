"use client";
import Link from "next/link";
export default function PublicError({ reset }: { reset: () => void }) {
  return <section className="shell public-workspace"><h1>The demonstration page could not be loaded</h1><p>Please retry or return to the marketplace. This public demonstration uses no local database or saved accounts.</p><button onClick={reset}>Try again</button><Link href="/">Return home</Link></section>;
}
