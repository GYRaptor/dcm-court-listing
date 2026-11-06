import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Page Views
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Cases from "./pages/Cases.jsx";
import NewCase from "./pages/NewCase.jsx";
import CauseList from "./pages/CauseList.jsx";
import MyHearings from "./pages/MyHearings.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import Lookup from "./pages/Lookup.jsx";

// Root redirect handler
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "LAWYER") return <Navigate to="/lookup" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Root route redirects appropriately */}
              <Route path="/" element={<HomeRedirect />} />

              {/* Public Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes: Clerk & Judge */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["CLERK", "JUDGE"]}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cause-list"
                element={
                  <ProtectedRoute allowedRoles={["CLERK", "JUDGE"]}>
                    <CauseList />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes: Clerk Only */}
              <Route
                path="/cases"
                element={
                  <ProtectedRoute allowedRoles={["CLERK"]}>
                    <Cases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cases/new"
                element={
                  <ProtectedRoute allowedRoles={["CLERK"]}>
                    <NewCase />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes: Judge Only */}
              <Route
                path="/hearings"
                element={
                  <ProtectedRoute allowedRoles={["JUDGE"]}>
                    <MyHearings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-log"
                element={
                  <ProtectedRoute allowedRoles={["JUDGE"]}>
                    <AuditLog />
                  </ProtectedRoute>
                }
              />

              {/* Protected Route: Lawyer & All Logged-in Roles */}
              <Route
                path="/lookup"
                element={
                  <ProtectedRoute>
                    <Lookup />
                  </ProtectedRoute>
                }
              />

              {/* 404 Fallback */}
              <Route
                path="*"
                element={
                  <div className="max-w-md mx-auto my-16 text-center">
                    <h2 className="text-2xl font-bold text-slate-800">404 - Not Found</h2>
                    <p className="text-sm text-slate-500 mt-2">The requested court page does not exist.</p>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
