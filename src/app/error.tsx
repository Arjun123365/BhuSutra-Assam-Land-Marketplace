"use client";

import Link from "next/link";

export default function ApplicationError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell recovery-page">
      <p className="workspace-eyebrow">BhuSutra · ভূসূত্ৰ</p>
      <h1>The demo workspace is temporarily unavailable</h1>
      <p>The local store or page could not be loaded. Retry the page, or return to the homepage. Existing records are kept in the local database.</p>
      <div className="recovery-actions"><button type="button" onClick={reset}>Try again</button><Link href="/">Return home</Link></div>
      <p>NESFIC demonstration prototype using synthetic data. Government verification is unavailable.</p>
    </main>
  );
}
