import Link from "next/link";

export function Brand({ href }: { href: string }) {
  return (
    <Link className="brand" href={href} aria-label="BhuSutra home">
      <span className="brand-symbol" lang="as" aria-hidden="true">ভূ</span>
      <span className="brand-name">
        <strong>BhuSutra</strong>
        <span className="brand-assamese" lang="as">ভূসূত্ৰ</span>
      </span>
    </Link>
  );
}
