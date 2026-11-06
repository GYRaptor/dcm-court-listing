import React from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Route wrapper that enforces authentication and role-based permissions
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  // Show neutral loading state while session is being verified with /auth/me
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Verifying court credentials...</p>
      </div>
    );
  }

  // If user is not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role is not allowed, show informative 'Not Allowed' screen
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white border border-rose-200 rounded-xl shadow-sm text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xl font-bold">
          🛑
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Not Allowed</h2>
        <p className="text-sm text-slate-600 mb-4">
          Your role (<span className="font-semibold text-rose-600">{user.role}</span>) does not have authorization to view this registry section.
        </p>
        <p className="text-xs text-slate-500 mb-6">
          Required Role: {allowedRoles.join(" or ")}
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return children;
}

