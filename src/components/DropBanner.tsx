import Link from 'next/link';

// Server component: shows only when a product launched in the last 48h.
export default function DropBanner({ name, url, at }: { name: string; url: string | null; at: string }) {
  const hours = Math.floor((Date.now() - new Date(at).getTime()) / 3600000);
  return (
    <div className="mc-drop reveal">
      <span className="mc-drop-pulse" aria-hidden="true"></span>
      <span>A product was born {hours < 1 ? 'less than an hour' : `${hours}h`} ago · <strong>{name}</strong></span>
      {url ? <a href={url} target="_blank" rel="noopener noreferrer">see it live &rarr;</a> : <Link href="/products">registry &rarr;</Link>}
    </div>
  );
}
