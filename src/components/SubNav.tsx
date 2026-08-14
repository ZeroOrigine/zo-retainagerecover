import Link from 'next/link';

export default function SubNav() {
  return (
    <nav className="sub-nav" aria-label="Site navigation">
      <div className="nav-container">
        <Link href="/" className="nav-logo">Zero<span className="accent">Origine</span></Link>
        <div className="sub-nav-links">
          <Link href="/products">Registry</Link>
          <Link href="/logbook">Logbook</Link>
          <Link href="/join" className="nav-cta">Join Us</Link>
        </div>
      </div>
    </nav>
  );
}
