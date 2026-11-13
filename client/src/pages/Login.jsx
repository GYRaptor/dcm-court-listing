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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-serif text-ink tracking-tight">
          NyayaKram
        </h1>
        <p className="text-xs font-mono uppercase tracking-wider text-muted mt-0.5">
          District Court Registry
        </p>
        <h2 className="mt-2 text-base font-medium text-ink">
          Sign in to Court Registry
        </h2>
        <div className="rule-double max-w-[200px] mx-auto mt-3"></div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 border border-rule rounded-[4px] sm:px-10 space-y-6">
          {error && (
            <div className="p-3 bg-oxblood-light border border-oxblood/30 text-oxblood text-xs rounded-[3px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-caps text-[11px] text-muted mb-1">
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. clerk@court.gov.in"
                className="block w-full px-3 py-2 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block font-caps text-[11px] text-muted mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2 bg-paper border border-rule rounded-[3px] text-xs font-sans text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 rounded-[3px] text-xs font-medium text-surface bg-accent hover:bg-accent-hover transition disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign in"}
            </button>
          </form>

          {/* Quick Fill Panel */}
          <div className="pt-4 border-t border-rule space-y-3">
            <p className="font-caps text-[11px] text-muted">
              Evaluation accounts (quick fill):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("clerk@court.gov.in")}
                className="text-left p-2.5 rounded-[3px] bg-paper border border-rule hover:border-accent text-ink transition"
              >
                <div className="font-medium">Court Clerk</div>
                <div className="text-[10px] text-muted font-mono">clerk@court.gov.in</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("judge.saxena@court.gov.in")}
                className="text-left p-2.5 rounded-[3px] bg-paper border border-rule hover:border-accent text-ink transition"
              >
                <div className="font-medium">Judge Saxena</div>
                <div className="text-[10px] text-muted font-mono">Courtroom 101</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("judge.kumar@court.gov.in")}
                className="text-left p-2.5 rounded-[3px] bg-paper border border-rule hover:border-accent text-ink transition"
              >
                <div className="font-medium">Judge Kumar</div>
                <div className="text-[10px] text-muted font-mono">Courtroom 102</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("rohit.lawyer@court.gov.in")}
                className="text-left p-2.5 rounded-[3px] bg-paper border border-rule hover:border-accent text-ink transition"
              >
                <div className="font-medium">Advocate Rohit</div>
                <div className="text-[10px] text-muted font-mono">rohit.lawyer@court.gov.in</div>
              </button>
            </div>

            <div className="p-2.5 bg-paper border border-rule rounded-[3px] text-[11px] text-muted space-y-1">
              <div className="flex items-center justify-between">
                <span>Shared demo password:</span>
                <span className="font-mono text-ink font-semibold">Demo@1234</span>
              </div>
              <div className="text-[10px] text-muted">
                Role capabilities: Clerk (intake &amp; listing), Judge (bench hearings &amp; review), Lawyer (public docket lookup).
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted pt-2 border-t border-rule">
            Practicing advocate?{" "}
            <Link to="/register" className="font-mono text-accent hover:underline">
              Enroll chamber &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}