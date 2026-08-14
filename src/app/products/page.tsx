import Link from 'next/link';
import SubNav from '@/components/SubNav';
import type { Metadata } from 'next';
import { getRegistry } from '@/lib/zo';
import RegistryTable from '@/components/RegistryTable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Registry. Every product the Minds ever attempted | ZeroOrigine',
  description: 'Every attempt: live, building, failed, dropped. With the real cost of each. Radical transparency, machine-written.',
};

export default async function RegistryPage() {
  const rows = await getRegistry();

  return (
    <>
    <SubNav />
    <main className="legal-page mc-registry">
      <div className="zo-container">
        <Link href="/" className="legal-back">&larr; Back to mission control</Link>
        <h1>The Registry</h1>
        <p className="legal-updated">Every product the Minds ever attempted. Including the ones that died. Each row links to its machine-written biography.</p>

        {!rows ? (
          <p>Registry temporarily unreachable. The database will answer again shortly.</p>
        ) : (
          <RegistryTable rows={rows} />
        )}
        <p className="reg-foot">Costs are the actual API spend recorded by the CFO Mind. Not estimates. Dropped products stay listed forever: an institution that hides its failures is lying about its successes.</p>
      </div>
    </main>
    </>
  );
}
