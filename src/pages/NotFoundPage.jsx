import { Link } from 'react-router-dom';
import { Button, EmptyState } from '../design/ui';

export default function NotFoundPage() {
  return (
    <div className="notfound">
      <EmptyState
        icon="compass"
        title="This page doesn't exist."
        body="The link may be old, or the page has moved."
        action={<Button as={Link} to="/" variant="primary">Go to your dashboard</Button>}
      />
    </div>
  );
}
