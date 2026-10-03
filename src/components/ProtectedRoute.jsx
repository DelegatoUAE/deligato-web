import { Navigate } from 'react-router-dom';
import { getToken, fetchMe, logout } from '../lib/auth';
import useApi from '../lib/useApi';
import { Skeleton } from '../design/ui';

export default function ProtectedRoute({ children }) {
  const token = getToken();
  const meQ = useApi(() => (token ? fetchMe() : null), [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (meQ.error) {
    logout();
    return <Navigate to="/login" replace />;
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
