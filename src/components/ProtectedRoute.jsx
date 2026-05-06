import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getToken, fetchMe, logout } from '../lib/auth';

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState({ status: 'checking', me: null });

  useEffect(() => {
    if (!getToken()) {
      setState({ status: 'no-token', me: null });
      return;
    }
    fetchMe()
      .then((me) => setState({ status: 'authed', me }))
      .catch(() => {
        logout();
        setState({ status: 'invalid', me: null });
      });
  }, []);

  if (state.status === 'checking') {
    return <div className="centered">Checking your session…</div>;
  }
  if (state.status !== 'authed') {
    return <Navigate to="/login" replace />;
  }
  return typeof children === 'function' ? children(state.me) : children;
}
