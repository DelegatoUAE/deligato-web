import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState } from '../design/ui';
import { HeadingLevel } from '../design/ui/heading-context.js';

export default function NotFoundPage() {
  useEffect(() => { document.title = 'Page not found · Deligato'; }, []);
  return (
    <div className="notfound">
      {/* The page has no PageHeader, so the empty state's title is its h1. */}
      <HeadingLevel.Provider value={1}>
      <EmptyState
        icon="compass"
        title="This page doesn't exist."
        body="The link may be old, or the page has moved."
        action={<Button as={Link} to="/" variant="primary">Go to your dashboard</Button>}
      />
      </HeadingLevel.Provider>
    </div>
  );
}
