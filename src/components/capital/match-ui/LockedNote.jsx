import { Link } from 'react-router-dom';
import { Icon } from '../../../design/ui';

/**
 * LockedNote: one calm line for a feature the plan doesn't include. Says what it is and
 * which plan has it; shows nothing of the locked content itself (D68/D69/D73).
 */
export default function LockedNote({ title, body, to, cta = 'See plans', className = '' }) {
  return (
    <div className={`mx-locked ${className}`}>
      <span className="mx-locked-ic" aria-hidden="true"><Icon name="lock" size={16} /></span>
      <div className="mx-locked-text">
        {title && <p className="mx-locked-title">{title}</p>}
        {body && <p className="mx-locked-body">{body}</p>}
      </div>
      {to && <Link to={to} className="mx-locked-cta">{cta}</Link>}
    </div>
  );
}
