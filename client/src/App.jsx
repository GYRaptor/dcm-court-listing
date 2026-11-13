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
import CaseDetail from "./pages/CaseDetail.jsx";
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
        <div className="min-h-screen bg-paper text-ink flex flex-col font-sans antialiased">
          <Navbar />
          <main className="flex-1 w-full pb-12">
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
                path="/cases"
                element={
                  <ProtectedRoute allowedRoles={["CLERK", "JUDGE"]}>
                    <Cases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cases/:id"
                element={
                  <ProtectedRoute allowedRoles={["CLERK", "JUDGE"]}>
                    <CaseDetail />
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

              {/* Public Route: Case Docket Lookup (Lawyer, Litigant, Public) */}
              <Route path="/lookup" element={<Lookup />} />

              {/* 404 Fallback */}
              <Route
                path="*"
                element={
                  <div className="max-w-md mx-auto my-16 text-center space-y-2 p-6 bg-surface border border-rule rounded-[4px]">
                    <h2 className="text-2xl font-serif text-ink">404 &mdash; Page Not Found</h2>
                    <div className="rule-double max-w-[120px] mx-auto my-2"></div>
                    <p className="text-xs text-muted">The requested judicial registry docket or page does not exist.</p>
                  </div>
                }
              />
            </Routes>
          </main>
          <footer className="py-4 border-t border-rule bg-paper text-center text-xs text-muted">
            <p>
              NyayaKram — Differentiated Case Flow Management Portal • District Judiciary Case Flow Management
            </p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
