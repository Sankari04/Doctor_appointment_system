import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-height-screen flex flex-col justify-center items-center bg-slate-50 text-slate-900 py-20">
        <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium animate-pulse">Loading secure session...</p>
      </div>
    );
  }

  // User is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role validation
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized, redirect to user's specific dashboard
    if (user.role === 'patient') return <Navigate to="/patient/dashboard" replace />;
    if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;


