import { FitMark } from '../design/ui';
import { EXPERT_CHIP_LABEL } from '../lib/experts';

const ORDER = ['expertise', 'sector', 'stage', 'region', 'availability'];
const PROV = { stated: 'Expert stated', profile_text: 'Inferred from their bio' };

/** The five expert chips in engine order; tooltip = the chip's detail; bio-derived chips are labelled. */
export default function ExpertFitRow({ fits = {}, expanded = false }) {
  const items = ORDER.filter((k) => fits[k]).map((k) => ({ k, ...fits[k] }));
  if (expanded) {
    return (
      <ul className="xfitrows">
        {items.map((c) => (
          <li key={c.k} className={`xfitrow xfitrow-${c.state || 'unknown'}`}>
            <span className={`ui-fit ui-fit-${c.state || 'unknown'}`}><FitMark state={c.state} /> {EXPERT_CHIP_LABEL[c.k] === 'Sector' ? 'Sector experience' : EXPERT_CHIP_LABEL[c.k] === 'Stage' ? 'Stage experience' : EXPERT_CHIP_LABEL[c.k]}</span>
            <span className="xfitrow-detail">{c.detail || 'Not on record'}</span>
            <span className={`xprov${c.basis === 'profile_text' ? ' is-inferred' : ''}`}>{c.state === 'unknown' ? 'Not on record' : PROV[c.basis] || 'Expert stated'}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="xchips" aria-label="How this expert fits">
      {items.map((c) => (
        <li key={c.k} className={`ui-fit ui-fit-${c.state || 'unknown'}`} title={`${c.detail || ''}${c.basis === 'profile_text' ? ' (from their bio)' : ''}`}>
          <FitMark state={c.state} /> {c.k === 'sector' ? 'Sector' : c.k === 'stage' ? 'Stage' : EXPERT_CHIP_LABEL[c.k]}
        </li>
      ))}
    </ul>
  );
}
