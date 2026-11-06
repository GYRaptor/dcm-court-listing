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
      // Redirect based on role (lawyers go to lookup, clerks and judges to dashboard)
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

  // Quick fill helper for evaluation & viva testing
  const quickFill = (demoEmail, demoPassword = "Demo@1234") => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="text-4xl">⚖️</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Sign in to Court Registry
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Differentiated Case Flow Management Portal
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., clerk@court.gov.in"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
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

          {/* Viva & Evaluation Quick Fill Panel */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              ⚡ Demo Accounts (Quick Fill for Viva):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("clerk@court.gov.in")}
                className="text-left p-2 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 transition"
              >
                <div className="font-semibold">Court Clerk</div>
                <div className="text-[10px] text-amber-700">clerk@court.gov.in</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("judge.saxena@court.gov.in")}
                className="text-left p-2 rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 transition"
              >
                <div className="font-semibold">Judge Saxena</div>
                <div className="text-[10px] text-purple-700">Courtroom 101</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("judge.kumar@court.gov.in")}
                className="text-left p-2 rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 transition"
              >
                <div className="font-semibold">Judge Kumar</div>
                <div className="text-[10px] text-purple-700">Courtroom 102</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("rohit.lawyer@court.gov.in")}
                className="text-left p-2 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 transition"
              >
                <div className="font-semibold">Advocate Rohit</div>
                <div className="text-[10px] text-emerald-700">rohit.lawyer@court.gov.in</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Are you a practicing advocate?{" "}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

