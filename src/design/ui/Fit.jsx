import FitRow from './FitRow.jsx';

/** Fit: the inline chip form of a fit result (v0 API: state + label). */
export default function Fit({ state = 'unknown', label, detail }) {
  return <FitRow compact state={state} label={label} detail={detail} />;
}
