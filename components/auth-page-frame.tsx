import Link from 'next/link'
import { ArrowUpRight, BrainCircuit, Check } from 'lucide-react'

export function AuthPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <header className="auth-topbar">
        <Link className="auth-brand" href="/sign-in" aria-label="SEA sign in home">
          <span className="auth-brand-mark">S</span>
          <span className="auth-brand-wordmark">SEA<span> / </span>Social Engagement Agent</span>
        </Link>
        <span className="auth-topbar-label"><span /> PRIVATE WORKSPACE</span>
      </header>

      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <span className="auth-intro-kicker"><BrainCircuit aria-hidden="true" /> YOUR AUDIENCE, IN CONTEXT</span>
          <h1 id="auth-intro-title">Make every<br />next post <em>smarter.</em></h1>
          <p className="auth-intro-copy">Bring your social history and audience signals into one workspace built to help you understand what resonates.</p>
          <ul className="auth-capabilities">
            <li><span><Check aria-hidden="true" /></span><div><strong>Know your audience</strong><small>See the patterns behind engagement.</small></div></li>
            <li><span><Check aria-hidden="true" /></span><div><strong>Keep useful context</strong><small>Carry audience learnings into what comes next.</small></div></li>
            <li><span><Check aria-hidden="true" /></span><div><strong>Create with a reason</strong><small>Ground new ideas in your own history.</small></div></li>
          </ul>
          <div className="auth-intro-footer"><span className="auth-live-dot" /> AUDIENCE SIGNALS, MADE USEFUL <ArrowUpRight aria-hidden="true" /></div>
        </section>

        <div className="auth-form-column">{children}</div>
      </div>

      <footer className="auth-footer"><span>SEA · SOCIAL ENGAGEMENT AGENT</span><span>YOUR SIGNAL. YOUR STRATEGY.</span></footer>
    </main>
  )
}
