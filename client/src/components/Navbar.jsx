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
    `px-2 sm:px-3 py-4 text-xs sm:text-sm font-medium transition whitespace-nowrap border-b-2 -mb-[1px] ${
      isActive
        ? "border-accent text-accent font-semibold"
        : "border-transparent text-muted hover:text-ink hover:border-rule"
    }`;

  const formatUserDetails = () => {
    if (!user) return "";
    if (user.role === "JUDGE") {
      return `${user.name}, Judge${user.judge?.courtroom ? `, ${user.judge.courtroom}` : ""}`;
    }
    if (user.role === "CLERK") {
      return `${user.name}, Clerk`;
    }
    return `${user.name}, Advocate`;
  };

  return (
    <header className="bg-paper border-b border-rule sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to={user ? "/dashboard" : "/login"} className="flex flex-col">
            <span className="font-serif font-bold text-lg sm:text-xl tracking-tight text-ink leading-tight">
              NyayaKram
            </span>
            <span className="font-mono text-[11px] text-muted tracking-wide">
              District court listing
            </span>
          </Link>
        </div>

        {/* Dynamic Navigation Links by Role */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto h-full max-w-[calc(100vw-130px)] sm:max-w-none">
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
                    New case
                  </NavLink>
                  <NavLink to="/cause-list" className={navLinkClass}>
                    Cause list
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
                    My hearings
                  </NavLink>
                  <NavLink to="/audit-log" className={navLinkClass}>
                    Audit log
                  </NavLink>
                </>
              )}

              {/* LAWYER Navigation */}
              {user.role === "LAWYER" && (
                <>
                  <NavLink to="/lookup" className={navLinkClass}>
                    Case lookup
                  </NavLink>
                </>
              )}

              {/* User Plaintext Info & Sign Out */}
              <div className="flex items-center gap-3 pl-3 ml-2 border-l border-rule shrink-0">
                <span className="hidden sm:inline text-xs text-muted max-w-[240px] truncate" title={formatUserDetails()}>
                  {formatUserDetails()}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink to="/login" className="text-xs sm:text-sm text-ink hover:text-accent font-medium">
                Sign in
              </NavLink>
              <NavLink
                to="/register"
                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-surface text-xs sm:text-sm font-medium rounded-[4px] transition"
              >
                Register chamber
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
