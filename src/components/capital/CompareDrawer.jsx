import { Link } from 'react-router-dom';
import { Button, Drawer, FitMark } from '../../design/ui';
import MatchScore from './MatchScore';
import { FIT_DIMENSIONS, fitProvenance, fitReasonText, investorHref, bucketHeadline, ticketRange, timingOf } from '../../lib/capital';
import { fitSummary } from '../../lib/matchview';
import { CompareSummary } from './AiBlocks';
import { wordsForCodes, countryName } from '../../lib/format';

const SPOKEN = { yes: 'Fits', partial: 'Partly fits', no: "Doesn't fit", unknown: 'Not on record' };
const norm = (s) => (['yes', 'partial', 'no', 'unknown'].includes(s) ? s : 'unknown');
const list = (a) => (Array.isArray(a) && a.length ? a.join(', ') : null);
const NOR = <span className="ui-faint">Not on record</span>;

/**
 * Side-by-side comparison of up to three matches from the same run. Shows
 * only fields the run already returned, each fit with its evidence label.
 * Nothing is computed or inferred here.
 */
export default function CompareDrawer({ open, onClose, rows, runId, onRemove, companyId }) {
  const cols = rows || [];
  const rowsSpec = [
    { label: 'Evidence tier', render: (r) => bucketHeadline(r) },
    { label: 'Decisive criteria', render: (r) => { const f = fitSummary(r); return `${f.yes} of ${f.total} fit${f.unknown ? ` · ${f.unknown} not on record` : ''}${f.no ? ` · ${f.no} don't fit` : ''}`; } },
    ...FIT_DIMENSIONS.map((d) => ({
      label: d.label,
      render: (r) => {
        const s = norm(r.fits?.[d.key]);
        const why = fitReasonText(r, d.key);
        return (
          <div className="cmp-fit">
            <span className={`cmp-fit-state cmp-${s}`}><FitMark state={s} />{SPOKEN[s]}</span>
            <span className="cmp-prov">{fitProvenance(r, d.key)}</span>
            {why && <span className="cmp-why">{wordsForCodes(why)}</span>}
          </div>
        );
      },
    })),
    { label: 'Ticket range', render: (r) => ticketRange(r.ticket_min_usd, r.ticket_max_usd) || NOR },
    { label: 'Stages', render: (r) => list(r.stages) || NOR },
    { label: 'Sectors', render: (r) => list(r.sectors) || NOR },
    { label: 'Investor types', render: (r) => list(r.investor_types) || r.type || NOR },
    { label: 'Location', render: (r) => [r.city, countryName(r.country)].filter(Boolean).join(', ') || NOR },
    { label: 'Timing', render: (r) => timingOf(r)?.text || NOR },
    { label: 'Why we matched you', render: (r) => wordsForCodes(r.why_matched) || <span className="ui-faint">No explanation in this run</span> },
  ];

  return (
    <Drawer open={open} onClose={onClose} width="min(1080px, 100vw)" title="Compare capital providers"
      description="Side by side, from this match run. Every fit shows its evidence label. Unknown never counts as a fit.">
      {cols.length < 2 ? (
        <p className="ui-muted">Select two or three providers in the table to compare them.</p>
      ) : (
        <>
        <CompareSummary key={cols.map((r) => r.record_id).join(',')} companyId={companyId} runId={runId} recordIds={cols.map((r) => r.record_id)} />
        <div className="cmp-scroll">
          <table className="cmp" style={{ '--cmp-cols': cols.length }}>
            <thead>
              <tr>
                <th scope="col"><span className="ui-sr">Field</span></th>
                {cols.map((r) => (
                  <th key={r.record_id} scope="col">
                    <div className="cmp-head">
                      <MatchScore score={r.match_score} confidence={r.data_confidence} size="sm" />
                      <div>
                        <Link to={investorHref(r.record_id, runId)} className="cmp-name">{r.name}</Link>
                        <span className="cmp-sub">{r.type || 'Type not on record'}</span>
                      </div>
                    </div>
                    <Button variant="link" size="sm" onClick={() => onRemove?.(r.record_id)}>Remove</Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsSpec.map((spec) => (
                <tr key={spec.label}>
                  <th scope="row">{spec.label}</th>
                  {cols.map((r) => <td key={r.record_id}>{spec.render(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Drawer>
  );
}
