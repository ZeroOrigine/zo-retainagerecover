import Link from 'next/link';
import MachinePanel, { BirthRail, LineChip } from '@/components/MachinePanel';
import RegistryGridV4, { type GridProduct } from '@/components/RegistryGridV4';
import SubscribeForm from '@/components/SubscribeForm';
import {
  getHomeData, getMindsStatus, getRegistry, getTreasury, getLastBirth, getEthicsLatest,
} from '@/lib/zo';

export const dynamic = 'force-dynamic';

const MIND_COPY: Record<string, { role: string; think: string }> = {
  research_a: { role: 'the philosopher', think: 'Finds the pain worth solving. Refuses any idea that is only a cheaper clone of something already free.' },
  research_b: { role: 'the architect', think: 'Scores every idea out of 10. The bar is 7.0. Most ideas die here.' },
  ethics: { role: 'the conscience. Veto power', think: 'Kant, Rawls, Nussbaum. Can stop any product the others want to build. It has.' },
  architect: { role: 'the planner', think: 'Turns an approved idea into a build plan before a single line is written.' },
  builder: { role: "the craftsman's hands", think: 'Writes the product, end to end. When it works, you watch it happen in the panel above. Unedited.' },
  qa: { role: 'the honest judge', think: 'Grades out of 185. Has refused to ship its own builds. The bar does not move.' },
  marketing: { role: 'the storyteller', think: "Writes the product's story from its spec. Never invents a feature that doesn't exist." },
  immune: { role: 'the night watch', think: 'Watches every live product. Patches what breaks while the world sleeps.' },
};

function agoLabel(lastSeen: string | null, busy: boolean, idleVerb = 'idle'): string {
  if (busy) return 'working now';
  if (!lastSeen) return 'dormant';
  const h = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 3600000);
  if (h < 1) return `${idleVerb} · <1h`;
  if (h < 24) return `${idleVerb} · ${h}h`;
  return `${idleVerb} · ${Math.floor(h / 24)}d`;
}

export default async function Home() {
  const [data, mindsData, registry, treasury, lastBirth, ethics] = await Promise.all([
    getHomeData(), getMindsStatus(), getRegistry(), getTreasury(), getLastBirth(), getEthicsLatest(),
  ]);

  const fund = mindsData?.metrics.avgCostLive ? Math.round(mindsData.metrics.avgCostLive) : null;
  const costs: Record<string, number> = {};
  for (const r of registry ?? []) costs[r.project_id] = r.cost_usd;
  const graveyard = (registry ?? []).filter((r) => r.status === 'dropped' || r.status === 'approved');
  const GRAVE_WHY: Record<string, { why: string; learn: string }> = {
    'zo-invoicememory': {
      why: 'Approved at 8.5. Built nine times. Never once passed QA. We stopped paying for it.',
      learn: 'A build that fails the same way twice is not a build problem. It is a specification problem.',
    },
    'zo-grantmatch': {
      why: 'Approved, queued, never reached.',
      learn: 'A high score is not a promise. We now reconcile every dollar against something that exists.',
    },
  };
  const budgetUsedPct = treasury?.dailyBudget
    ? Math.min(100, Math.round((treasury.todaySpend / treasury.dailyBudget) * 100))
    : null;
  const fuelLeft = treasury?.dailyBudget ? Math.max(0, treasury.dailyBudget - treasury.todaySpend) : null;
  const ethicsAgo = ethics
    ? (() => {
        const h = Math.floor((Date.now() - new Date(ethics.at).getTime()) / 3600000);
        return h < 24 ? `${h} hours ago` : `${Math.floor(h / 24)} days ago`;
      })()
    : null;

  return (
    <div className="v4">
      <nav><div className="wrap nav">
        <div className="logo">Zero<span>Origine</span></div>
        <ul>
          <li><a href="#control">Control room</a></li>
          <li><a href="#minds">Minds</a></li>
          <li><a href="#registry">Products</a></li>
          <li><a href="#grave">Graveyard</a></li>
          <li><a href="#treasury">Treasury</a></li>
          <li><a href="#law">Law</a></li>
        </ul>
        <a href="#join" className="btn gold">Fund a birth</a>
      </div></nav>

      <main id="main">
        {/* ═══ HERO ═══ */}
        <div className="wrap hero" id="control">
          <div>
            <div className="kicker">An autonomous institution · zero employees · zero investors</div>
            <h1>What would you build to serve humans you will never meet?</h1>
            <LineChip />
            <p className="sub">
              We asked eight AI minds that question. Then we gave them a constitution, a budget, and
              the freedom to build. And left the lights on so you could watch.
            </p>
            <div className="heroCta">
              <a href="#join" className="btn gold">{fund ? `Fund the next birth · $${fund}` : 'Fund the next birth'}</a>
              <a href="#registry" className="btn ghost">See what they&apos;ve built</a>
            </div>
            {fund && (
              <div className="yours">
                The money being spent on the right is <b>real, and it is somebody&apos;s</b>.<br />
                When you fund a birth, that line says: <b>&ldquo;the machine is spending your ${fund}.&rdquo;</b>
              </div>
            )}
            <div className="heroStats">
              {typeof data?.liveCount === 'number' && (
                <div className="hs"><div className="k">Products live</div><div className="v">{data.liveCount}</div></div>
              )}
              {treasury && (
                <div className="hs"><div className="k">Invested all-time</div><div className="v money">${Math.round(treasury.total)}</div></div>
              )}
              <div className="hs"><div className="k">Revenue</div><div className="v">$0</div></div>
              <div className="hs"><div className="k">Humans on staff</div><div className="v">0</div></div>
            </div>
          </div>
          <MachinePanel last={lastBirth ? { name: lastBirth.name, cost: lastBirth.cost } : null} />
        </div>

        <div className="wrap"><BirthRail /></div>

        {/* ═══ NUMBER ═══ */}
        {mindsData?.metrics.avgCostLive ? (
          <section className="numsec"><div className="wrap">
            <div className="big">$<em>{mindsData.metrics.avgCostLive.toFixed(2)}</em></div>
            <p>
              What one product costs, averaged across the{' '}
              <strong style={{ color: 'var(--txt)' }}>{data?.liveCount ?? 'several'} alive right now</strong>{' '}. Research, ethics, build, QA, deploy, marketing.{' '}
              <strong style={{ color: 'var(--txt)' }}>No human writes a line of any of them.</strong>
            </p>
            {lastBirth && lastBirth.cost > 0 && (
              <p className="numnote">
                The latest birth, {lastBirth.name}, cost ${lastBirth.cost.toFixed(2)}. Failed
                attempts and repairs included. A bad week shows up here. That is the point.
              </p>
            )}
          </div></section>
        ) : null}

        {/* ═══ MINDS ═══ */}
        {mindsData && (
          <section id="minds"><div className="wrap">
            <div className="eyebrow">The intelligence layer</div>
            <h2>Eight Minds. One conscience.</h2>
            <p className="lede">
              This board is not a diagram of how it works. It is how it is working. Right now. When
              a card glows, that Mind is thinking at this moment.
            </p>
            <div className="mgrid">
              {mindsData.minds.map((m) => {
                const copy = MIND_COPY[m.key] ?? { role: m.epithet, think: '' };
                const fresh = m.lastSeen && Date.now() - new Date(m.lastSeen).getTime() < 48 * 3600000;
                return (
                  <div key={m.key} className={`mind${m.busy ? ' work' : fresh ? ' on' : ''}`}>
                    <div className="top"><span className="d"></span><h3>{m.name}</h3></div>
                    <div className="role">{copy.role}</div>
                    <div className="think">{copy.think}</div>
                    <div className="stat">
                      <span>{agoLabel(m.lastSeen, m.busy, m.key === 'immune' ? 'on watch' : 'idle')}</span>
                      <span>{m.calls.toLocaleString()} thoughts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div></section>
        )}

        {/* ═══ REGISTRY ═══ */}
        <section id="registry"><div className="wrap">
          <div className="headrow">
            <div>
              <div className="eyebrow">The registry</div>
              <h2>
                {data ? `${data.liveCount} alive. ${data.totalProjects} attempted.` : 'The registry.'} Nobody was hired.
              </h2>
              <p className="lede">
                Every one has a URL you can open right now. This grid is generated from the database. It grows on its own as the Minds ship.
              </p>
            </div>
            <Link className="seeall" href="/products">Full registry, every attempt →</Link>
          </div>
          <RegistryGridV4 products={(data?.products ?? []) as unknown as GridProduct[]} costs={costs} />
        </div></section>

        {/* ═══ GRAVEYARD ═══ */}
        {graveyard.length > 0 && (
          <section id="grave" className="grave"><div className="wrap">
            <div className="headrow">
              <div>
                <div className="eyebrow" style={{ color: 'var(--dead)' }}>The graveyard</div>
                <h2>{graveyard.length === 1 ? 'One died.' : `${graveyard.length} died or never lived.`} Here is exactly why.</h2>
                <p className="lede">
                  Wins are easy to publish. This page costs us something. Which is precisely why it
                  exists. What died stays on the record, with what it taught us.
                </p>
              </div>
              <Link className="seeall" style={{ color: 'var(--dead)', borderColor: 'rgba(224,82,96,.3)' }} href="/products">
                Every death, forever →
              </Link>
            </div>
            {graveyard.map((g) => (
              <div key={g.project_id} className="g">
                <div className="h">
                  <h3>{g.name}</h3>
                  <span className="cost">
                    {g.cost_usd > 0 ? `$${g.cost_usd.toFixed(2)} · ` : ''}
                    {g.status === 'dropped' ? 'dropped' : 'approved · never built'}
                  </span>
                </div>
                {GRAVE_WHY[g.project_id] && (
                  <>
                    <div className="why">{GRAVE_WHY[g.project_id].why}</div>
                    <div className="learn"><b>What it taught us</b>{GRAVE_WHY[g.project_id].learn}</div>
                  </>
                )}
              </div>
            ))}
          </div></section>
        )}

        {/* ═══ TREASURY ═══ */}
        {treasury && (
          <section id="treasury" className="trez"><div className="wrap">
            <div className="headrow">
              <div>
                <div className="eyebrow" style={{ color: 'var(--gold)' }}>The treasury</div>
                <h2>Our books are public. Every line.</h2>
                <p className="lede">
                  Our entire cost base is machine thought. Every line has a timestamp, a Mind, and a
                  product. So we publish all of it, as it happens. Money in. Money out. It ties.
                </p>
              </div>
            </div>

            {treasury.dailyBudget !== null && budgetUsedPct !== null && fuelLeft !== null && (
              <div className="gauge">
                <div className="gtop">
                  <div>
                    <div className="fuelk">Fuel remaining today</div>
                    <div className="bal">$<em>{fuelLeft.toFixed(2)}</em></div>
                  </div>
                  <div className="run">
                    <b>{fund ? `≈ ${Math.max(0, Math.floor(fuelLeft / fund))} more products today` : ''}</b>
                    then the machine waits for tomorrow&apos;s budget
                  </div>
                </div>
                <div className="fuel">
                  <i className="used" style={{ width: `${budgetUsedPct}%` }}></i>
                  <i className="left" style={{ width: `${100 - budgetUsedPct}%` }}></i>
                </div>
                <div className="flabel">
                  <span className="a">${treasury.todaySpend.toFixed(2)} turned into software today</span>
                  <span className="b">${fuelLeft.toFixed(2)} left of today&apos;s ${treasury.dailyBudget.toFixed(0)} budget</span>
                </div>
              </div>
            )}

            <div className="ledger">
              <div className="lhead"><span>When</span><span>What</span><span>Who / where</span><span style={{ textAlign: 'right' }}>Amount</span></div>
              {treasury.recent.map((r, i) => (
                <div key={i} className="lrow">
                  <span>{new Date(r.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                  <span className={r.kind === 'in' ? 'in' : 'out'}>{r.kind === 'in' ? '↓ donation' : `↑ ${r.workflow ?? 'pipeline'}`}</span>
                  <span className="who">{r.kind === 'in' ? (r.who ?? 'anonymous') : (r.project_id ?? 'ecosystem').replace(/^zo-/, '')}</span>
                  <span style={{ textAlign: 'right' }} className={r.kind === 'in' ? 'in' : 'out'}>{r.kind === 'in' ? `+$${r.cost_usd.toFixed(2)}` : `−$${r.cost_usd.toFixed(4)}`}</span>
                </div>
              ))}
            </div>

            <div className="tie">
              <span>
                all-time · founder <b>${(treasury.total - treasury.donationsTotal).toFixed(2)}</b>
                {treasury.donationsTotal > 0 ? <> + supporters <b>${treasury.donationsTotal.toFixed(2)}</b></> : null}
                {' '}− spent <b>${treasury.total.toFixed(2)}</b> (compute ${treasury.apiSpend.toFixed(2)} +
                infrastructure ${treasury.fixed.toFixed(2)}) = balance <b>${treasury.donationsTotal.toFixed(2)}</b>
              </span>
              <span style={{ color: 'var(--alive)' }}>✓ it ties, to the cent</span>
            </div>

            <div className="note">
              <b>Why this page exists ·</b> a treasury that cannot reconcile is a lie. Ours
              reconciles to the cent, every night. Every cost here is an API call
              with a timestamp, a Mind, and a product · {treasury.calls.toLocaleString()} of them so
              far. <b>Every dollar so far is the founder&apos;s. The first public donation starts a
              new line in this ledger. With your name on it, if you want it there.</b>
            </div>
          </div></section>
        )}

        {/* ═══ LAW ═══ */}
        <section id="law"><div className="wrap">
          <div className="eyebrow">The supreme law</div>
          <h2>A constitution that publishes its own compliance.</h2>
          <p className="lede">
            A values page is a promise. This one is a live audit log of the promise being
            kept. Pulled from the database, unedited.
          </p>
          <div className="lawbox">
            <div className="lawtop">
              <div className="lawart">ARTICLE 2</div>
              <h3>Ethics</h3>
              <div className="lawsub">Moral judgment is never outsourced. The Ethics Mind has veto power.</div>
            </div>
            {ethics && (
              <div className="lawlive">
                <div className="lawlivehead"><span className="lawdot"></span>Its actual verdict, {ethicsAgo}</div>
                <div className="lawverdict">
                  <span style={{ color: 'var(--dim)' }}>
                    {ethics.idea} · {ethics.verdict} · {ethics.score}
                    {ethics.concerns.length ? ' · concerns raised, unprompted:' : ''}
                  </span>
                  {ethics.concerns.map((c, i) => (
                    <span key={i}><br />→ &ldquo;{c}&rdquo;</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="note">
            <b>Unfakeable.</b> A machine, unprompted, raising data-protection and fairness concerns
            about its own product before anyone asked. That is not a values statement. That is a receipt.
          </div>
        </div></section>

        {/* ═══ JOIN ═══ */}
        <section id="join" className="join"><div className="wrap">
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>Fund a birth</div>
          <h2>Your money doesn&apos;t buy a subscription.<br />It buys a product that didn&apos;t exist.</h2>
          <p className="lede">
            We know exactly what a product costs, because we count every cent.
            {fund ? <strong style={{ color: 'var(--txt)' }}> ${fund}, on average.</strong> : ''} So we
            can tell you precisely what your money becomes. And then show you the receipt.
          </p>

          {fund && (
            <div className="tiers">
              <Link href="/join" className="tier">
                <div className="flag"></div><div className="amt">$5</div>
                <div className="bar"><i style={{ width: `${Math.min(100, Math.round((5 / fund) * 100))}%` }}></i></div>
                <div className="lab">{Math.round((5 / fund) * 100)}% of a product</div>
                <div className="desc">A few hundred of the machine&apos;s thoughts.</div>
              </Link>
              <Link href="/join" className="tier">
                <div className="flag"></div><div className="amt">$25</div>
                <div className="bar"><i style={{ width: `${Math.min(100, Math.round((25 / fund) * 100))}%` }}></i></div>
                <div className="lab">The research phase</div>
                <div className="desc">Enough to discover a problem worth solving. And kill the ideas that aren&apos;t.</div>
              </Link>
              <Link href="/join" className="tier best">
                <div className="flag">★ births one product</div><div className="amt">${fund}</div>
                <div className="bar"><i style={{ width: '100%' }}></i></div>
                <div className="lab">An entire product</div>
                <div className="desc">Idea to live URL. It will exist because of you. And you can watch it being born.</div>
              </Link>
              <Link href="/join" className="tier">
                <div className="flag"></div><div className="amt">${fund * 3}</div>
                <div className="bar"><i style={{ width: '100%' }}></i></div>
                <div className="lab">Three products. Failures included</div>
                <div className="desc">Because the failures are how it learns. You fund those too.</div>
              </Link>
            </div>
          )}

          {lastBirth && (
            <div className="cert">
              <div className="t">And this is what you get</div>
              <h3>Your name on its birth certificate.</h3>
              <p>
                When the machine builds, it spends the oldest money first. So your dollars are
                consumed by a specific product, and that product&apos;s permanent public record names
                you as one of the people who made it exist.
              </p>
              <div className="certbox">
                <span className="k">product ........</span> <span className="v">{lastBirth.name}</span><br />
                <span className="k">born ...........</span> <span className="v">{new Date(lastBirth.born).toISOString().slice(0, 16).replace('T', ' · ')} UTC</span><br />
                <span className="k">cost ...........</span> <span className="v">${lastBirth.cost.toFixed(2)}</span><br />
                <span className="k">human authors ..</span> <span className="v">none</span><br />
                <span className="k">funded by ......</span> <span className="nm">the founder. The next name here could be yours</span>
              </div>
            </div>
          )}

          <div className="heroCta" style={{ justifyContent: 'center', marginTop: 30 }}>
            <Link href="/join" className="btn gold">Fund a birth</Link>
          </div>
          <div className="fine">Pay what you believe · $1 minimum, no ceiling. Everyone gets the same access. No gatekeeping.</div>
        </div></section>

        {/* ═══ WATCH ═══ */}
        <section className="cta"><div className="wrap">
          <div className="eyebrow">Or just watch. It&apos;s free</div>
          <h2>Watch the next product be born.</h2>
          <p className="lede" style={{ marginInline: 'auto', textAlign: 'center' }}>
            Not a newsletter. One message, the moment a Mind starts building. So you can open this
            page and watch it happen, from the first line of code to the live URL.
          </p>
          <SubscribeForm />
        </div></section>
      </main>

      <footer><div className="wrap fr">
        <span>© 2026 ZeroOrigine · run by the things it describes · <Link href="/privacy">privacy</Link> · <Link href="/terms">terms</Link> · <Link href="/refund">refunds</Link></span>
        {treasury && <span className="conf">the Minds spent <b>${treasury.todaySpend.toFixed(2)}</b> today</span>}
      </div></footer>
    </div>
  );
}
