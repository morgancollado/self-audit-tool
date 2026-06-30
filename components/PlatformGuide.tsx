'use client';

// Per-platform hardening + deadname-removal guide (Phase 2 / M2). Content-driven,
// jurisdiction-agnostic. No-dead-end rule: every platform carries hardening steps,
// and the deadname-removal block always carries steps — even when the platform
// can't change the thing directly (e.g. Reddit usernames), it offers what still
// helps rather than a bare "can't". Acting is tracked locally via the shared
// remediation tracker.

import { useStorage } from '@/lib/storage/StorageProvider';
import { Platform } from '@/lib/content/types';

export function PlatformGuide({ platform }: { platform: Platform }) {
  const { state, addRemediation } = useStorage();
  const dr = platform.deadnameRemoval;

  // Derive "tracked" from the shared tracker (keyed by pillar+refId), not local
  // state — so removing the row in the tracker re-renders the button here.
  const remediations = state?.remediations ?? [];
  const deadnameTracked = remediations.some((r) => r.pillar === 'deadname' && r.refId === platform.slug);
  const hardeningTracked = remediations.some((r) => r.pillar === 'platform' && r.refId === platform.slug);

  const track = async (pillar: 'deadname' | 'platform', action: string) => {
    // Platform actions are self-completed, not mailed to a custodian — record them
    // as 'confirmed' (done), not 'sent', which is the broker-opt-out state.
    await addRemediation({ findingId: undefined, pillar, refId: platform.slug, action, state: 'confirmed' });
  };

  return (
    <section className="platform" aria-labelledby={`platform-${platform.slug}`}>
      <div className="platform-head">
        <h3 id={`platform-${platform.slug}`}>{platform.name}</h3>
        {platform.difficulty && (
          <span className={`badge priority-${platform.difficulty}`}>{platform.difficulty} effort</span>
        )}
      </div>

      {dr && (
        <div className="platform-deadname">
          <div className="platform-subhead">
            <h4>Remove your former name</h4>
            <span className={`badge ${dr.supported ? 'state-sent' : 'priority-low'}`}>
              {dr.supported ? (dr.tool ?? 'supported') : 'no direct change'}
            </span>
          </div>
          {!dr.supported && (
            <p className="platform-note" role="note">
              This platform can’t change that directly — but these steps still reduce what’s exposed.
            </p>
          )}
          <ol className="platform-steps">
            {dr.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {dr.url && (
            <p>
              <a href={dr.url} target="_blank" rel="noopener noreferrer">
                Open {platform.name} settings ↗
              </a>
            </p>
          )}
          {dr.limits && <p className="platform-limits">Limits: {dr.limits}</p>}
          {dr.escalation && <p className="platform-escalation">If it resists: {dr.escalation}</p>}
          {deadnameTracked ? (
            <span className="optout-tracked">Tracked ✓</span>
          ) : (
            <button type="button" onClick={() => track('deadname', `Removed former name on ${platform.name}`)}>
              Mark former-name removal done
            </button>
          )}
        </div>
      )}

      <div className="platform-hardening">
        <h4>Harden the account</h4>
        <ol className="platform-steps">
          {platform.hardening.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {hardeningTracked ? (
          <span className="optout-tracked">Tracked ✓</span>
        ) : (
          <button type="button" onClick={() => track('platform', `Hardened ${platform.name}`)}>
            Mark hardening done
          </button>
        )}
      </div>

      <p className="content-verified">
        Steps last verified {platform.lastVerified}. Platform settings move often — if a step looks
        different, follow the closest equivalent and let us know.
      </p>
    </section>
  );
}
