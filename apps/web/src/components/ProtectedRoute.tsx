import { Navigate, useLocation } from 'react-router-dom';
import { Button, Card, Spinner } from './ui';
import { useAuth } from '../lib/auth';
import type { Role } from '../types/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Account status check
  if (user.status === 'PENDING') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-amber-800">Account Pending Approval</h2>
          <p className="mt-2 text-sm text-stone-600">
            Your registration as <strong>{user.role}</strong> has been submitted and is currently
            under review by an administrator.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (user.status === 'SUSPENDED') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-700">Account Suspended</h2>
          <p className="mt-2 text-sm text-stone-600">
            Your account has been suspended by an administrator. Please reach out to platform
            support for assistance.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Role authorization check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-stone-800">Access Restricted</h2>
          <p className="mt-2 text-sm text-stone-600">
            Your current role (<strong>{user.role}</strong>) does not have permission to access
            this area. Required role(s): {allowedRoles.join(', ')}.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button variant="secondary" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
