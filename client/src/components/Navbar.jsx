import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinkClass = ({ isActive }) =>
    `px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
      isActive
        ? "bg-blue-700 text-white shadow-sm"
        : "text-slate-200 hover:bg-slate-800 hover:text-white"
    }`;

  // Role badge color helper
  const roleBadgeColor = {
    CLERK: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    JUDGE: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    LAWYER: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  }[user?.role] || "bg-slate-700 text-slate-300";

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Portal Name */}
        <div className="flex items-center gap-3">
          <Link to={user ? "/dashboard" : "/login"} className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <span className="font-bold text-base sm:text-lg tracking-tight text-white">
              DCFM Portal
            </span>
          </Link>
          <span className="hidden md:inline-block text-xs font-mono text-slate-400 border-l border-slate-700 pl-3">
            Ministry of Law & Justice
          </span>
        </div>

        {/* Dynamic Navigation Links by Role */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 max-w-[calc(100vw-140px)] sm:max-w-none">
          {user ? (
            <>
              {/* CLERK Navigation */}
              {user.role === "CLERK" && (
                <>
                  <NavLink to="/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/cases" end className={navLinkClass}>
                    Cases
                  </NavLink>
                  <NavLink to="/cases/new" className={navLinkClass}>
                    + New Case
                  </NavLink>
                  <NavLink to="/cause-list" className={navLinkClass}>
                    Cause List
                  </NavLink>
                </>
              )}

              {/* JUDGE Navigation */}
              {user.role === "JUDGE" && (
                <>
                  <NavLink to="/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/cases" end className={navLinkClass}>
                    Cases
                  </NavLink>
                  <NavLink to="/hearings" className={navLinkClass}>
                    My Hearings
                  </NavLink>
                  <NavLink to="/audit-log" className={navLinkClass}>
                    Audit Log
                  </NavLink>
                </>
              )}

              {/* LAWYER Navigation */}
              {user.role === "LAWYER" && (
                <>
                  <NavLink to="/lookup" className={navLinkClass}>
                    Case Lookup
                  </NavLink>
                </>
              )}

              {/* User Profile Pill & Logout */}
              <div className="flex items-center gap-2 pl-3 ml-2 border-l border-slate-800">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {user.judge ? user.judge.courtroom : user.email}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${roleBadgeColor}`}
                >
                  {user.role}
                </span>
                <button
                  onClick={handleLogout}
                  title="Sign out of DCFM Portal"
                  className="text-xs px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition font-medium"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink to="/login" className={navLinkClass}>
                Sign In
              </NavLink>
              <NavLink
                to="/register"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition"
              >
                Register as Advocate
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

