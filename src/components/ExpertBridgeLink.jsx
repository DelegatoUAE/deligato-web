import { Link } from 'react-router-dom';
import { expertBridge } from '../lib/expertise';

/** The calm expert link (ia.md §7 rule 8): grey text, never a button, never gold. */
export default function ExpertBridgeLink({ kind, gapKey, from }) {
  const b = expertBridge(kind, gapKey, from);
  if (!b) return null;
  return <Link className="xbridge" to={b.href}>{b.text}</Link>;
}
