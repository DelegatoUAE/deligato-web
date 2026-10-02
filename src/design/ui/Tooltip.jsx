/** Tooltip: CSS-only hint on hover/focus. Keep text short; never hide essential info in it. */
export default function Tooltip({ text, children }) {
  return <span className="ui-tip" data-tip={text}>{children}</span>;
}
