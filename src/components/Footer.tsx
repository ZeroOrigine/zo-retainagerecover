import Link from 'next/link';
import { getZoMeta } from '@/lib/zo-meta';

export default function Footer() {
  const projectName = process.env.NEXT_PUBLIC_PROJECT_NAME ?? 'ZeroOrigine';
  const year = new Date().getFullYear();
  // Only show the /about badge when this fork is a product with birth metadata.
  // zeroorigine.com ships the sentinel (no meta) -> no badge -> no 404.
  const born = getZoMeta() !== null;

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">
          &copy; {year} {projectName}. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {born && (
            <Link
              href="/about"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Born autonomously at ZeroOrigine
            </Link>
          )}
          <Link
            href="/pricing"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Pricing
          </Link>
          <Link
            href="mailto:support@zeroorigine.com"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
