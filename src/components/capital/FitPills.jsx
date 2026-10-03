import { useId, useState } from 'react';
import { FitMark } from '../../design/ui';
import { FIT_DIMENSIONS, fitProvenance } from '../../lib/capital';
import { wordsForCodes } from '../../lib/format';

const norm = (s) => (['yes', 'partial', 'no', 'unknown'].includes(s) ? s : 'unknown');
const SPOKEN = { yes: 'fits', partial: 'partial', no: 'does not fit', unknown: 'unknown' };
const TIP = {
  unknown: (dim) => `We don't have this investor's ${dim.toLowerCase()} on record. Unknown never counts as a match.`,
  partial: () => 'Close but not exact, e.g. one stage either side, or a neighbouring sector.',
  yes: (dim) => `${dim} fits.`,
  no: (dim) => `${dim} doesn't fit.`,
};

/**
 * The five fit chips (Stage, Sector, Geography, Ticket, Model). Four states,
 * never colour alone. Hover shows the evidence label; tap (or Enter) opens
 * it below the row, so it works on touch screens too (D24).
 */
export default function FitPills({ fits = {}, result = null, instrumentUnknown = false }) {
  const [open, setOpen] = useState(null);
  const base = useId();
  const r = result || { fits };
  const items = FIT_DIMENSIONS.map((d) => {
    const s = norm((result?.fits || fits)[d.key]);
    const label = d.key === 'business_model' ? 'Model' : d.label;
    const prov = fitProvenance(r, d.key);
    const reason = (result?.likely_outside_reasons || []).find((x) => x.dimension === d.key);
    return { ...d, s, label, prov, reason, tip: `${TIP[s](label)} Evidence: ${prov}.` };
  });
  const openItem = items.find((i) => i.key === open);
  return (
    <div className="fitpills-wrap">
      <ul className="fitpills" aria-label="How this investor fits">
        {items.map((i) => (
          <li key={i.key}>
            <button type="button" className={`ui-fit ui-fit-${i.s} fitpill${open === i.key ? ' is-open' : ''}`}
              aria-label={`${i.label}: ${SPOKEN[i.s]}. Evidence: ${i.prov}`} title={i.tip}
              aria-expanded={open === i.key} aria-controls={`${base}-p`}
              onClick={() => setOpen(open === i.key ? null : i.key)}>
              <FitMark state={i.s} />
              <span>{i.label}</span>
              {i.s === 'partial' && <span className="fitpill-word">partial</span>}
              {i.s === 'unknown' && <span className="fitpill-word">unknown</span>}
            </button>
          </li>
        ))}
        {instrumentUnknown && (
          <li>
            <span className="ui-fit ui-fit-unknown fitpill" aria-label="Instrument: unknown. You haven't set the instrument you're offering." title="You haven't set the instrument you're offering, so we can't check it. Unknown never counts as a match.">
              <FitMark state="unknown" /><span>Instrument</span><span className="fitpill-word">unknown</span>
            </span>
          </li>
        )}
      </ul>
      <p id={`${base}-p`} className="fitpill-pop" role="status" hidden={!openItem}>
        {openItem && (
          <>
            <strong>{openItem.label}</strong> · <span className={`prov-label prov-${openItem.prov.replace(/\s+/g, '-').toLowerCase()}`}>{openItem.prov}</span>
            {' '}{TIP[openItem.s](openItem.label)}
            {openItem.reason && <> {wordsForCodes(openItem.reason.reason)}{openItem.reason.evidence_quote ? ` ("${openItem.reason.evidence_quote}")` : ''}</>}
          </>
        )}
      </p>
    </div>
  );
}
