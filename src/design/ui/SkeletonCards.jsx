import Skeleton from './Skeleton.jsx';

/** SkeletonCards: a stack of card-shaped placeholders for lists. */
export default function SkeletonCards({ count = 3, height = 104 }) {
  return (
    <div className="ui-skel-cards" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} h={`${height}px`} r="var(--r-lg)" />
      ))}
    </div>
  );
}
