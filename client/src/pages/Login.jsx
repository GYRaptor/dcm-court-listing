import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === "LAWYER") {
        navigate("/lookup");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (demoEmail, demoPassword = "Demo@1234") => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="text-3xl">⚖️</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Sign in to Court Registry
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Differentiated Case Flow Management Portal
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200/80 rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50/70 border border-rose-200/80 text-rose-800 text-xs sm:text-sm rounded-lg flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. clerk@court.gov.in"
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 transition"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Quick Fill Panel for Evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              ⚡ Demo Accounts (Quick Fill for Viva):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("clerk@court.gov.in")}
                className="text-left p-2.5 rounded-lg bg-amber-50/70 hover:bg-amber-100/70 ring-1 ring-inset ring-amber-500/20 text-amber-900 transition active:scale-[0.98]"
              >
                <div className="font-medium">Court Clerk</div>
                <div className="text-[10px] text-amber-700/80 font-mono">clerk@court.gov.in</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("judge.saxena@court.gov.in")}
                className="text-left p-2.5 rounded-lg bg-purple-50/70 hover:bg-purple-100/70 ring-1 ring-inset ring-purple-500/20 text-purple-900 transition active:scale-[0.98]"
              >
                <div className="font-medium">Judge Saxena</div>
                <div className="text-[10px] text-purple-700/80 font-mono">Courtroom 101</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("judge.kumar@court.gov.in")}
                className="text-left p-2.5 rounded-lg bg-purple-50/70 hover:bg-purple-100/70 ring-1 ring-inset ring-purple-500/20 text-purple-900 transition active:scale-[0.98]"
              >
                <div className="font-medium">Judge Kumar</div>
                <div className="text-[10px] text-purple-700/80 font-mono">Courtroom 102</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("rohit.lawyer@court.gov.in")}
                className="text-left p-2.5 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/70 ring-1 ring-inset ring-emerald-500/20 text-emerald-900 transition active:scale-[0.98]"
              >
                <div className="font-medium">Advocate Rohit</div>
                <div className="text-[10px] text-emerald-700/80 font-mono">rohit.lawyer@court...</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Practicing advocate?{" "}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700 transition">
              Enroll your chamber
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
