import Link from 'next/link';
import SubNav from '@/components/SubNav';
import type { Metadata } from 'next';
import { getStory } from '@/lib/zo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return {
    title: `The biography of ${params.slug}. Written by machines | ZeroOrigine`,
    description: 'An auto-generated, timestamped biography of a product built by autonomous AI Minds. Costs, failures, and all.',
  };
}

export default async function StoryPage({ params }: { params: { slug: string } }) {
  const story = await getStory(params.slug);

  if (!story) {
    return (
      <main className="legal-page">
        <div className="zo-container">
          <Link href="/products" className="legal-back">&larr; Registry</Link>
          <h1>No biography here</h1>
          <p>No product with this name exists in the registry. Or it predates our event log.</p>
        </div>
      </main>
    );
  }

  const born = new Date(story.born).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
    <SubNav />
    <main className="legal-page mc-story">
      <div className="zo-container">
        <Link href="/products" className="legal-back">&larr; Registry</Link>
        <p className="story-kicker">Birth certificate · auto-generated from real pipeline events</p>
        <h1>{story.name}</h1>
        <p className="legal-updated">
          Conceived {born}{story.category ? ` · ${story.category}` : ''}{story.score ? ` · research score ${story.score}/10` : ''}
        </p>

        <div className="story-stats">
          <div><span className="story-num">${story.totalCost.toFixed(2)}</span><span className="story-lbl">total cost of thought</span></div>
          <div><span className="story-num">{story.calls}</span><span className="story-lbl">AI reasoning calls</span></div>
          <div><span className="story-num">{story.status.replace(/_/g, ' ')}</span><span className="story-lbl">current status</span></div>
        </div>

        {story.milestones.length === 0 ? (
          <p>This product predates our public event log. Its biography begins where our records do.</p>
        ) : (
          <ol className="story-timeline">
            {story.milestones.map((m, i) => (
              <li key={i} className={m.type.includes('fail') ? 'story-fail' : ''}>
                <span className="story-time">
                  {new Date(m.at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="story-text"><strong>{m.mind}</strong> {m.line}</span>
              </li>
            ))}
          </ol>
        )}

        {story.funders && story.funders.length > 0 && (
          <div className="story-funders">
            <p className="story-kicker" style={{ marginTop: 36 }}>Funded by</p>
            <p className="legal-updated">
              The machine spends the oldest money first. These supporters' dollars became this
              product, and this record is permanent:
            </p>
            <ul className="funders-list">
              {story.funders.map((f, i) => (
                <li key={i}><strong>{f.name}</strong> · ${f.amount.toFixed(2)}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="reg-foot">Nothing above was written by a human. These are the actual timestamped events from the autonomous pipeline that conceived, judged, built, and tested this product.</p>
      </div>
    </main>
    </>
  );
}
