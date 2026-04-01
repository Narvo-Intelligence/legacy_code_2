import React from 'react';
import { Navigate } from 'react-router-dom';
import { readString } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowGuest?: boolean;
}

const ProtectedRoute = ({ children, allowGuest = true }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const isGuest = allowGuest && readString('narvo_guest') === 'true';

  if (loading) return null;
  if (!user && !isGuest) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
