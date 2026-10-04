import { Navigate } from 'react-router-dom';
import { getToken, fetchMe, logout } from '../lib/auth';
import useApi from '../lib/useApi';
import { Skeleton, EmptyState, Button } from '../design/ui';

export default function ProtectedRoute({ children }) {
  const token = getToken();
  const meQ = useApi(() => (token ? fetchMe() : null), [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (meQ.error) {
    // Only an invalid session signs the founder out (apiFetch has already
    // tried to renew it). A network blip or server error keeps them signed in.
    if (meQ.error.status === 401) {
      logout();
      return <Navigate to="/login" replace />;
    }
    return (
      <div className="centered">
        <EmptyState
          icon="alert"
          title="We couldn't load your account"
          body={meQ.error.message || 'Please try again in a moment.'}
          action={<Button onClick={meQ.reload}>Try again</Button>}
        />
      </div>
    );
  }
  if (meQ.loading || !meQ.data) {
    return (
      <div className="centered" aria-busy="true">
        <div style={{ width: 240 }}><Skeleton variant="text" lines={3} /></div>
      </div>
    );
  }
  return typeof children === 'function' ? children(meQ.data) : children;
}
